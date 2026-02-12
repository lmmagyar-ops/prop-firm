"use client";

import { memo } from "react";
import { TrendingUp, Users } from "lucide-react";
import Image from "next/image";
import { formatPrice } from "@/lib/formatters";
import type { EventMetadata } from "@/app/actions/market";

interface HeadToHeadCardProps {
    event: EventMetadata;
    onTrade: (marketId: string, side: 'yes' | 'no') => void;
}

/**
 * HeadToHeadCard - Sports matchup style (Team A vs Team B)
 * Memoized to prevent INP issues from cascade re-renders
 */
export const HeadToHeadCard = memo(function HeadToHeadCard({ event, onTrade }: HeadToHeadCardProps) {
    if (event.markets.length < 2) return null;

    // Get the two main markets (teams)
    const team1 = event.markets[0];
    const team2 = event.markets[1];

    // Extract team name from question (e.g., "Will the Chiefs..." -> "Chiefs")
    const extractTeamName = (question: string): string => {
        // Try to extract after "Will " or "Will the "
        let name = question.replace(/^Will (the )?/i, '').replace(/\?.*$/, '');
        // Take first few meaningful words
        name = name.split(' ').slice(0, 2).join(' ');
        // Remove trailing "be", "win", etc.
        name = name.replace(/(be|win|beat|lose).*$/i, '').trim();
        return name || question.substring(0, 15);
    };

    const team1Name = extractTeamName(team1.question);
    const team2Name = extractTeamName(team2.question);

    const team1Pct = formatPrice(team1.price);
    const team2Pct = formatPrice(team2.price);

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}m`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}k`;
        return `$${volume.toFixed(0)}`;
    };



    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-200 h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-start gap-3">
                    {event.image && (
                        <Image
                            src={event.image}
                            alt=""
                            width={40}
                            height={40}
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

            {/* Matchup Display */}
            <div className="p-4 flex-1 flex flex-col">
                {/* Team Stats Row */}
                <div className="flex items-center justify-between mb-4">
                    <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-white tabular-nums">
                            {team1Pct}
                        </div>
                        <div className="text-xs text-zinc-400 mt-1 truncate px-1">
                            {team1Name}
                        </div>
                    </div>

                    <div className="px-4 text-zinc-600 font-medium text-sm">
                        vs
                    </div>

                    <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-white tabular-nums">
                            {team2Pct}
                        </div>
                        <div className="text-xs text-zinc-400 mt-1 truncate px-1">
                            {team2Name}
                        </div>
                    </div>
                </div>

                {/* Trading Buttons - Softer style (like Yes/No cards) */}
                <div className="flex gap-3 mt-auto">
                    <button
                        onClick={() => onTrade(team1.id, 'yes')}
                        className="flex-1 py-3 rounded-lg font-semibold text-sm text-primary transition-all bg-transparent border border-primary/40 hover:bg-primary/10 hover:border-primary"
                    >
                        {team1Name}
                    </button>
                    <button
                        onClick={() => onTrade(team2.id, 'yes')}
                        className="flex-1 py-3 rounded-lg font-semibold text-sm text-rose-400 transition-all bg-transparent border border-rose-500/40 hover:bg-rose-500/10 hover:border-rose-400"
                    >
                        {team2Name}
                    </button>
                </div>

                {/* Draw option if exists */}
                {event.markets.length > 2 && event.markets[2] && (
                    <button
                        onClick={() => onTrade(event.markets[2].id, 'yes')}
                        className="w-full mt-2 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium transition-colors"
                    >
                        Draw {formatPrice(event.markets[2].price)}
                    </button>
                )}
            </div>
        </div>
    );
});

/**
 * Check if an event is a sports matchup (should use HeadToHeadCard)
 */
export function isSportsMatchup(event: EventMetadata): boolean {
    const title = event.title.toLowerCase();

    // Check for "vs" pattern
    if (title.includes(" vs ") || title.includes(" vs. ")) return true;

    // Check for sports keywords with 2-3 markets
    const sportsKeywords = [
        'nfl', 'nba', 'mlb', 'nhl', 'ufc', 'mma', 'ncaa', 'cfb', 'cbb',
        'soccer', 'football', 'basketball', 'hockey', 'baseball', 'tennis', 'golf',
        'epl', 'premier league', 'la liga', 'bundesliga', 'serie a', 'champions league',
        'matchup', 'game', 'match', 'series', 'championship', 'playoffs', 'finals',
        'super bowl', 'world cup', 'world series', 'stanley cup',
        'o/u', 'over/under', 'spread', 'moneyline',
    ];
    const hasSportsKeyword = sportsKeywords.some(k => title.includes(k));

    // Sports matchups typically have 2-3 markets (team1, team2, optionally draw)
    if (hasSportsKeyword && event.markets.length >= 2 && event.markets.length <= 3) {
        return true;
    }

    return false;
}
