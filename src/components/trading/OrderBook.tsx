
"use client";

import { useMemo } from "react";
import { generateOrderBook, type SimulatedOrderBook } from "@/lib/trading/orderbook-simulator";

interface OrderBookProps {
    marketPrice: number;
    outcome: "YES" | "NO";
}

export function OrderBook({ marketPrice, outcome }: OrderBookProps) {
    // Regenerate book roughly when marketPrice changes significantly
    // Using useMemo here is a bit "static" but sufficient for demo. 
    // Ideally, we'd jitter this periodically.

    const book = useMemo(() =>
        generateOrderBook(marketPrice, 8),
        [Math.round(marketPrice * 100) / 100] // Only regen if price changes by 1¢
    );

    // Max depth for bars calculation
    const maxTotal = Math.max(
        book.bids[book.bids.length - 1]?.total || 0,
        book.asks[book.asks.length - 1]?.total || 0
    );

    return (
        <div className="bg-zinc-900/30 rounded-lg overflow-hidden border border-zinc-900/50">
            {/* Header */}
            <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Order Book</h3>
                <p className="text-xs text-zinc-600 font-mono">
                    Spread: <span className="text-zinc-400">{(book.spread * 100).toFixed(1)}¢</span>
                </p>
            </div>

            {/* Order Book Table */}
            <div className="grid grid-cols-2 divide-x divide-zinc-800">
                {/* Bids (Buy / YES side typically? Or just Bids) */}
                <div className="flex flex-col">
                    <div className="p-2 bg-zinc-900/50 border-b border-zinc-800 grid grid-cols-2 text-xs font-bold text-zinc-500 uppercase">
                        <span>Bid</span>
                        <span className="text-right">Shares</span>
                    </div>
                    {book.bids.map((bid, i) => (
                        <div
                            key={i}
                            className="p-1 px-2 grid grid-cols-2 text-xs hover:bg-green-500/5 transition-colors relative h-7 items-center"
                        >
                            <div
                                className="absolute inset-y-0 right-0 bg-green-500/10"
                                style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                            />
                            <span className="relative z-10 font-mono text-green-400">{(bid.price * 100).toFixed(1)}¢</span>
                            <span className="relative z-10 font-mono text-zinc-400 text-right">{bid.shares.toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                {/* Asks (Sell / NO side) */}
                <div className="flex flex-col">
                    <div className="p-2 bg-zinc-900/50 border-b border-zinc-800 grid grid-cols-2 text-xs font-bold text-zinc-500 uppercase">
                        <span>Ask</span>
                        <span className="text-right">Shares</span>
                    </div>
                    {book.asks.map((ask, i) => (
                        <div
                            key={i}
                            className="p-1 px-2 grid grid-cols-2 text-xs hover:bg-red-500/5 transition-colors relative h-7 items-center"
                        >
                            <div
                                className="absolute inset-y-0 right-0 bg-red-500/10" // Bar grows from right for depth visual? Or left?
                                // Standard is bar grows from right to left? or full width?
                                // Let's make it grow from left for asks
                                style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                            />
                            <span className="relative z-10 font-mono text-red-500">{(ask.price * 100).toFixed(1)}¢</span>
                            <span className="relative z-10 font-mono text-zinc-400 text-right">{ask.shares.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
