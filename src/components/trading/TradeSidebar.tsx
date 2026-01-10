"use client";

import { UnifiedTradePanel } from "./UnifiedTradePanel";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { EventMetadata } from "@/app/actions/market";

interface TradeSidebarProps {
    // Trade panel props
    selectedMarket: {
        id: string;
        question: string;
        imageUrl?: string;
        yesPrice: number;
        noPrice: number;
        category?: string;
    } | null;
    balance: number;
    onTrade: (outcome: "YES" | "NO", amount: number) => Promise<void>;
    loading?: boolean;
    position?: {
        id: string;
        shares: number;
        avgPrice: number;
        invested: number;
        currentPnl: number;
        roi: number;
        side: "YES" | "NO";
    };
    onClosePosition?: () => void;
    onClose: () => void;

    // Related markets props
    events?: EventMetadata[];
    onSelectMarket?: (marketId: string) => void;
}

/**
 * TradeSidebar - Polymarket-style right sidebar
 * 
 * Contains:
 * 1. Trade panel (UnifiedTradePanel)
 * 2. Related markets list
 */
export function TradeSidebar({
    selectedMarket,
    balance,
    onTrade,
    loading,
    position,
    onClosePosition,
    onClose,
    events = [],
    onSelectMarket,
}: TradeSidebarProps) {
    if (!selectedMarket) {
        return (
            <div className="w-[380px] h-full bg-[#0f1115] border-l border-white/5 flex items-center justify-center">
                <div className="text-center text-zinc-500 px-8">
                    <div className="text-4xl mb-4">📊</div>
                    <p className="text-sm">Select a market to trade</p>
                </div>
            </div>
        );
    }

    // Get related markets - same category, exclude current
    const relatedMarkets = events
        .flatMap(e => e.markets?.map(m => ({
            ...m,
            eventTitle: e.title,
            eventImage: e.image,
            category: e.categories?.[0],
        })) || [])
        .filter(m =>
            m.id !== selectedMarket.id &&
            m.category === selectedMarket.category
        )
        .slice(0, 5);

    // Category tabs for filtering
    const categories = ["All", "Geopolitics", "Politics", "Middle East"];

    return (
        <div className="w-[380px] h-full flex flex-col bg-[#0f1115] border-l border-white/5 overflow-hidden">
            {/* Close button for mobile */}
            <button
                onClick={onClose}
                className="lg:hidden absolute top-4 right-4 z-50 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Trade Panel */}
            <div className="flex-shrink-0 max-h-[60%] overflow-y-auto">
                <UnifiedTradePanel
                    yesPrice={selectedMarket.yesPrice}
                    noPrice={selectedMarket.noPrice}
                    balance={balance}
                    onTrade={onTrade}
                    loading={loading}
                    position={position}
                    onClosePosition={onClosePosition}
                    question={selectedMarket.question}
                    imageUrl={selectedMarket.imageUrl}
                />
            </div>

            {/* Related Markets Section */}
            <div className="flex-1 border-t border-white/5 overflow-hidden flex flex-col">
                {/* Category Tabs */}
                <div className="flex gap-2 px-4 py-3 border-b border-white/5 overflow-x-auto flex-shrink-0">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                                cat === "All"
                                    ? "bg-white/10 text-white"
                                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Related Markets List */}
                <div className="flex-1 overflow-y-auto px-4 py-2">
                    {relatedMarkets.length === 0 ? (
                        <div className="text-center text-zinc-500 text-sm py-8">
                            No related markets
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {relatedMarkets.map((market) => (
                                <button
                                    key={market.id}
                                    onClick={() => onSelectMarket?.(market.id)}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                                >
                                    {/* Market Image */}
                                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                                        {market.eventImage ? (
                                            <img
                                                src={market.eventImage}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs">
                                                📊
                                            </div>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">
                                            {market.question || market.eventTitle}
                                        </p>
                                    </div>

                                    {/* Probability */}
                                    <div className="text-sm font-bold text-white flex-shrink-0">
                                        {Math.round((market.price || 0.5) * 100)}%
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
