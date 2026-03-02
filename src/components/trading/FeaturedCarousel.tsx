"use client";

import { useState, useMemo, useCallback, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import { formatPrice, formatVolume } from "@/lib/formatters";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EventMetadata } from "@/app/actions/market";

interface FeaturedCarouselProps {
    events: EventMetadata[];
    onEventClick: (event: EventMetadata) => void;
    onTrade: (marketId: string, side: "yes" | "no") => void;
}

const CAROUSEL_SIZE = 6;
/** Skip near-resolved markets — these are effectively over */
const RESOLVED_THRESHOLD_HIGH = 0.95;
const RESOLVED_THRESHOLD_LOW = 0.05;

/** Returns true when a market is "interesting" (not near-resolved) */
function isInteresting(event: EventMetadata): boolean {
    if (event.markets.length > 1) return true; // multi-outcome always interesting
    const price = event.markets[0]?.price;
    if (price == null) return true;
    return price > RESOLVED_THRESHOLD_LOW && price < RESOLVED_THRESHOLD_HIGH;
}

/**
 * Probability area chart — SVG gradient fill proportional to price.
 * Creates a visual "chart-like" element even without historical data.
 */
function ProbabilityChart({ price, color }: { price: number; color: string }) {
    const pct = Math.max(2, Math.min(98, price * 100));
    const id = `gradient-${Math.round(price * 10000)}`;

    return (
        <div className="relative w-full h-24 rounded-lg overflow-hidden bg-white/[0.02]">
            <svg
                viewBox="0 0 400 100"
                preserveAspectRatio="none"
                className="w-full h-full"
            >
                <defs>
                    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop
                            offset="0%"
                            stopColor={color}
                            stopOpacity="0.3"
                        />
                        <stop
                            offset="100%"
                            stopColor={color}
                            stopOpacity="0.02"
                        />
                    </linearGradient>
                </defs>
                {/* Filled area */}
                <path
                    d={`M0,${100 - pct} C100,${100 - pct * 0.9} 200,${100 - pct * 1.05} 300,${100 - pct * 0.95} L400,${100 - pct} L400,100 L0,100 Z`}
                    fill={`url(#${id})`}
                />
                {/* Line on top */}
                <path
                    d={`M0,${100 - pct} C100,${100 - pct * 0.9} 200,${100 - pct * 1.05} 300,${100 - pct * 0.95} L400,${100 - pct}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                {/* 50% gridline */}
                <line
                    x1="0"
                    y1="50"
                    x2="400"
                    y2="50"
                    stroke="white"
                    strokeOpacity="0.05"
                    strokeDasharray="4 4"
                />
            </svg>
            {/* Y-axis labels */}
            <span className="absolute top-1 right-2 text-[10px] text-zinc-600 tabular-nums">
                100%
            </span>
            <span className="absolute top-1/2 -translate-y-1/2 right-2 text-[10px] text-zinc-600 tabular-nums">
                50%
            </span>
            <span className="absolute bottom-1 right-2 text-[10px] text-zinc-600 tabular-nums">
                0%
            </span>
        </div>
    );
}

/** Clean up sub-market question to just the outcome name */
function getOutcomeName(m: { question?: string; outcomes?: string[] }, eventTitle: string): string {
    if (m.question) {
        let cleaned = m.question;
        // Strip common prefixes: "Event Title - ", "Will X win..."
        cleaned = cleaned.replace(eventTitle + " - ", "");
        cleaned = cleaned.replace("Will ", "");
        cleaned = cleaned.replace(" win the ", " ");
        cleaned = cleaned.replace("?", "");
        // Strip event title words that repeat in the outcome
        // e.g. "Spain 2026 FIFA World Cup" → "Spain" when title is "2026 FIFA World Cup Winner"
        const titleWords = eventTitle.toLowerCase().split(/\s+/);
        const parts = cleaned.split(/\s+/);
        const filtered = parts.filter(w => !titleWords.includes(w.toLowerCase()));
        if (filtered.length > 0 && filtered.length < parts.length) {
            cleaned = filtered.join(" ");
        }
        if (cleaned.length > 0 && cleaned.length < 50) return cleaned;
    }
    return m.outcomes?.[0] ?? "Yes";
}

/**
 * FeaturedCarousel — Polymarket-style hero carousel.
 * Taller card with probability chart, multi-outcome runners, and trade buttons.
 * Filters out near-resolved markets (>95% / <5%).
 */
export const FeaturedCarousel = memo(function FeaturedCarousel({
    events,
    onEventClick,
    onTrade,
}: FeaturedCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    // Top events by 24h volume, excluding near-resolved
    const featured = useMemo(() => {
        return [...events]
            .filter(isInteresting)
            .sort((a, b) => (b.volume24hr ?? b.volume ?? 0) - (a.volume24hr ?? a.volume ?? 0))
            .slice(0, CAROUSEL_SIZE);
    }, [events]);

    const total = featured.length;

    const goTo = useCallback(
        (idx: number) => setActiveIndex(((idx % total) + total) % total),
        [total]
    );

    // Clamp activeIndex when featured list shrinks
    useEffect(() => {
        if (total > 0 && activeIndex >= total) {
            setActiveIndex(0);
        }
    }, [total, activeIndex]);

    if (total === 0) return null;

    const safeIndex = Math.min(activeIndex, total - 1);
    const event = featured[safeIndex];
    const prevEvent = featured[((safeIndex - 1) % total + total) % total];
    const nextEvent = featured[(safeIndex + 1) % total];
    const isMulti = event.markets.length > 1;

    // Leading market for binary, or top runner for multi
    const topMarket = isMulti
        ? event.markets.reduce((a, b) => (b.price ?? 0) > (a.price ?? 0) ? b : a)
        : event.markets[0];
    const primaryPrice = topMarket?.price ?? 0.5;
    const priceColor = primaryPrice >= 0.5 ? "#00C896" : "#E63E5D";

    return (
        <div className="space-y-2">
            {/* Section label */}
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Featured</span>

            {/* Main Carousel Card */}
            <div
                className="relative bg-gradient-to-b from-zinc-900/80 to-zinc-900/60 border border-white/[0.08] rounded-2xl overflow-hidden cursor-pointer group hover:border-white/15 transition-all shadow-lg shadow-black/25"
                onClick={() => onEventClick(event)}
            >
                {/* Title + Image — tight top section */}
                <div className="px-5 pt-5 pb-1 flex items-start gap-3.5">
                    {event.image && (
                        <Image
                            src={event.image}
                            alt=""
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                        />
                    )}
                    <h2 className="text-xl font-bold text-white leading-snug line-clamp-2 group-hover:text-white/90 transition-colors flex-1">
                        {event.title}
                    </h2>
                </div>

                {/* Content area */}
                <div className="px-5 py-3">
                    {isMulti ? (
                        /* Multi-outcome: probability bars — the visual IS the data */
                        <div className="space-y-1">
                            {[...event.markets]
                                .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
                                .slice(0, 6)
                                .map((m, idx) => {
                                    const p = m.price ?? 0;
                                    const pct = Math.max(1, Math.round(p * 100));
                                    const isLeader = idx === 0;
                                    const barColor = isLeader
                                        ? "bg-emerald-500/30"
                                        : p >= 0.10
                                            ? "bg-white/[0.12]"
                                            : "bg-white/[0.06]";
                                    return (
                                        <div
                                            key={m.id}
                                            className="relative flex items-center h-10 rounded-lg overflow-hidden bg-white/[0.03]"
                                        >
                                            {/* Probability fill bar */}
                                            <div
                                                className={cn(
                                                    "absolute inset-y-0 left-0 rounded-lg transition-all duration-500",
                                                    barColor
                                                )}
                                                style={{ width: `${Math.max(pct, 8)}%` }}
                                            />
                                            {/* Label — secondary */}
                                            <span className="relative z-10 text-xs text-zinc-400 pl-3 flex-1 min-w-0 truncate">
                                                {getOutcomeName(m, event.title)}
                                            </span>
                                            {/* Percentage — hero */}
                                            <span className={cn(
                                                "relative z-10 text-base font-bold tabular-nums pr-3 whitespace-nowrap",
                                                isLeader ? "text-emerald-400" : "text-white"
                                            )}>
                                                {pct}%
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    ) : (
                        /* Binary: confident single number + chart */
                        <div className="space-y-3">
                            <div className="flex items-baseline gap-2">
                                <span
                                    className="text-4xl font-black tabular-nums"
                                    style={{ color: priceColor }}
                                >
                                    {formatPrice(primaryPrice)}
                                </span>
                                <span className="text-sm text-zinc-500">
                                    chance
                                </span>
                            </div>
                            <ProbabilityChart
                                price={primaryPrice}
                                color={priceColor}
                            />
                        </div>
                    )}
                </div>

                {/* Trade buttons — only for binary (multi-outcome: card IS the button) */}
                {!isMulti && topMarket && (
                    <div className="px-5 pb-4 flex gap-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onTrade(topMarket.id, "yes");
                            }}
                            className="flex-1 py-2.5 rounded-lg bg-[#00C896]/10 hover:bg-[#00C896]/20 text-[#00C896] font-bold text-sm transition-colors border border-[#00C896]/30 hover:border-[#00C896]/60"
                        >
                            Yes
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onTrade(topMarket.id, "no");
                            }}
                            className="flex-1 py-2.5 rounded-lg bg-[#E63E5D]/10 hover:bg-[#E63E5D]/20 text-[#E63E5D] font-bold text-sm transition-colors border border-[#E63E5D]/30 hover:border-[#E63E5D]/60"
                        >
                            No
                        </button>
                    </div>
                )}

                {/* Social proof chip */}
                <div className="px-5 pb-4">
                    <span className="inline-flex items-center text-xs text-zinc-400 tabular-nums bg-white/[0.05] px-2.5 py-1 rounded-md">
                        {formatVolume(event.volume24hr ?? event.volume ?? 0)} Vol
                    </span>
                </div>
            </div>

            {/* Carousel Controls: Dots + Pills + Explore All */}
            <div className="flex items-center gap-3">
                {/* Dots */}
                <div className="flex items-center gap-1.5">
                    {featured.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            className={cn(
                                "transition-all duration-200 rounded-full",
                                safeIndex === i
                                    ? "w-6 h-2 bg-white"
                                    : "w-2 h-2 bg-white/20 hover:bg-white/40"
                            )}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>

                <div className="flex-1" />

                {/* Prev/Next Pills — hidden on mobile to prevent overflow */}
                {total > 1 && (
                    <div className="hidden md:flex items-center gap-2">
                        <button
                            onClick={() => goTo(safeIndex - 1)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 text-xs text-zinc-400 hover:text-white transition-colors bg-white/5 max-w-[180px]"
                        >
                            <ChevronLeft className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                                {prevEvent.title.length > 22
                                    ? prevEvent.title.slice(0, 22) + "…"
                                    : prevEvent.title}
                            </span>
                        </button>
                        <button
                            onClick={() => goTo(safeIndex + 1)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 text-xs text-zinc-400 hover:text-white transition-colors bg-white/5 max-w-[180px]"
                        >
                            <span className="truncate">
                                {nextEvent.title.length > 22
                                    ? nextEvent.title.slice(0, 22) + "…"
                                    : nextEvent.title}
                            </span>
                            <ChevronRight className="w-3 h-3 shrink-0" />
                        </button>
                    </div>
                )}

                {/* Explore All — inline with nav, like Polymarket */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById("all-markets")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="px-4 py-1.5 rounded-full border border-white/10 hover:border-white/20 text-xs text-zinc-400 hover:text-white transition-colors bg-white/5"
                >
                    Explore all
                </button>
            </div>
        </div >
    );
});
