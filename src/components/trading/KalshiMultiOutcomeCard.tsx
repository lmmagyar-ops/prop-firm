"use client";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/formatters";
import { getCleanOutcomeName } from "@/lib/market-utils";
import type { EventMetadata } from "@/app/actions/market";

interface KalshiMultiOutcomeCardProps {
    event: EventMetadata;
    onTrade: (marketId: string, side: 'yes' | 'no') => void;
}

/**
 * KalshiMultiOutcomeCard - Table-style card for range/bracket markets
 * Light theme with white background like native Kalshi
 */
export function KalshiMultiOutcomeCard({ event, onTrade }: KalshiMultiOutcomeCardProps) {
    if (!event.markets || event.markets.length === 0) return null;

    // Show top 3 outcomes
    const visibleMarkets = event.markets.slice(0, 3);
    const remainingCount = Math.max(0, event.markets.length - 3);

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}m`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}k`;
        return `$${volume.toFixed(0)}`;
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-400 hover:shadow-lg transition-all flex flex-col shadow-sm group">
            {/* Header */}
            <div className="flex items-start gap-3 mb-2">
                {event.image && (
                    <img
                        src={event.image}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-100 bg-slate-50"
                    />
                )}
                <div className="flex-1 min-w-0">
                    {event.categories?.[0] && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 block">
                            {event.categories[0]}
                        </span>
                    )}
                    <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2 group-hover:text-[#00C896] transition-colors">
                        {event.title}
                    </h3>
                </div>
            </div>

            {/* Outcomes Table */}
            <div className="flex-1 space-y-1.5">
                {visibleMarkets.map((market) => {
                    const yesPrice = Math.floor(market.price * 100);
                    const noPrice = 100 - yesPrice;

                    return (
                        <div
                            key={market.id}
                            className="flex items-center justify-between gap-2"
                        >
                            {/* Outcome Name */}
                            <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-slate-700 truncate block">
                                    {market.question}
                                </span>
                            </div>

                            {/* Yes/No Buttons - Integrated Price */}
                            <div className="flex gap-1 shrink-0">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onTrade(market.id, 'yes'); }}
                                    className="h-7 px-2 min-w-[56px] flex items-center justify-center gap-1 text-xs font-bold rounded border border-slate-200 text-[#00C896] hover:bg-[#00C896] hover:text-white hover:border-[#00C896] transition-all"
                                >
                                    <span>Yes</span>
                                    <span className="opacity-90">{yesPrice}¢</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onTrade(market.id, 'no'); }}
                                    className="h-7 px-2 min-w-[56px] flex items-center justify-center gap-1 text-xs font-bold rounded border border-slate-200 text-[#E63E5D] hover:bg-[#E63E5D] hover:text-white hover:border-[#E63E5D] transition-all"
                                >
                                    <span>No</span>
                                    <span className="opacity-90">{noPrice}¢</span>
                                </button>
                            </div>
                        </div>
                    );
                })}

                {remainingCount > 0 && (
                    <div className="text-center text-[10px] font-medium text-slate-400 pt-1">
                        +{remainingCount} more outcomes
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    {formatVolume(event.volume)} Vol
                </span>
                <span className="text-slate-500">
                    {event.markets.length} outcomes
                </span>
            </div>
        </div>
    );
}

