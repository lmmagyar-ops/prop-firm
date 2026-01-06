"use client";

import { cn } from "@/lib/utils";
import { formatPrice, formatPayout } from "@/lib/formatters";
import type { EventMetadata } from "@/app/actions/market";

interface KalshiMatchupCardProps {
    event: EventMetadata;
    onTrade: (marketId: string, side: 'yes' | 'no') => void;
}

/**
 * KalshiMatchupCard - Kalshi-style sports matchup card
 * Light theme with white background like native Kalshi
 */
export function KalshiMatchupCard({ event, onTrade }: KalshiMatchupCardProps) {
    const market = event.markets[0];
    if (!market) return null;

    const yesPrice = market.price;
    const noPrice = 1 - yesPrice;

    // Determine if this looks like a "matchup" (title has "vs" or "at")
    const isMatchup = event.title.toLowerCase().includes(" vs ") ||
        event.title.toLowerCase().includes(" at ");

    // Try to extract team names from title
    let outcome1 = "Yes";
    let outcome2 = "No";

    if (isMatchup) {
        const match = event.title.match(/(.+?)\s+(vs|at)\s+(.+)/i);
        if (match) {
            outcome1 = match[1].trim().split(" ").pop() || "Yes"; // Last word (team abbrev)
            outcome2 = match[3].trim().split(" ").pop() || "No";
        }
    }

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}m`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}k`;
        return `$${volume.toFixed(0)}`;
    };

    // Kalshi style: Only the HIGHER probability button is green
    // The lower probability button is dark charcoal
    const yesIsHigher = yesPrice >= noPrice;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-green-400 hover:shadow-lg transition-all min-h-[180px] h-full flex flex-col shadow-sm">
            {/* Header Row: Icon + Title */}
            <div className="flex items-start gap-3 mb-4">
                {/* Small circular icon */}
                {event.image && (
                    <img
                        src={event.image}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                )}

                {/* Title & Category */}
                <div className="flex-1 min-w-0">
                    {event.categories?.[0] && (
                        <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">
                            {event.categories[0]}
                        </span>
                    )}
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">
                        {event.title}
                    </h3>
                </div>
            </div>

            {/* Matchup Buttons - Side by side Kalshi style */}
            {/* Only the HIGHER probability button is green */}
            {/* Matchup Buttons - Blue/Pink Kalshi style */}
            <div className="flex gap-2 mb-3">
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade(market.id, 'yes'); }}
                    className="flex-1 py-3 px-3 rounded-lg font-bold text-sm transition-all text-white bg-[#00C896] hover:bg-[#00B88A] shadow-sm hover:shadow"
                >
                    <div className="flex items-center justify-center gap-2">
                        <span className="uppercase text-xs opacity-90">{outcome1}</span>
                        <span className="text-lg tabular-nums">{formatPrice(yesPrice, "kalshi")}</span>
                    </div>
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onTrade(market.id, 'no'); }}
                    className="flex-1 py-3 px-3 rounded-lg font-bold text-sm transition-all text-white bg-[#E63E5D] hover:bg-[#D43552] shadow-sm hover:shadow"
                >
                    <div className="flex items-center justify-center gap-2">
                        <span className="uppercase text-xs opacity-90">{outcome2}</span>
                        <span className="text-lg tabular-nums">{formatPrice(noPrice, "kalshi")}</span>
                    </div>
                </button>
            </div>

            {/* Payout Info */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 px-1">
                <span>{formatPayout(yesPrice)}</span>
                <span>{formatPayout(noPrice)}</span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Footer Stats */}
            <div className="flex items-center justify-between text-xs text-slate-500 mt-auto">
                <span>{formatVolume(event.volume)}</span>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-600 font-medium">Active</span>
                </div>
            </div>
        </div>
    );
}

