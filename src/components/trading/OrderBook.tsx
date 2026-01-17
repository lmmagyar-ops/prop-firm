"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatOrderBookPrice, formatOrderBookSize } from "@/lib/formatters";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

/**
 * OrderBook - Professional-grade order book with depth visualization
 * 
 * Anthropic Engineering Standards:
 * - Order clustering for cleaner display
 * - Spread indicator with color coding
 * - Cumulative depth bars
 * - Real-time updates with stale indicator
 */

interface OrderBookProps {
    tokenId?: string;
    marketPrice?: number;
    outcome?: "YES" | "NO";
}

interface OrderLevel {
    price: string;
    size: string;
}

interface ClusteredLevel {
    price: number;
    size: number;
    cumulative: number;
    orders: number;
}

/**
 * Cluster orders by price level (rounds to nearest cent)
 */
function clusterOrders(levels: OrderLevel[], ascending = true): ClusteredLevel[] {
    const clusters = new Map<number, { size: number; orders: number }>();

    levels.forEach(level => {
        const price = Math.round(parseFloat(level.price) * 100) / 100; // Round to cents
        const size = parseFloat(level.size);

        if (clusters.has(price)) {
            const existing = clusters.get(price)!;
            existing.size += size;
            existing.orders += 1;
        } else {
            clusters.set(price, { size, orders: 1 });
        }
    });

    // Convert to array and sort
    const sorted = Array.from(clusters.entries())
        .map(([price, data]) => ({ price, ...data, cumulative: 0 }))
        .sort((a, b) => ascending ? a.price - b.price : b.price - a.price);

    // Calculate cumulative sizes
    let cumulative = 0;
    sorted.forEach(level => {
        cumulative += level.size;
        level.cumulative = cumulative;
    });

    return sorted.slice(0, 8); // Limit to 8 levels for clean display
}

/**
 * Spread indicator component
 */
function SpreadIndicator({ spread, midPrice }: { spread: number; midPrice: number }) {
    const spreadCents = spread * 100;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

    // Color based on spread tightness
    const spreadColor = spreadCents <= 1
        ? "text-emerald-400"
        : spreadCents <= 3
            ? "text-yellow-400"
            : "text-rose-400";

    return (
        <div className="flex items-center justify-center gap-3 py-2 border-y border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs text-zinc-500">Spread:</span>
                <span className={cn("text-xs font-mono font-medium", spreadColor)}>
                    {spreadCents.toFixed(1)}¢
                </span>
                <span className="text-xs text-zinc-600">
                    ({spreadPercent.toFixed(2)}%)
                </span>
            </div>
            <div className="w-px h-3 bg-zinc-700" />
            <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">Mid:</span>
                <span className="text-xs font-mono text-white">
                    {(midPrice * 100).toFixed(1)}¢
                </span>
            </div>
        </div>
    );
}

/**
 * Single order level row with depth bar
 */
