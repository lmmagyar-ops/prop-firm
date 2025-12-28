"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, Clock } from "lucide-react";
import type { EventMetadata } from "@/app/actions/market";

interface BinaryEventCardProps {
    event: EventMetadata;
    onTrade: (marketId: string, side: 'yes' | 'no') => void;
}

/**
 * BinaryEventCard - Polymarket style Yes/No card
 * Used for single-outcome binary markets
 */
export function BinaryEventCard({ event, onTrade }: BinaryEventCardProps) {
    const market = event.markets[0];
    if (!market) return null;

    const yesPrice = market.price;
    const noPrice = 1 - yesPrice;
    const percentage = Math.round(yesPrice * 100);

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}m`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}k`;
        return `$${volume.toFixed(0)}`;
    };

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all group">
            {/* Header with Image */}
            <div className="relative">
                {event.image ? (
                    <div className="h-24 overflow-hidden">
                        <img
                            src={event.image}
                            alt=""
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                    </div>
                ) : (
                    <div className="h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
                )}

                {/* Probability Badge */}
                <div className="absolute top-3 right-3">
                    <div className={cn(
                        "px-2 py-1 rounded-lg text-xs font-bold",
                        percentage >= 50
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                    )}>
                        {percentage}%
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Title */}
                <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">
                    {event.title}
                </h3>

                {/* Probability Bar */}
                <div className="space-y-2">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500">
                        <span>Yes {percentage}%</span>
                        <span>No {100 - percentage}%</span>
                    </div>
                </div>

                {/* Trading Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => onTrade(market.id, 'yes')}
                        className="flex-1 py-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-semibold text-sm transition-colors"
                    >
                        Yes {Math.round(yesPrice * 100)}¢
                    </button>
                    <button
                        onClick={() => onTrade(market.id, 'no')}
                        className="flex-1 py-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-semibold text-sm transition-colors"
                    >
                        No {Math.round(noPrice * 100)}¢
                    </button>
                </div>

                {/* Footer Stats */}
                <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {formatVolume(event.volume)} Vol.
                    </span>
                    {event.markets[0]?.outcomes && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Annual
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
