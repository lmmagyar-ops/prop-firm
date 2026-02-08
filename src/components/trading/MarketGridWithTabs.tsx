"use client";

import { useState, useMemo, useTransition } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import type { EventMetadata } from "@/app/actions/market";
import { SmartEventCard } from "./SmartEventCard";
import { EventDetailModal } from "./EventDetailModal";
import { SearchModal } from "./SearchModal";
import { KalshiMatchupCard } from "./KalshiMatchupCard";
import { KalshiMultiOutcomeCard } from "./KalshiMultiOutcomeCard";
import { MobileTradeSheet } from "./MobileTradeSheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTradeExecution } from "@/hooks/useTradeExecution";

interface CategoryTabsProps {
    events?: EventMetadata[];
    balance: number;
    userId: string;
    platform?: "polymarket" | "kalshi";
    challengeId?: string;
}


// All available categories matching Polymarket
const CATEGORIES = [
    { id: 'trending', label: 'Trending', icon: TrendingUp, special: true },
    { id: 'Breaking', label: 'Breaking', special: true },
    { id: 'New', label: 'New', special: false },
    { id: 'all', label: 'All', special: false },
    { id: 'Politics', label: 'Politics' },
    { id: 'Geopolitics', label: 'Geopolitics' },
    { id: 'Sports', label: 'Sports' },
    { id: 'Crypto', label: 'Crypto' },
    { id: 'Business', label: 'Finance' },
    { id: 'Tech', label: 'Tech' },
    { id: 'Culture', label: 'Culture' },
    { id: 'Other', label: 'World' },
];