function OrderRow({
    level,
    maxCumulative,
    isBid
}: {
    level: ClusteredLevel;
    maxCumulative: number;
    isBid: boolean;
}) {
    const depthPercent = maxCumulative > 0 ? (level.cumulative / maxCumulative) * 100 : 0;
    const sizePercent = maxCumulative > 0 ? (level.size / maxCumulative) * 100 : 0;

    return (
        <div className="relative flex items-center py-1.5 px-2 text-xs group hover:bg-white/5 transition-colors">
            {/* Depth bar (cumulative) */}
            <div
                className={cn(
                    "absolute inset-y-0 opacity-10",
                    isBid ? "left-0 bg-emerald-500" : "right-0 bg-rose-500"
                )}
                style={{
                    width: `${depthPercent}%`,
                    [isBid ? 'left' : 'right']: 0
                }}
            />

            {/* Size bar (for this level) */}
            <div
                className={cn(
                    "absolute inset-y-0 opacity-25",
                    isBid ? "left-0 bg-emerald-500" : "right-0 bg-rose-500"
                )}
                style={{
                    width: `${sizePercent}%`,
                    [isBid ? 'left' : 'right']: 0
                }}
            />

            {/* Content */}
            <div className="relative flex-1 flex justify-between items-center">
                <span className={cn(
                    "font-mono",
                    isBid ? "text-emerald-400" : "text-rose-400"
                )}>
                    {(level.price * 100).toFixed(1)}¢
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-zinc-400 font-mono">
                        {level.size >= 1000
                            ? `${(level.size / 1000).toFixed(1)}K`
                            : level.size.toFixed(0)}
                    </span>
                    {level.orders > 1 && (
                        <span className="text-zinc-600 text-[10px]">
                            ({level.orders})
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export function OrderBook({ tokenId, marketPrice, outcome }: OrderBookProps) {
    const [bids, setBids] = useState<OrderLevel[]>([]);
    const [asks, setAsks] = useState<OrderLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    useEffect(() => {
        if (!tokenId || !isOpen) return;

        const fetchBook = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/orderbook?token_id=${tokenId}`);
                const data = await res.json();
                setBids(data.bids || []);
                setAsks(data.asks || []);
                setLastUpdate(new Date());
            } catch (error) {
                console.error("[OrderBook] Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBook();
        const interval = setInterval(fetchBook, 10000); // Faster refresh
        return () => clearInterval(interval);
    }, [tokenId, isOpen]);

    // Cluster and process orders
    const clusteredBids = useMemo(() => clusterOrders(bids, false), [bids]);
    const clusteredAsks = useMemo(() => clusterOrders(asks, true), [asks]);

    // Calculate spread and mid price
    const bestBid = clusteredBids[0]?.price ?? 0;
    const bestAsk = clusteredAsks[0]?.price ?? 1;
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;

    // Max cumulative for bar scaling
    const maxCumulative = Math.max(
        clusteredBids[clusteredBids.length - 1]?.cumulative ?? 0,
        clusteredAsks[clusteredAsks.length - 1]?.cumulative ?? 0,
        1
    );

    // Stale data indicator
    const isStale = lastUpdate && (Date.now() - lastUpdate.getTime()) > 30000;

    return (
        <details
            className="group border-t border-white/5"
            open={isOpen}
            onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
        >
            <summary className="px-6 py-4 flex items-center justify-between cursor-pointer text-sm font-semibold text-white hover:bg-white/5 transition-colors">
                <span className="flex items-center gap-2">
                    Order Book
                    {isOpen && !loading && clusteredBids.length > 0 && (
                        <span className={cn(
                            "flex items-center gap-1 text-xs font-normal",
                            isStale ? "text-yellow-500" : "text-zinc-500"
                        )}>
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isStale ? "bg-yellow-500" : "bg-emerald-500 animate-pulse"
                            )} />
                            Live
                        </span>
                    )}
                </span>
                <svg className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </summary>

            <div className="pb-4">
                {!tokenId ? (
                    <div className="text-center py-4 text-sm text-zinc-500 px-6">
                        Select a market to view order book
                    </div>
                ) : loading && bids.length === 0 ? (
                    <div className="text-center py-4 text-sm text-zinc-500 px-6">
                        Loading...
                    </div>
                ) : clusteredBids.length === 0 && clusteredAsks.length === 0 ? (
                    <div className="text-center py-4 text-sm text-zinc-500 px-6">
                        No orders available
                    </div>
                ) : (
                    <>
                        {/* Header Row */}
                        <div className="grid grid-cols-2 gap-4 px-6 mb-2">
                            <div className="flex justify-between text-xs text-zinc-500 font-medium px-2">
                                <span className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                                    BID
                                </span>
                                <span>SIZE</span>
                            </div>
                            <div className="flex justify-between text-xs text-zinc-500 font-medium px-2">
                                <span className="flex items-center gap-1">
                                    <TrendingDown className="w-3 h-3 text-rose-500" />
                                    ASK
                                </span>
                                <span>SIZE</span>
                            </div>
                        </div>

                        {/* Order Levels */}
                        <div className="grid grid-cols-2 gap-4 px-6">
                            {/* Bids */}
                            <div>
                                {clusteredBids.map((level, i) => (
                                    <OrderRow
                                        key={i}
                                        level={level}
                                        maxCumulative={maxCumulative}
                                        isBid={true}
                                    />
                                ))}
                            </div>

                            {/* Asks */}
                            <div>
                                {clusteredAsks.map((level, i) => (
                                    <OrderRow
                                        key={i}
                                        level={level}
                                        maxCumulative={maxCumulative}
                                        isBid={false}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Spread Indicator */}
                        <div className="mt-3 mx-6">
                            <SpreadIndicator spread={spread} midPrice={midPrice} />
                        </div>
                    </>
                )}
            </div>
        </details>
    );
}
