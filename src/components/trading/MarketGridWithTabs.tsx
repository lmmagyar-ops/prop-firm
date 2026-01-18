"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Clock } from "lucide-react";
import type { EventMetadata } from "@/app/actions/market";
import { SmartEventCard } from "./SmartEventCard";
import { EventDetailModal } from "./EventDetailModal";
import { SearchModal } from "./SearchModal";
import { KalshiMatchupCard } from "./KalshiMatchupCard";
import { KalshiMultiOutcomeCard } from "./KalshiMultiOutcomeCard";
import { MobileTradeSheet } from "./MobileTradeSheet";

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
    { id: 'breaking', label: 'Breaking', special: true },
    { id: 'ending', label: 'Ending Soon', icon: Clock, special: true },
    { id: 'new', label: 'New', special: false },
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

export function MarketGridWithTabs({ events = [], balance, userId, platform = "polymarket", challengeId }: CategoryTabsProps) {
    const [activeTab, setActiveTab] = useState('trending');
    const [selectedEvent, setSelectedEvent] = useState<EventMetadata | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Mobile trade sheet state
    const [tradeSheetOpen, setTradeSheetOpen] = useState(false);
    const [tradeSheetMarket, setTradeSheetMarket] = useState<{
        id: string;
        title: string;
        yesPrice: number;
        noPrice: number;
    } | null>(null);

    // Detect mobile
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Platform display config
    const platformConfig = {
        polymarket: { label: "Polymarket", icon: "🌐", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
        kalshi: { label: "Kalshi", icon: "🇺🇸", color: "text-green-600 bg-green-500/10 border-green-500/30" }
    };

    // Platform-aware text colors
    const isLightTheme = platform === "kalshi";

    // Filter events based on active tab
    const filteredEvents = useMemo(() => {
        if (activeTab === 'trending') {
            // Show all featured events on trending, sorted by volume
            return [...events].sort((a, b) => (b.volume || 0) - (a.volume || 0));
        } else if (activeTab === 'ending') {
            // Filter events ending within 48 hours
            const now = Date.now();
            const hours48 = 48 * 60 * 60 * 1000;
            return events.filter(e => {
                if (!e.endDate) return false;
                const endTime = new Date(e.endDate).getTime();
                return endTime > now && endTime - now < hours48;
            }).sort((a, b) => {
                // Sort by soonest ending first
                const aEnd = new Date(a.endDate || 0).getTime();
                const bEnd = new Date(b.endDate || 0).getTime();
                return aEnd - bEnd;
            });
        } else if (activeTab === 'all') {
            return [...events].sort((a, b) => (b.volume || 0) - (a.volume || 0));
        } else {
            // Filter by category
            return events.filter(e => {
                const cats = e.categories || [];
                return cats.includes(activeTab);
            }).sort((a, b) => (b.volume || 0) - (a.volume || 0));
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

    // Handler for quick trade from Yes/No buttons
    const handleQuickTrade = (event: EventMetadata, marketId: string, side: 'yes' | 'no') => {
        const market = event.markets.find(m => m.id === marketId) || event.markets[0];
        if (!market) return;

        if (isMobile) {
            // Mobile: Open quick trade sheet
            setTradeSheetMarket({
                id: market.id,
                title: event.title,
                yesPrice: market.price,
                noPrice: 1 - market.price,
            });
            setTradeSheetOpen(true);
        } else {
            // Desktop: Open full detail modal
            startTransition(() => {
                setSelectedEvent(event);
                setDetailModalOpen(true);
            });
        }
    };

    // Execute trade from MobileTradeSheet
    const executeTrade = async (outcome: "YES" | "NO", amount: number) => {
        if (!tradeSheetMarket || !challengeId) {
            console.error("[Trade] Missing market or challenge ID");
            return;
        }

        const res = await fetch("/api/trade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                challengeId,
                marketId: tradeSheetMarket.id,
                side: outcome,
                amount,
            }),
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Trade failed");
        }
    };

    // Handler for trading from within the detail modal
    const handleTrade = (marketId: string, side: 'yes' | 'no', question: string) => {
        console.log(`[Trade] ${side.toUpperCase()} on ${marketId}: ${question}`);
        // TODO: Integrate with actual trading execution
    };

    const totalItems = filteredEvents.length;

    return (
        <div className="space-y-6">
            {/* Category Tabs - Platform-aware styling */}
            <div className={cn(
                "flex items-center gap-1 overflow-x-auto scrollbar-hide pb-3 border-b",
                isLightTheme ? "border-slate-200" : "border-white/5"
            )}>
                {CATEGORIES.map((cat) => (
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
                        {/* Active underline indicator */}
                        {activeTab === cat.id && (
                            <span className={cn(
                                "absolute bottom-0 left-0 right-0 h-0.5 rounded-full",
                                isLightTheme ? "bg-green-500" : "bg-white"
                            )} />
                        )}
                    </button>
                ))}
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
                                        onTrade={(marketId, side) => handleQuickTrade(event, marketId, side)}
                                    />
                                ) : (
                                    <KalshiMatchupCard
                                        event={event}
                                        onTrade={(marketId, side) => handleQuickTrade(event, marketId, side)}
                                    />
                                )
                            ) : (
                                // Polymarket uses SmartEventCard for all
                                <SmartEventCard
                                    event={event}
                                    onTrade={(marketId, side) => handleQuickTrade(event, marketId, side)}
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

            {/* Mobile Quick Trade Sheet */}
            {tradeSheetMarket && (
                <MobileTradeSheet
                    isOpen={tradeSheetOpen}
                    onClose={() => setTradeSheetOpen(false)}
                    marketTitle={tradeSheetMarket.title}
                    yesPrice={tradeSheetMarket.yesPrice}
                    noPrice={tradeSheetMarket.noPrice}
                    balance={balance}
                    onTrade={executeTrade}
                />
            )}
        </div>
    );
}

