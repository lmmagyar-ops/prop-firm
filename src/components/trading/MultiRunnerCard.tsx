"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, TrendingUp, Users } from "lucide-react";
import type { EventMetadata, SubMarket } from "@/app/actions/market";

interface MultiRunnerCardProps {
    event: EventMetadata;
    onTrade: (marketId: string, side: 'yes' | 'no') => void;
}

/**
 * MultiRunnerCard - Election/List style with multiple outcomes
 * Shows top outcomes with prices and Yes/No buttons
 */
export function MultiRunnerCard({ event, onTrade }: MultiRunnerCardProps) {
    const [expanded, setExpanded] = useState(false);

    // Show top 4 outcomes, rest in expanded view
    const topOutcomes = event.markets.slice(0, 4);
    const remainingOutcomes = event.markets.slice(4);
    const hasMore = remainingOutcomes.length > 0;

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}m`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}k`;
        return `$${volume.toFixed(0)}`;
    };

    // Extract short outcome label from question
    const getOutcomeLabel = (market: SubMarket) => {
        const question = market.question;

        // If question contains "Will" and "be the", extract the subject
        if (question.includes("Will ") && (question.includes(" be the ") || question.includes(" be "))) {
            const match = question.match(/Will ([^?]+?) be/i);
            if (match) return match[1].trim();
        }

        // If question contains ":", use text before it for subject
        if (question.includes(":")) {
            return question.split(":")[0].replace(/^Will /i, '').trim();
        }

        // Remove common prefixes
        let cleaned = question
            .replace(/^Will /i, '')
            .replace(/\?.*$/, '')
            .trim();

        // Take first few meaningful words
        return cleaned.split(' ').slice(0, 4).join(' ');
    };

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
            {/* Event Header */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-start gap-3">
                    {event.image && (
                        <img
                            src={event.image}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">
                            {event.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {formatVolume(event.volume)} Vol.
                            </span>
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {event.markets.length} options
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Outcomes List */}
            <div className="divide-y divide-white/5">
                {topOutcomes.map((market) => (
                    <OutcomeRow
                        key={market.id}
                        market={market}
                        label={getOutcomeLabel(market)}
                        onTrade={onTrade}
                    />
                ))}

                {/* Expanded outcomes */}
                {expanded && remainingOutcomes.map((market) => (
                    <OutcomeRow
                        key={market.id}
                        market={market}
                        label={getOutcomeLabel(market)}
                        onTrade={onTrade}
                    />
                ))}
            </div>

            {/* Show More Button */}
            {hasMore && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 flex items-center justify-center gap-1 transition-colors border-t border-white/5"
                >
                    {expanded ? "Show less" : `Show ${remainingOutcomes.length} more`}
                    <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
                </button>
            )}
        </div>
    );
}

interface OutcomeRowProps {
    market: SubMarket;
    label: string;
    onTrade: (marketId: string, side: 'yes' | 'no') => void;
}

function OutcomeRow({ market, label, onTrade }: OutcomeRowProps) {
    const percentage = Math.round(market.price * 100);
    const yesPrice = Math.round(market.price * 100);
    const noPrice = 100 - yesPrice;

    // Color based on probability
    const getColor = (price: number) => {
        if (price >= 0.7) return "text-emerald-400";
        if (price >= 0.4) return "text-blue-400";
        if (price >= 0.15) return "text-amber-400";
        return "text-zinc-400";
    };

    return (
        <div className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors group">
            {/* Outcome Label + Price */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm text-zinc-300 group-hover:text-white truncate">
                    {label}
                </span>
                <span className={cn("text-sm font-bold tabular-nums shrink-0", getColor(market.price))}>
                    {percentage}%
                </span>
            </div>

            {/* Trading Buttons */}
            <div className="flex gap-1.5 shrink-0">
                <button
                    onClick={() => onTrade(market.id, 'yes')}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                >
                    Yes {yesPrice}¢
                </button>
                <button
                    onClick={() => onTrade(market.id, 'no')}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors"
                >
                    No {noPrice}¢
                </button>
            </div>
        </div>
    );
}
