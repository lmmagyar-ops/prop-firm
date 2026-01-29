"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Users } from "lucide-react";
import type { EventMetadata, SubMarket } from "@/app/actions/market";

interface MultiRunnerCardProps {
    event: EventMetadata;
    onTrade: (marketId: string, side: 'yes' | 'no') => void;
}

/**
 * MultiRunnerCard - Election/List style with multiple outcomes
 * Memoized to prevent INP issues from cascade re-renders
 */
export const MultiRunnerCard = memo(function MultiRunnerCard({ event, onTrade }: MultiRunnerCardProps) {
    // Show only top 2 outcomes on card (Polymarket style)
    const topOutcomes = event.markets.slice(0, 2);
    const remainingCount = event.markets.length - 2;

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}m`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}k`;
        return `$${volume.toFixed(0)}`;
    };

    // Extract short outcome label from question - find the KEY DIFFERENTIATOR
    const getOutcomeLabel = (market: SubMarket, eventTitle: string) => {
        const question = market.question;

        // 1. Extract monetary thresholds like ">$2B", ">$1B"
        const moneyMatch = question.match(/[>\<]=?\s*\$[\d.]+[BMKbmk]?/);
        if (moneyMatch) return moneyMatch[0];

        // 2. Extract dates like "January 31, 2026" or "March 31"
        const dateMatch = question.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s*\d{4})?/i);
        if (dateMatch) return dateMatch[0];

        // 3. Extract percentages like "50+ bps", "25 bps"
        const bpsMatch = question.match(/\d+\+?\s*bps/i);
        if (bpsMatch) return bpsMatch[0];

        // 4. For "Will X win Super Bowl" style - extract the team/person name
        const winMatch = question.match(/Will (?:the )?(.+?) win/i);
        if (winMatch) return winMatch[1].trim();

        // 5. For "Will Trump nominate X" style - extract the name
        const nominateMatch = question.match(/nominate (.+?) (?:as|to|for)/i);
        if (nominateMatch) return nominateMatch[1].trim();

        // 6. Remove the event title from the question to find the differentiator
        let cleaned = question;

        // Remove common parts that match the event title
        const titleWords = eventTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        for (const word of titleWords) {
            // Escape regex special characters to prevent Invalid RegExp errors
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleaned = cleaned.replace(new RegExp(escapedWord, 'gi'), '');
        }

        // Clean up common prefixes/suffixes
        cleaned = cleaned
            .replace(/^Will /i, '')
            .replace(/\?.*$/, '')
            .replace(/one day after launch/i, '')
            .replace(/by\s*$/i, '')
            .replace(/in\s*$/i, '')
            .trim();

        // If we have something meaningful left, use it
        if (cleaned.length > 2 && cleaned.length < 50) {
            return cleaned.split(' ').slice(0, 4).join(' ');
        }

        // Fallback: first few words
        return question.split(' ').slice(0, 3).join(' ') + '...';
    };

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors min-h-[180px] h-full flex flex-col">
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

            {/* Outcomes List - Top 2 only */}
            <div className="divide-y divide-white/5 flex-1">
                {topOutcomes.map((market) => (
                    <OutcomeRow
                        key={market.id}
                        market={market}
                        label={getOutcomeLabel(market, event.title)}
                        onTrade={onTrade}
                    />
                ))}
            </div>

            {/* Footer - Volume only (like Polymarket) */}
            <div className="px-4 py-3 text-xs text-zinc-500 border-t border-white/5 mt-auto">
                {formatVolume(event.volume)} Vol.
            </div>
        </div>
    );
});

interface OutcomeRowProps {
    market: SubMarket;
    label: string;
    onTrade: (marketId: string, side: 'yes' | 'no') => void;
}

const OutcomeRow = memo(function OutcomeRow({ market, label, onTrade }: OutcomeRowProps) {
    const percentage = Math.round(market.price * 100);
    const yesPrice = Math.round(market.price * 100);
    const noPrice = 100 - yesPrice;

    // Color based on probability
    const getColor = (price: number) => {
        if (price >= 0.7) return "text-emerald-400";
        if (price >= 0.4) return "text-blue-400";
        if (price >= 0.15) return "text-white"; // Changed from amber to white for cleaner look
        return "text-zinc-500";
    };

    return (
        <div className="px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0">
            {/* Outcome Label + Probability */}
            <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                <span className="text-[13px] font-medium text-zinc-300 group-hover:text-blue-400 truncate transition-colors">
                    {label}
                </span>
                <span className={cn("text-[13px] font-bold tabular-nums shrink-0 opacity-80", getColor(market.price))}>
                    {percentage}%
                </span>
            </div>

            {/* Trading Buttons (Compact - Polymarket hollow style) */}
            <div className="flex gap-1.5 shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade(market.id, 'yes'); }}
                    className="px-3 py-1 text-xs font-bold rounded bg-transparent hover:bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/40 hover:border-[#00C896] transition-all"
                >
                    Yes
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade(market.id, 'no'); }}
                    className="px-3 py-1 text-xs font-bold rounded bg-transparent hover:bg-[#E63E5D]/10 text-[#E63E5D] border border-[#E63E5D]/40 hover:border-[#E63E5D] transition-all"
                >
                    No
                </button>
            </div>
        </div>
    );
});
