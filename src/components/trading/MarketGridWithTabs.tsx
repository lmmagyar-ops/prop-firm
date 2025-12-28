"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import type { MockMarket } from "@/lib/mock-markets";
import type { EventMetadata } from "@/app/actions/market";
import { MarketCardClient } from "./TradePageComponents";
import { SmartEventCard } from "./SmartEventCard";

interface CategoryTabsProps {
    markets: MockMarket[];
    events?: EventMetadata[];
    balance: number;
    userId: string;
}

// All available categories matching Polymarket
const CATEGORIES = [
    { id: 'trending', label: 'Trending', icon: TrendingUp, special: true },
    { id: 'all', label: 'All', special: false },
    { id: 'Politics', label: 'Politics' },
    { id: 'Geopolitics', label: 'Geopolitics' },
    { id: 'Sports', label: 'Sports' },
    { id: 'Crypto', label: 'Crypto' },
    { id: 'Business', label: 'Business' },
    { id: 'Tech', label: 'Tech' },
    { id: 'Culture', label: 'Culture' },
    { id: 'Other', label: 'Other' },
];

export function MarketGridWithTabs({ markets, events = [], balance, userId }: CategoryTabsProps) {
    const [activeTab, setActiveTab] = useState('trending');
    const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
    const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

    // Filter events based on active tab
    const filteredEvents = useMemo(() => {
        if (activeTab === 'trending') {
            // Show all featured events on trending, sorted by volume
            return [...events].sort((a, b) => (b.volume || 0) - (a.volume || 0));
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

    // Filter and sort markets based on active tab
    const filteredMarkets = useMemo(() => {
        let result = [...markets];

        if (activeTab === 'trending') {
            result.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        } else if (activeTab === 'all') {
            result.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        } else {
            result = result.filter(m => {
                const cats = (m as any).categories || [m.category];
                return cats.includes(activeTab);
            });
            result.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        }

        return result;
    }, [markets, activeTab]);

    // Handler for when user clicks trading button on an event
    const handleTrade = (marketId: string, side: 'yes' | 'no') => {
        setSelectedMarketId(marketId);
        // Find the market question for trading widget
        const event = events.find(e => e.markets.some(m => m.id === marketId));
        const market = event?.markets.find(m => m.id === marketId);
        if (market) {
            setSelectedQuestion(market.question);
        }
        // The trading widget will be triggered by the MarketCardClient interaction
        console.log(`[Trade] ${side.toUpperCase()} on ${marketId}`);
    };

    const totalItems = filteredEvents.length + filteredMarkets.length;

    return (
        <div className="space-y-6">
            {/* Category Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide border-b border-white/5 pb-2">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveTab(cat.id)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap",
                            activeTab === cat.id
                                ? "text-white bg-white/10"
                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {cat.icon && (
                            <div className={cn(
                                "w-5 h-5 rounded flex items-center justify-center",
                                activeTab === cat.id ? "bg-blue-500/20" : "bg-blue-500/10"
                            )}>
                                <cat.icon className="w-3 h-3 text-blue-400" />
                            </div>
                        )}
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Market Count */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                    {activeTab === 'trending' ? 'Trending Markets' :
                        activeTab === 'all' ? 'All Markets' :
                            `${activeTab} Markets`}
                </h2>
                <span className="text-sm text-zinc-500">
                    {totalItems} markets
                </span>
            </div>

            {/* Empty State */}
            {totalItems === 0 ? (
                <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl">
                    <p className="text-zinc-500">No markets in this category</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Render Featured Events First (Multi-Outcome) */}
                    {filteredEvents.map((event) => (
                        <SmartEventCard
                            key={event.id}
                            event={event}
                            onTrade={handleTrade}
                        />
                    ))}

                    {/* Render Binary Markets */}
                    {filteredMarkets.map((market) => (
                        <MarketCardClient
                            key={market.id}
                            market={market}
                            balance={balance}
                            userId={userId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
