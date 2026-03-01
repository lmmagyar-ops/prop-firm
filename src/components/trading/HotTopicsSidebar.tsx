"use client";

import { useMemo, memo } from "react";
import { ChevronRight, Flame } from "lucide-react";
import type { EventMetadata } from "@/app/actions/market";

interface HotTopicsSidebarProps {
    events: EventMetadata[];
    onTopicClick?: (topic: string) => void;
}

const HOT_COUNT = 5;

/**
 * Known entity patterns — maps keywords in titles to proper topic names.
 * Each pattern is a lowercase fragment to match, paired with its display name.
 * Order matters — longer/more-specific patterns should come first.
 */
const ENTITY_PATTERNS: [string, string][] = [
    // Countries & regions (Polymarket's most common hot topics)
    ["iran", "Iran"],
    ["india", "India"],
    ["cuba", "Cuba"],
    ["china", "China"],
    ["ukraine", "Ukraine"],
    ["russia", "Russia"],
    ["venezuela", "Venezuela"],
    ["israel", "Israel"],
    ["canada", "Canada"],
    ["mexico", "Mexico"],
    ["nepal", "Nepal"],
    ["turkey", "Turkey"],
    ["north korea", "North Korea"],

    // People
    ["trump", "Trump"],
    ["biden", "Biden"],
    ["elon", "Elon Musk"],
    ["musk", "Elon Musk"],
    ["desantis", "DeSantis"],
    ["kamala", "Kamala Harris"],
    ["vance", "J.D. Vance"],
    ["newsom", "Newsom"],
    ["shapiro", "Shapiro"],
    ["ocasio", "AOC"],
    ["rubio", "Rubio"],
    ["powell", "Powell"],
    ["khamenei", "Khamenei"],

    // Sports leagues & competitions
    ["premier league", "Premier League"],
    ["champions league", "Champions League"],
    ["world cup", "World Cup"],
    ["la liga", "La Liga"],
    ["stanley cup", "Stanley Cup"],
    ["nba", "NBA"],
    ["nfl", "NFL"],
    ["nhl", "NHL"],
    ["mlb", "MLB"],
    ["ufc", "UFC"],
    ["oscars", "Oscars"],
    ["nba mvp", "NBA MVP"],

    // Finance & crypto
    ["bitcoin", "Bitcoin"],
    ["btc", "Bitcoin"],
    ["ethereum", "Ethereum"],
    ["eth", "Ethereum"],
    ["fed ", "Fed"],
    ["federal reserve", "Fed"],
    ["interest rate", "Interest Rates"],
    ["tariff", "Tariffs"],
    ["s&p", "S&P 500"],
    ["oil", "Oil"],
    ["crude", "Oil"],
    ["gold", "Gold"],

    // Topics
    ["election", "Elections"],
    ["midterm", "Midterms"],
    ["supreme court", "Supreme Court"],
    ["senate", "Senate"],
    ["ceasefire", "Ceasefire"],
    ["nuclear", "Nuclear"],
    ["ai ", "AI"],
    ["artificial intelligence", "AI"],
];

/** Format volume for display: $3M today, $50.8K today */
function formatVolumeCompact(volume: number): string {
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(0)}M`;
    if (volume >= 100_000) return `$${(volume / 1_000).toFixed(0)}K`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
}

/**
 * Extract trending entity topics from event titles using pattern matching.
 * Groups events by recognized entities and sums their volume24hr.
 * Falls back to volume (lifetime) if volume24hr isn't available.
 */
function extractHotTopics(
    events: EventMetadata[],
    count: number
): { topic: string; volume: number }[] {
    const topicVolume = new Map<string, number>();

    for (const event of events) {
        if (!event.title) continue;
        const titleLower = event.title.toLowerCase();
        // Use volume24hr (today's volume) when available, fall back to total volume
        const vol = event.volume24hr ?? event.volume ?? 0;
        const matched = new Set<string>(); // avoid double-counting same entity from multiple patterns

        for (const [pattern, display] of ENTITY_PATTERNS) {
            if (titleLower.includes(pattern) && !matched.has(display)) {
                matched.add(display);
                topicVolume.set(
                    display,
                    (topicVolume.get(display) ?? 0) + vol
                );
            }
        }
    }

    // Sort by volume descending, take top N
    return [...topicVolume.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([topic, volume]) => ({ topic, volume }));
}

/**
 * HotTopicsSidebar — Polymarket-style "Hot topics" with 🔥 and "$XM today".
 * Extracts trending entity names from event titles ranked by 24h volume.
 */
export const HotTopicsSidebar = memo(function HotTopicsSidebar({
    events,
    onTopicClick,
}: HotTopicsSidebarProps) {
    const topics = useMemo(
        () => extractHotTopics(events, HOT_COUNT),
        [events]
    );

    if (topics.length === 0) return null;

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Hot topics</h3>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="space-y-0.5">
                {topics.map(({ topic, volume }, i) => (
                    <button
                        key={topic}
                        onClick={() => onTopicClick?.(topic)}
                        className="w-full flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
                    >
                        <span className="text-xs text-zinc-500 font-bold tabular-nums shrink-0 w-4 text-center">
                            {i + 1}
                        </span>
                        <span className="flex-1 text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">
                            {topic}
                        </span>
                        <span className="text-xs text-zinc-500 tabular-nums shrink-0">
                            {formatVolumeCompact(volume)} today
                        </span>
                        <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
                    </button>
                ))}
            </div>
        </div>
    );
});
