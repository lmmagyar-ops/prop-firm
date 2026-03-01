"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/formatters";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EventMetadata } from "@/app/actions/market";

interface FeaturedCarouselProps {
    events: EventMetadata[];
    onEventClick: (event: EventMetadata) => void;
    onTrade: (marketId: string, side: "yes" | "no") => void;
}

const CAROUSEL_SIZE = 6;

/** Format volume to compact $X.XM / $XXk string */
function formatVolume(volume: number): string {
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
    return `$${volume.toFixed(0)}`;
}

/**
 * Mini sparkline SVG — a simple probability bar visualization.
 * Shows the YES price as a filled bar relative to 50% midline.
 */
function ProbabilityBar({ price, color }: { price: number; color: string }) {
    const pct = Math.max(1, Math.min(99, price * 100));
    return (
        <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
            />
            {/* 50% midline marker */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
        </div>
    );
}

/**
 * FeaturedCarousel — Polymarket-style hero carousel.
 * Shows top events by 24h volume with trade buttons, probability, and navigation.
 */
export const FeaturedCarousel = memo(function FeaturedCarousel({
    events,
    onEventClick,
    onTrade,
}: FeaturedCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    // Top events by 24h volume
    const featured = useMemo(() => {
        return [...events]
            .sort((a, b) => (b.volume24hr ?? b.volume ?? 0) - (a.volume24hr ?? a.volume ?? 0))
            .slice(0, CAROUSEL_SIZE);
    }, [events]);

    const total = featured.length;

    const goTo = useCallback(
        (idx: number) => setActiveIndex(((idx % total) + total) % total),
        [total]
    );

    if (total === 0) return null;

    const event = featured[activeIndex];
    const prevEvent = featured[((activeIndex - 1) % total + total) % total];
    const nextEvent = featured[(activeIndex + 1) % total];
    const market = event.markets[0];
    const isMulti = event.markets.length > 1;

    // Primary price for display
    const primaryPrice = market?.price ?? 0.5;
    const percentage = formatPrice(primaryPrice);
    const priceColor = primaryPrice >= 0.5 ? "#00C896" : "#E63E5D";

    // Category breadcrumb
    const categoryLabel = event.categories?.[0] ?? "Trending";

    return (
        <div className="space-y-3">
            {/* Main Carousel Card */}
            <div
                className="relative bg-zinc-900/60 border border-white/5 rounded-2xl overflow-hidden cursor-pointer group"
                onClick={() => onEventClick(event)}
            >
                {/* Category breadcrumb + Resolution date */}
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span className="px-2 py-0.5 bg-white/5 rounded-md font-medium">
                            {categoryLabel}
                        </span>
                        {event.endDate && (
                            <span className="text-zinc-500">
                                Ends{" "}
                                {new Date(event.endDate).toLocaleDateString(
                                    undefined,
                                    { month: "short", day: "numeric" }
                                )}
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-zinc-500 font-medium tabular-nums">
                        {formatVolume(event.volume)} Vol
                    </span>
                </div>

                {/* Event content */}
                <div className="px-5 pb-5 flex gap-5">
                    {/* Left: Image + Title + Price */}
                    <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start gap-4">
                            {event.image && (
                                <Image
                                    src={event.image}
                                    alt=""
                                    width={64}
                                    height={64}
                                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                                />
                            )}
                            <div className="space-y-1 min-w-0">
                                <h2 className="text-xl font-bold text-white leading-tight line-clamp-2 group-hover:text-white/90 transition-colors">
                                    {event.title}
                                </h2>
                                {!isMulti && (
                                    <div className="flex items-baseline gap-2">
                                        <span
                                            className="text-3xl font-black tabular-nums"
                                            style={{ color: priceColor }}
                                        >
                                            {percentage}
                                        </span>
                                        <span className="text-xs text-zinc-500">
                                            chance
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Probability bar for binary markets */}
                        {!isMulti && market && (
                            <ProbabilityBar
                                price={primaryPrice}
                                color={priceColor}
                            />
                        )}

                        {/* Multi-outcome: show top 3 runners */}
                        {isMulti && (
                            <div className="space-y-2 mt-1">
                                {event.markets.slice(0, 3).map((m) => {
                                    const p = m.price ?? 0.5;
                                    const c =
                                        p >= 0.5 ? "#00C896" : "#E63E5D";
                                    return (
                                        <div
                                            key={m.id}
                                            className="flex items-center justify-between gap-3"
                                        >
                                            <span className="text-sm text-zinc-300 truncate flex-1">
                                                {m.question?.replace(
                                                    event.title + " - ",
                                                    ""
                                                ) ?? m.outcomes?.[0]}
                                            </span>
                                            <span
                                                className="text-sm font-bold tabular-nums shrink-0"
                                                style={{ color: c }}
                                            >
                                                {formatPrice(p)}
                                            </span>
                                        </div>
                                    );
                                })}
                                {event.markets.length > 3 && (
                                    <span className="text-xs text-zinc-500">
                                        +{event.markets.length - 3} more
                                        outcomes
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Trade buttons */}
                        {market && (
                            <div className="flex gap-3 pt-2">
                                {isMulti ? (
                                    // Multi: view details button
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEventClick(event);
                                        }}
                                        className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors border border-white/10"
                                    >
                                        View All Outcomes
                                    </button>
                                ) : (
                                    // Binary: Yes/No buttons
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTrade(market.id, "yes");
                                            }}
                                            className="flex-1 py-3 rounded-lg bg-[#00C896]/10 hover:bg-[#00C896]/20 text-[#00C896] font-bold text-sm transition-colors border border-[#00C896]/30 hover:border-[#00C896]/60"
                                        >
                                            Yes
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTrade(market.id, "no");
                                            }}
                                            className="flex-1 py-3 rounded-lg bg-[#E63E5D]/10 hover:bg-[#E63E5D]/20 text-[#E63E5D] font-bold text-sm transition-colors border border-[#E63E5D]/30 hover:border-[#E63E5D]/60"
                                        >
                                            No
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Carousel Controls: Dots + Pill Navigation */}
            <div className="flex items-center gap-3">
                {/* Dots */}
                <div className="flex items-center gap-1.5">
                    {featured.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            className={cn(
                                "transition-all duration-200 rounded-full",
                                activeIndex === i
                                    ? "w-6 h-2 bg-white"
                                    : "w-2 h-2 bg-white/20 hover:bg-white/40"
                            )}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Prev/Next Pills with adjacent slide titles */}
                {total > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goTo(activeIndex - 1)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 text-xs text-zinc-400 hover:text-white transition-colors bg-white/5 max-w-[180px]"
                        >
                            <ChevronLeft className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                                {prevEvent.title.length > 24
                                    ? prevEvent.title.slice(0, 24) + "…"
                                    : prevEvent.title}
                            </span>
                        </button>
                        <button
                            onClick={() => goTo(activeIndex + 1)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 text-xs text-zinc-400 hover:text-white transition-colors bg-white/5 max-w-[180px]"
                        >
                            <span className="truncate">
                                {nextEvent.title.length > 24
                                    ? nextEvent.title.slice(0, 24) + "…"
                                    : nextEvent.title}
                            </span>
                            <ChevronRight className="w-3 h-3 shrink-0" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});
