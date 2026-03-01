"use client";

import { useMemo, memo } from "react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/formatters";
import { ChevronRight } from "lucide-react";
import type { EventMetadata } from "@/app/actions/market";

interface BreakingNewsSidebarProps {
    events: EventMetadata[];
    onEventClick: (event: EventMetadata) => void;
}

const BREAKING_COUNT = 3;

/**
 * BreakingNewsSidebar — Shows top 3 markets from the "Breaking" category,
 * falling back to top by volume24hr if not enough breaking events.
 * Matches Polymarket's right sidebar: rank + title + price (%) + category.
 */
export const BreakingNewsSidebar = memo(function BreakingNewsSidebar({
    events,
    onEventClick,
}: BreakingNewsSidebarProps) {
    const items = useMemo(() => {
        // Prefer events tagged "Breaking"
        const breaking = events.filter((e) =>
            e.categories?.some(
                (c) => c.toLowerCase() === "breaking" || c.toLowerCase() === "new"
            )
        );
        // Sort by volume descending
        const sorted = [...breaking].sort(
            (a, b) => (b.volume ?? 0) - (a.volume ?? 0)
        );

        // Pad with highest-volume events if not enough breaking
        if (sorted.length < BREAKING_COUNT) {
            const existing = new Set(sorted.map((e) => e.id));
            const filler = events
                .filter((e) => !existing.has(e.id))
                .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
            sorted.push(...filler.slice(0, BREAKING_COUNT - sorted.length));
        }

        return sorted.slice(0, BREAKING_COUNT);
    }, [events]);

    if (items.length === 0) return null;

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Breaking news</h3>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="space-y-1">
                {items.map((event, i) => {
                    const market = event.markets[0];
                    const price = market?.price ?? 0.5;
                    const priceColor =
                        price >= 0.5 ? "text-emerald-400" : "text-rose-400";

                    return (
                        <button
                            key={event.id}
                            onClick={() => onEventClick(event)}
                            className="w-full flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
                        >
                            <span className="text-xs text-zinc-500 font-bold tabular-nums pt-0.5 shrink-0">
                                {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-300 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                                    {event.title}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                <span
                                    className={cn(
                                        "text-sm font-bold tabular-nums",
                                        priceColor
                                    )}
                                >
                                    {formatPrice(price)}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});
