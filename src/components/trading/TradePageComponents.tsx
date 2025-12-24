
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MarketCard } from "@/components/trading/MarketCard";
import { TradingWidget } from "@/components/dashboard/TradingWidget";
import type { MockMarket } from "@/lib/mock-markets";
import { ChevronDown, Filter, ListFilter, SlidersHorizontal, TrendingUp } from "lucide-react";

export function MarketCardClient({ market, balance, userId }: { market: MockMarket, balance: number, userId: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <MarketCard
                market={market}
                onClick={() => setIsModalOpen(true)}
            />

            {isModalOpen && (
                <TradingWidget
                    initialBalance={balance}
                    userId={userId}
                    marketId={market.id}
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    question={market.question}
                    volume={market.volume}
                    activeTraders={market.activeTraders}
                />
            )}
        </>
    );
}

export function CategoryStrip() {
    return (
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide border-b border-white/5 pb-2">
            {/* Trending - Special Style */}
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-white hover:bg-white/5 rounded-lg transition-colors whitespace-nowrap">
                <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 text-blue-400" />
                </div>
                Trending
            </button>
            <div className="w-px h-4 bg-white/10 mx-2" />

            {/* Standard Categories */}
            {['Breaking', 'New', 'Politics', 'Sports', 'Crypto', 'Finance', 'Geopolitics', 'Earnings', 'Tech', 'Culture'].map((cat) => (
                <button
                    key={cat}
                    className="px-3 py-2 text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors whitespace-nowrap"
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}

export function MarketFilterStrip() {
    const filters = ["All", "Trump", "Epstein", "Venezuela", "Fed", "Ukraine", "Avatar", "SpaceX", "DeepSeek"];

    return (
        <div className="flex items-center justify-between gap-4">
            {/* Left: Local Search + Filter Toggle */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search markets"
                        className="w-full bg-[#1A232E] border border-[#2E3A52] hover:border-zinc-700 rounded-lg py-1.5 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition-all h-9"
                    />
                </div>
                {/* Filter Icon Button */}
                <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#2E3A52] text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
                    <ListFilter className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-white/10 mx-1 hidden md:block" />
            </div>

            {/* Right: Chips (Scrollable) */}
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {filters.map((filter, i) => (
                        <button
                            key={filter}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors h-7 flex items-center",
                                i === 0
                                    ? "bg-[#2E81FF] text-white"
                                    : "bg-[#242E42] text-zinc-400 hover:text-white hover:bg-[#2C3647]"
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function MarketPills() {
    const pills = [
        "All", "Trump", "Fed", "Ukraine", "Bitcoin", "SpaceX", "DeepSeek", "NVIDIA", "TikTok", "Super Bowl", "Ethereum"
    ];

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {pills.map((pill, i) => (
                <button
                    key={pill}
                    className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border",
                        i === 0
                            ? "bg-foreground text-background border-foreground"
                            : "bg-card/50 text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground"
                    )}
                >
                    {i !== 0 && "#"} {pill}
                </button>
            ))}
        </div>
    );
}

export function FilterBar({ isOpen }: { isOpen: boolean }) {
    if (!isOpen) return null;

    return (
        <div className="bg-muted/10 border border-border/50 rounded-xl p-3 mb-6 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center gap-4">

                {/* Sort Group */}
                <div className="flex gap-2">
                    {['Volume', 'Liquidity', 'Newest', 'Ending Soon'].map((sort, i) => (
                        <button key={sort} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                            i === 0 ? "bg-card border-border text-foreground shadow-sm" : "border-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground"
                        )}>
                            {sort}
                        </button>
                    ))}
                </div>

                <div className="w-px h-6 bg-border/50 hidden md:block"></div>

                {/* Filters Group */}
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer group">
                        <input type="checkbox" className="rounded border-border bg-card text-primary focus:ring-0" />
                        <span className="group-hover:translate-x-0.5 transition-transform">Hide Sports</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer group">
                        <input type="checkbox" className="rounded border-border bg-card text-primary focus:ring-0" />
                        <span className="group-hover:translate-x-0.5 transition-transform">Hide Crypto</span>
                    </label>
                </div>

            </div>
        </div>
    );
}

export function TradePageHeader() {
    return (
        <div className="flex flex-col gap-6">
            {/* Tier 2: Categories */}
            <CategoryStrip />

            {/* Tier 3: Filters & Chips */}
            <MarketFilterStrip />
        </div>
    );
}
