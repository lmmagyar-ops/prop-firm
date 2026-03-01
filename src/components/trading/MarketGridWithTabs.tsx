"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Clock } from "lucide-react";
import type { EventMetadata } from "@/app/actions/market";
import { SmartEventCard } from "./SmartEventCard";
import { EventDetailModal } from "./EventDetailModal";
import { SearchModal } from "./SearchModal";
import { MobileTradeSheet } from "./MobileTradeSheet";
import { FeaturedCarousel } from "./FeaturedCarousel";
import { BreakingNewsSidebar } from "./BreakingNewsSidebar";
import { HotTopicsSidebar } from "./HotTopicsSidebar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTradeExecution } from "@/hooks/useTradeExecution";

interface CategoryTabsProps {
    events?: EventMetadata[];
    balance: number;
    userId: string;
    challengeId?: string;
    initialMarketId?: string;
}

/** Events with endDate within this window appear in the "Ending Soon" tab */
const ENDING_SOON_WINDOW_DAYS = 30;

/** Returns true if event has an endDate within the ENDING_SOON_WINDOW_DAYS cutoff */
function isEndingSoon(event: EventMetadata): boolean {
    if (!event.endDate) return false;
    const endMs = new Date(event.endDate).getTime();
    const cutoffMs = Date.now() + ENDING_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return endMs > Date.now() && endMs <= cutoffMs;
}

// All available categories matching Polymarket
const CATEGORIES = [
    { id: 'trending', label: 'Trending', icon: TrendingUp, special: true },
    { id: 'ending-soon', label: 'Ending Soon', icon: Clock, special: true },
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

export function MarketGridWithTabs({ events = [], balance, challengeId, initialMarketId }: CategoryTabsProps) {
    const [activeTab, setActiveTab] = useState('trending');
    const [selectedEvent, setSelectedEvent] = useState<EventMetadata | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [, startTransition] = useTransition();
    const autoOpenedRef = useRef(false);

    // Auto-open market modal when deep-linked from position click
    useEffect(() => {
        if (!initialMarketId || autoOpenedRef.current || events.length === 0) return;
        const matchingEvent = events.find(e =>
            e.markets.some(m => m.id === initialMarketId)
        );
        if (matchingEvent) {
            autoOpenedRef.current = true;
            setSelectedEvent(matchingEvent);
            setDetailModalOpen(true);
        }
    }, [initialMarketId, events]);

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
        counts['ending-soon'] = events.filter(isEndingSoon).length;
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

    // Sort helper: earliest endDate first, events without endDate sink to bottom
    const sortByEndDate = (a: EventMetadata, b: EventMetadata) => {
        const aEnd = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        return aEnd - bEnd;
    };

    // Filter events based on active tab
    const filteredEvents = useMemo(() => {
        if (activeTab === 'trending') {
            return [...events].sort(sortByVolume);
        } else if (activeTab === 'ending-soon') {
            return events.filter(isEndingSoon).sort(sortByEndDate);
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
    const handleTrade = (_marketId: string, _side: 'yes' | 'no', _question: string) => {
        // Detail modal has its own TradingSidebar that handles execution
    };

    const totalItems = filteredEvents.length;

    /** Open event in the detail modal */
    const handleCarouselEventClick = (event: EventMetadata) => {
        startTransition(() => {
            setSelectedEvent(event);
            setDetailModalOpen(true);
        });
    };

    return (
        <div className="space-y-6">
            {/* ===== HERO SECTION: Carousel + Sidebars ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Featured Carousel — 2/3 width on desktop */}
                <div className="lg:col-span-2">
                    <FeaturedCarousel
                        events={events}
                        onEventClick={handleCarouselEventClick}
                        onTrade={(marketId, side) => handleQuickTrade(marketId, side)}
                    />
                </div>

                {/* Sidebars — 1/3 width on desktop */}
                <div className="space-y-6">
                    <BreakingNewsSidebar
                        events={events}
                        onEventClick={handleCarouselEventClick}
                    />
                    <div className="border-t border-white/5" />
                    <HotTopicsSidebar events={events} />
                    <button
                        className="w-full py-2.5 rounded-full border border-white/10 hover:border-white/20 text-sm text-zinc-400 hover:text-white transition-colors bg-white/5"
                        onClick={() => {
                            document.getElementById('all-markets')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                    >
                        Explore all
                    </button>
                </div>
            </div>

            {/* ===== ALL MARKETS SECTION ===== */}
            <div id="all-markets" className="pt-2">
                <h2 className="text-lg font-bold text-white mb-4">All markets</h2>
            </div>

            {/* Category Tabs + Search — single unified bar */}
            <div className="relative">
                <div className={cn(
                    "flex items-center gap-1 overflow-x-auto scrollbar-hide pb-3 border-b pr-44",
                    "border-white/5"
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
                                        ? "text-white"
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {cat.icon && (
                                    <cat.icon className={cn(
                                        "w-4 h-4",
                                        activeTab === cat.id
                                            ? "text-emerald-400"
                                            : "text-zinc-500"
                                    )} />
                                )}
                                {cat.label}
                                {/* Inline count — subtle, no pill */}
                                {count > 0 && (
                                    <span className={cn(
                                        "text-[11px] font-medium tabular-nums ml-0.5",
                                        activeTab === cat.id
                                            ? "text-zinc-400"
                                            : "text-zinc-600"
                                    )}>
                                        {count}
                                    </span>
                                )}
                                {/* Active underline indicator with smooth transition */}
                                {activeTab === cat.id && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full animate-in fade-in slide-in-from-bottom-1 duration-200 bg-white" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Right-edge scroll fade + inline search/count */}
                <div className="absolute right-0 top-0 bottom-3 flex items-center gap-3 pl-16 bg-gradient-to-l from-[#0E1217] from-70% via-[#0E1217] via-85% to-transparent">
                    <SearchModal
                        events={events}
                        onSelectEvent={(event) => {
                            startTransition(() => {
                                setSelectedEvent(event);
                                setDetailModalOpen(true);
                            });
                        }}
                    />
                    <span className="text-xs text-zinc-500 tabular-nums whitespace-nowrap">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {/* Render Featured Events - Platform-aware cards with stagger animation */}
                    {filteredEvents.map((event, index) => (
                        <div
                            key={event.id}
                            onClick={() => handleEventClick(event.id)}
                            className="cursor-pointer h-full animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
                            style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                        >
                            <SmartEventCard
                                event={event}
                                onTrade={(marketId, side) => handleQuickTrade(marketId, side)}
                            />
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
                challengeId={challengeId}
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
                    marketId={quickTradeMarket.id}
                    challengeId={challengeId}
                    yesPrice={quickTradeMarket.yesPrice}
                    noPrice={quickTradeMarket.noPrice}
                    balance={balance}
                    onTrade={handleMobileTradeExecute}
                />
            )}
        </div>
    );
}
