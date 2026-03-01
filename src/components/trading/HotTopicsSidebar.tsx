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
 * Common words to skip when extracting topic keywords from event titles.
 * These appear in many market titles but aren't meaningful topics.
 */
const STOP_WORDS = new Set([
    "will", "the", "by", "in", "of", "to", "on", "and", "or", "a", "an",
    "for", "at", "be", "is", "it", "if", "this", "that", "from", "with",
    "as", "was", "are", "do", "has", "have", "not", "its", "end",
    "before", "after", "march", "april", "may", "june", "july", "august",
    "2026", "2027", "winner", "win", "released", "more", "new",
    "first", "next", "last", "most", "than", "hit", "close", "above",
    "below", "which", "what", "who", "how", "ends", "strikes",
    "yes", "no", "vs", "vs.", "up", "down", "over", "under",
]);

/** Well-known multi-word topic phrases to detect as single topics */
const KNOWN_PHRASES: Record<string, string> = {
    "texas senate": "Texas Senate",
    "supreme leader": "Supreme Leader",
    "nuclear deal": "Nuclear Deal",
    "crude oil": "Crude Oil",
    "best picture": "Best Picture",
};

/** Format volume for display: $3M today, $50.8K today */
function formatVolumeCompact(volume: number): string {
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(0)}M`;
    if (volume >= 100_000) return `$${(volume / 1_000).toFixed(0)}K`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
}

/**
 * Extract trending topic keywords from event titles.
 * Groups events by significant proper nouns/entities and sums their volume24hr.
 * Returns top N topics ranked by today's volume.
 */
function extractHotTopics(
    events: EventMetadata[],
    count: number
): { topic: string; volume: number }[] {
    const topicVolume = new Map<string, number>();

    for (const event of events) {
        if (!event.title) continue;
        const titleLower = event.title.toLowerCase();
        const vol = event.volume ?? 0;

        // Check known multi-word phrases first
        for (const [phrase, display] of Object.entries(KNOWN_PHRASES)) {
            if (titleLower.includes(phrase)) {
                topicVolume.set(
                    display,
                    (topicVolume.get(display) ?? 0) + vol
                );
            }
        }

        // Extract individual words — keep proper nouns (capitalized, 3+ chars)
        const words = event.title.split(/[\s\-?!.,;:'"()]+/);
        for (const word of words) {
            // Must start with uppercase, be 3+ chars, not be a stop word
            if (
                word.length < 3 ||
                word[0] !== word[0].toUpperCase() ||
                word === word.toUpperCase() || // ALL CAPS like "BTC", "US" — too short
                STOP_WORDS.has(word.toLowerCase())
            ) {
                continue;
            }

            // Skip numbers and dates
            if (/^\d+$/.test(word)) continue;
            // Skip very short all-caps like "US", "UK" (unless 3+ chars like "UFC")
            if (word.length <= 2) continue;

            const normalized = word.charAt(0).toUpperCase() + word.slice(1);
            topicVolume.set(
                normalized,
                (topicVolume.get(normalized) ?? 0) + vol
            );
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
 * Extracts trending entity keywords from event titles ranked by 24h volume.
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
