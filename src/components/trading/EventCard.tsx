"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, TrendingUp, Users } from "lucide-react";
import type { EventMetadata, SubMarket } from "@/app/actions/market";

interface EventCardProps {
    event: EventMetadata;
    onSelectOutcome: (marketId: string, question: string) => void;
}

/**
 * EventCard displays multi-outcome events (elections, sports, etc.)
 * Shows event title with top outcomes and their probabilities
 * Matches Polymarket's multi-runner display style
 */
export function EventCard({ event, onSelectOutcome }: EventCardProps) {
    const [expanded, setExpanded] = useState(false);

    // Show top 4 outcomes, rest in expanded view
    const topOutcomes = event.markets.slice(0, 4);
    const remainingOutcomes = event.markets.slice(4);
    const hasMore = remainingOutcomes.length > 0;

    const formatPrice = (price: number) => {
        return `${Math.round(price * 100)}%`;
    };

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}m`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}k`;
        return `$${volume.toFixed(0)}`;
    };

    // Extract short outcome label from question
    const getOutcomeLabel = (market: SubMarket) => {
        // If question contains ":", use text after it
        if (market.question.includes(":")) {
            return market.question.split(":")[1]?.trim() || market.question;
        }
        // If question starts with "Will", extract the key subject
        if (market.question.startsWith("Will ")) {
            const cleaned = market.question.replace("Will ", "").replace("?", "");
            // Take first few words
            return cleaned.split(" ").slice(0, 4).join(" ");
        }
        return market.question.substring(0, 30);
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
                        onSelect={() => onSelectOutcome(market.id, market.question)}
                    />
                ))}

                {/* Expanded outcomes */}
                {expanded && remainingOutcomes.map((market) => (
                    <OutcomeRow
                        key={market.id}
                        market={market}
                        label={getOutcomeLabel(market)}
                        onSelect={() => onSelectOutcome(market.id, market.question)}
                    />
                ))}
            </div>

            {/* Show More Button */}
            {hasMore && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 flex items-center justify-center gap-1 transition-colors"
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
    onSelect: () => void;
}

function OutcomeRow({ market, label, onSelect }: OutcomeRowProps) {
    const percentage = Math.round(market.price * 100);

    // Color based on probability
    const getColor = (price: number) => {
        if (price >= 0.7) return "text-emerald-400";
        if (price >= 0.4) return "text-blue-400";
        if (price >= 0.15) return "text-amber-400";
        return "text-zinc-400";
    };

    return (
        <button
            onClick={onSelect}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors group"
        >
            <span className="text-sm text-zinc-300 group-hover:text-white truncate flex-1 text-left">
                {label}
            </span>
            <div className="flex items-center gap-3">
                <span className={cn("text-sm font-bold tabular-nums", getColor(market.price))}>
                    {percentage}%
                </span>
                <div className="flex gap-1">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                        Yes
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30">
                        No
                    </span>
                </div>
            </div>
        </button>
    );
}
