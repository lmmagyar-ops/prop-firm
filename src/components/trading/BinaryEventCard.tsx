"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { EventMetadata } from "@/app/actions/market";

interface BinaryEventCardProps {
    event: EventMetadata;
    onTrade: (marketId: string, side: 'yes' | 'no') => void;
}

/**
 * BinaryEventCard - Polymarket style Yes/No card
 * Memoized to prevent INP issues from cascade re-renders
 */
export const BinaryEventCard = memo(function BinaryEventCard({ event, onTrade }: BinaryEventCardProps) {
    const market = event.markets[0];
    if (!market) return null;

    // Handle very low prices - display as "?" to indicate uncertainty
    const rawYesPrice = market.price;
    const yesPrice = rawYesPrice < 0.01 ? 0.5 : rawYesPrice; // Fallback to 50% for display
    const noPrice = 1 - yesPrice;
    const percentage = Math.round(yesPrice * 100);
    const yesCents = (yesPrice * 100).toFixed(1);
    const noCents = (noPrice * 100).toFixed(1);

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}m`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}k`;
        return `$${volume.toFixed(0)}`;
    };

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-200 min-h-[180px] h-full flex flex-col">
            {/* Header Row: Icon + Title + Percentage Badge */}
            <div className="flex items-start gap-3 mb-4">
                {/* Small circular icon */}
                {event.image && (
                    <Image
                        src={event.image}
                        alt=""
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                )}

                {/* Title */}
                <h3 className="flex-1 font-semibold text-white text-sm leading-tight line-clamp-2 min-w-0 pt-1">
                    {event.title}
                </h3>

                {/* Percentage Badge */}
                <div className={cn(
                    "shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold text-center",
                    percentage >= 50
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400"
                )}>
                    {percentage}%
                    <div className="text-[10px] opacity-70">chance</div>
                </div>
            </div>

            {/* Price Breakdown Row */}
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-4 px-1">
                <span>Buy Yes <span className="text-[#00C896] font-semibold">{yesCents}¢</span></span>
                <span>Buy No <span className="text-[#E63E5D] font-semibold">{noCents}¢</span></span>
            </div>

            {/* Trading Buttons - Polymarket hollow style */}
            <div className="flex gap-3 mb-4">
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade(market.id, 'yes'); }}
                    className="flex-1 py-3 rounded-lg bg-transparent hover:bg-[#00C896]/10 text-[#00C896] font-bold text-sm transition-colors border-2 border-[#00C896]/40 hover:border-[#00C896]"
                >
                    Yes
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade(market.id, 'no'); }}
                    className="flex-1 py-3 rounded-lg bg-transparent hover:bg-[#E63E5D]/10 text-[#E63E5D] font-bold text-sm transition-colors border-2 border-[#E63E5D]/40 hover:border-[#E63E5D]"
                >
                    No
                </button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Footer Stats */}
            <div className="flex items-center justify-between text-xs text-zinc-500 mt-auto">
                <span>{formatVolume(event.volume)} Vol.</span>
            </div>
        </div>
    );
});
