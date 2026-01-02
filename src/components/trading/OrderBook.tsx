"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OrderBookProps {
    tokenId?: string;
    marketPrice?: number;
    outcome?: "YES" | "NO";
}

interface OrderLevel {
    price: string;
    size: string;
}

/**
 * OrderBook - Displays bid/ask depth from Polymarket CLOB
 * Fetches live data when tokenId is provided, otherwise shows empty state
 */
export function OrderBook({ tokenId, marketPrice, outcome }: OrderBookProps) {
    const [bids, setBids] = useState<OrderLevel[]>([]);
    const [asks, setAsks] = useState<OrderLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!tokenId || !isOpen) return;

        const fetchBook = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/orderbook?token_id=${tokenId}`);
                const data = await res.json();
                setBids(data.bids || []);
                setAsks(data.asks || []);
            } catch (error) {
                console.error("[OrderBook] Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBook();
        // Refresh every 10 seconds while open
        const interval = setInterval(fetchBook, 10000);
        return () => clearInterval(interval);
    }, [tokenId, isOpen]);

    const formatPrice = (price: string) => {
        const p = parseFloat(price);
        return `${(p * 100).toFixed(1)}¢`;
    };

    const formatSize = (size: string) => {
        const s = parseFloat(size);
        if (s >= 1_000_000) return `${(s / 1_000_000).toFixed(1)}M`;
        if (s >= 1_000) return `${(s / 1_000).toFixed(1)}K`;
        return s.toFixed(0);
    };

    // Calculate max size for bar widths
    const maxSize = Math.max(
        ...bids.map(b => parseFloat(b.size)),
        ...asks.map(a => parseFloat(a.size)),
        1
    );

    // Calculate spread
    const bestBid = bids[0] ? parseFloat(bids[0].price) : 0;
    const bestAsk = asks[0] ? parseFloat(asks[0].price) : 1;
    const spread = bestAsk - bestBid;

    return (
        <details
            className="group border-t border-white/5"
            open={isOpen}
            onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
        >
            <summary className="px-6 py-4 flex items-center justify-between cursor-pointer text-sm font-semibold text-white hover:bg-white/5 transition-colors">
                <span className="flex items-center gap-2">
                    Order Book
                    <span className="text-xs text-zinc-500 font-normal">
                        {isOpen && !loading && bids.length > 0 ? `Spread: ${(spread * 100).toFixed(1)}¢` : "(Live)"}
                    </span>
                </span>
                <svg className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </summary>

            <div className="px-6 pb-4">
                {!tokenId ? (
                    <div className="text-center py-4 text-sm text-zinc-500">Select a market to view order book</div>
                ) : loading && bids.length === 0 ? (
                    <div className="text-center py-4 text-sm text-zinc-500">Loading...</div>
                ) : bids.length === 0 && asks.length === 0 ? (
                    <div className="text-center py-4 text-sm text-zinc-500">No orders available</div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {/* Bids (Buy Orders - Green) */}
                        <div>
                            <div className="flex justify-between text-xs text-zinc-500 font-medium mb-2 px-1">
                                <span>BID</span>
                                <span>SIZE</span>
                            </div>
                            {bids.map((bid, i) => (
                                <div key={i} className="relative flex justify-between items-center py-1.5 px-2 text-xs">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-emerald-500/15 rounded"
                                        style={{ width: `${(parseFloat(bid.size) / maxSize) * 100}%` }}
                                    />
                                    <span className="relative text-emerald-400 font-mono">{formatPrice(bid.price)}</span>
                                    <span className="relative text-zinc-400 font-mono">{formatSize(bid.size)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Asks (Sell Orders - Red) */}
                        <div>
                            <div className="flex justify-between text-xs text-zinc-500 font-medium mb-2 px-1">
                                <span>ASK</span>
                                <span>SIZE</span>
                            </div>
                            {asks.map((ask, i) => (
                                <div key={i} className="relative flex justify-between items-center py-1.5 px-2 text-xs">
                                    <div
                                        className="absolute inset-y-0 right-0 bg-rose-500/15 rounded"
                                        style={{ width: `${(parseFloat(ask.size) / maxSize) * 100}%` }}
                                    />
                                    <span className="relative text-rose-400 font-mono">{formatPrice(ask.price)}</span>
                                    <span className="relative text-zinc-400 font-mono">{formatSize(ask.size)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </details>
    );
}