export function MarketGridWithTabs({ events = [], balance, platform = "polymarket" }: CategoryTabsProps) {
    const [activeTab, setActiveTab] = useState('trending');
    const [selectedEvent, setSelectedEvent] = useState<EventMetadata | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [, startTransition] = useTransition();

    // Mobile detection for MobileTradeSheet
    const isMobile = useMediaQuery("(max-width: 768px)");

    // Quick trade state for MobileTradeSheet
    const [quickTradeOpen, setQuickTradeOpen] = useState(false);
    const [quickTradeMarket, setQuickTradeMarket] = useState<{
        id: string;
        title: string;
        yesPrice: number;
        noPrice: number;
        initialSide: 'yes' | 'no';
    } | null>(null);

    // Trade execution hook
    const { executeTrade } = useTradeExecution({
        onSuccess: () => {
            setQuickTradeOpen(false);
        }
    });

    // Platform display config
    const platformConfig = {
        polymarket: { label: "Polymarket", icon: "🌐", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
        kalshi: { label: "Kalshi", icon: "🇺🇸", color: "text-green-600 bg-green-500/10 border-green-500/30" }
    };

    // Platform-aware text colors
    const isLightTheme = platform === "kalshi";

    // Compute per-category event counts for tab badges
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const e of events) {
            const cats = e.categories || [];
            for (const cat of cats) {
                counts[cat] = (counts[cat] || 0) + 1;
            }
        }
        counts['trending'] = events.length;
        counts['all'] = events.length;
        return counts;
    }, [events]);

    // Sort helper: volume descending, but $0 vol markets always sink to bottom
    const sortByVolume = (a: EventMetadata, b: EventMetadata) => {
        const aVol = a.volume || 0;
        const bVol = b.volume || 0;
        // Push $0 vol to the bottom
        if (aVol > 0 && bVol === 0) return -1;
        if (aVol === 0 && bVol > 0) return 1;
        return bVol - aVol;
    };

    // Filter events based on active tab
    const filteredEvents = useMemo(() => {
        if (activeTab === 'trending') {
            return [...events].sort(sortByVolume);
        } else if (activeTab === 'all') {
            return [...events].sort(sortByVolume);
        } else {
            return events.filter(e => {
                const cats = e.categories || [];
                return cats.includes(activeTab);
            }).sort(sortByVolume);
        }
    }, [events, activeTab]);

    // Handler for when user clicks on an event card
    // Uses Total Transition Hoisting - ALL expensive work inside startTransition
    const handleEventClick = (eventId: string) => {
        // Defer ALL expensive operations (lookup + modal rendering)
        // This frees the main thread in <16ms for immediate visual feedback
        startTransition(() => {
            const event = events.find(e => e.id === eventId);
            if (event) {
                setSelectedEvent(event);
                setDetailModalOpen(true);
            }
        });
    };

    // Handler for quick trade button press on card
    const handleQuickTrade = (marketId: string, side: 'yes' | 'no') => {
        // Find the event containing this market
        const event = events.find(e => e.markets.some(m => m.id === marketId));
        const market = event?.markets.find(m => m.id === marketId);

        if (!event || !market) return;

        if (isMobile) {
            // Mobile: Open MobileTradeSheet
            const yesPrice = market.price;
            const noPrice = 1 - market.price;
            setQuickTradeMarket({
                id: marketId,
                title: event.title,
                yesPrice,
                noPrice,
                initialSide: side
            });
            setQuickTradeOpen(true);
        } else {
            // Desktop: Open detail modal (existing behavior)
            setSelectedEvent(event);
            setDetailModalOpen(true);
        }
    };

    // Handler for executing trade from MobileTradeSheet
    const handleMobileTradeExecute = async (outcome: "YES" | "NO", amount: number) => {
        if (!quickTradeMarket) return;
        await executeTrade(quickTradeMarket.id, outcome, amount);
    };

    // Handler for trading from within the detail modal
    const handleTrade = (marketId: string, side: 'yes' | 'no', question: string) => {
        console.log(`[Trade] ${side.toUpperCase()} on ${marketId}: ${question}`);
        // Detail modal has its own TradingSidebar that handles execution
    };

    const totalItems = filteredEvents.length;

    return (
        <div className="space-y-6">
            {/* Category Tabs - Platform-aware styling */}
            <div className={cn(
                "flex items-center gap-1 overflow-x-auto scrollbar-hide pb-3 border-b",
                isLightTheme ? "border-slate-200" : "border-white/5"
            )}>
                {CATEGORIES.map((cat) => {
                    const count = categoryCounts[cat.id] || 0;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            className={cn(
                                "relative flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap",
                                activeTab === cat.id
                                    ? isLightTheme ? "text-slate-900" : "text-white"
                                    : isLightTheme ? "text-slate-500 hover:text-slate-700" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            {cat.icon && (
                                <cat.icon className={cn(
                                    "w-4 h-4",
                                    activeTab === cat.id
                                        ? isLightTheme ? "text-green-600" : "text-emerald-400"
                                        : isLightTheme ? "text-slate-500" : "text-zinc-500"
                                )} />
                            )}
                            {cat.label}
                            {/* Per-tab count badge */}
                            {count > 0 && (
                                <span className={cn(
                                    "text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
                                    activeTab === cat.id
                                        ? isLightTheme ? "bg-green-100 text-green-700" : "bg-white/10 text-white"
                                        : isLightTheme ? "bg-slate-100 text-slate-500" : "bg-white/5 text-zinc-500"
                                )}
                                >
                                    {count}
                                </span>
                            )}
                            {/* Active underline indicator */}
                            {activeTab === cat.id && (
                                <span className={cn(
                                    "absolute bottom-0 left-0 right-0 h-0.5 rounded-full",
                                    isLightTheme ? "bg-green-500" : "bg-white"
                                )} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Header with Search */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className={cn(
                        "text-lg font-semibold",
                        isLightTheme ? "text-slate-900" : "text-white"
                    )}>
                        {activeTab === 'trending' ? 'Trending Markets' :
                            activeTab === 'all' ? 'All Markets' :
                                `${activeTab} Markets`}
                    </h2>
                    {/* Platform Badge */}
                    <span className={cn(
                        "px-2.5 py-1 text-xs font-semibold rounded-full border flex items-center gap-1.5",
                        platformConfig[platform].color
                    )}>
                        <span>{platformConfig[platform].icon}</span>
                        {platformConfig[platform].label}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <SearchModal
                        events={events}
                        onSelectEvent={(event) => {
                            startTransition(() => {
                                setSelectedEvent(event);
                                setDetailModalOpen(true);
                            });
                        }}
                    />
                    <span className="text-sm text-zinc-500">
                        {totalItems} markets
                    </span>
                </div>
            </div>

            {/* Empty State */}
            {totalItems === 0 ? (
                <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl">
                    <p className="text-zinc-500">No markets in this category</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Render Featured Events - Platform-aware cards */}
                    {filteredEvents.map((event) => (
                        <div key={event.id} onClick={() => handleEventClick(event.id)} className="cursor-pointer h-full">
                            {platform === "kalshi" ? (
                                // Kalshi uses matchup style for binary, multi-outcome for complex
                                event.isMultiOutcome ? (
                                    <KalshiMultiOutcomeCard
                                        event={event}
                                        onTrade={(marketId, side) => handleQuickTrade(marketId, side)}
                                    />
                                ) : (
                                    <KalshiMatchupCard
                                        event={event}
                                        onTrade={(marketId, side) => handleQuickTrade(marketId, side)}
                                    />
                                )
                            ) : (
                                // Polymarket uses SmartEventCard for all
                                <SmartEventCard
                                    event={event}
                                    onTrade={(marketId, side) => handleQuickTrade(marketId, side)}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Event Detail Modal */}
            <EventDetailModal
                event={selectedEvent}
                open={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                onTrade={handleTrade}
                platform={platform}
            />

            {/* Mobile Trade Sheet - Opens on mobile when Yes/No tapped */}
            {quickTradeMarket && (
                <MobileTradeSheet
                    isOpen={quickTradeOpen}
                    onClose={() => {
                        setQuickTradeOpen(false);
                        setQuickTradeMarket(null);
                    }}
                    marketTitle={quickTradeMarket.title}
                    yesPrice={quickTradeMarket.yesPrice}
                    noPrice={quickTradeMarket.noPrice}
                    balance={balance}
                    onTrade={handleMobileTradeExecute}
                />
            )}
        </div>
    );
}
