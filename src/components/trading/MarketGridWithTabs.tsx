"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Flame, Sparkles } from "lucide-react";
import type { MockMarket } from "@/lib/mock-markets";
import { MarketCardClient } from "./TradePageComponents";

interface CategoryTabsProps {
    markets: MockMarket[];
    balance: number;
    userId: string;
}

// All available categories matching Polymarket
const CATEGORIES = [
    { id: 'trending', label: 'Trending', icon: TrendingUp, special: true },
    { id: 'all', label: 'All', special: false },
    { id: 'Politics', label: 'Politics' },
    { id: 'Crypto', label: 'Crypto' },
    { id: 'Finance', label: 'Finance' },
    { id: 'Sports', label: 'Sports' },
    { id: 'Other', label: 'Other' },
];

export function MarketGridWithTabs({ markets, balance, userId }: CategoryTabsProps) {
    const [activeTab, setActiveTab] = useState('trending');

    // Filter and sort markets based on active tab
    const filteredMarkets = useMemo(() => {
        let result = [...markets];

        if (activeTab === 'trending') {
            // Sort by volume descending (trending = highest volume)
            result.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        } else if (activeTab === 'all') {
            // Show all, sorted by volume
            result.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        } else {
            // Filter by category
            result = result.filter(m => m.category === activeTab);
            result.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        }

        return result;
    }, [markets, activeTab]);

    return (
        <div className="space-y-6">
            {/* Category Tabs - Polymarket Style */}
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
                        {activeTab === cat.id && cat.id !== 'trending' && cat.id !== 'all' && (
                            <span className="text-xs text-zinc-500 font-normal">
                                ({filteredMarkets.length})
                            </span>
                        )}
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
                    {filteredMarkets.length} markets
                </span>
            </div>

            {/* Markets Grid */}
            {filteredMarkets.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl">
                    <p className="text-zinc-500">No markets in this category</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
