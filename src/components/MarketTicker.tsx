"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getActiveEvents } from "@/app/actions/market";

interface TickerMarket {
    symbol: string;
    price: number;
}

/**
 * MarketTicker — Scrolling ticker showing REAL market prices from Redis.
 *
 * Fetches top 10 markets by volume via getActiveEvents() server action.
 * Returns null if no data is available (honest empty state).
 */
export function MarketTicker() {
    const [markets, setMarkets] = useState<TickerMarket[]>([]);

    useEffect(() => {
        async function fetchMarkets() {
            try {
                const events = await getActiveEvents("polymarket");

                const tickerData = events
                    .sort((a, b) => b.volume - a.volume)
                    .slice(0, 10)
                    .map(event => {
                        const price = event.markets[0]?.price ?? 0;
                        const symbol = event.title.length > 30
                            ? event.title.substring(0, 28) + "…"
                            : event.title;
                        return { symbol, price };
                    })
                    .filter(m => m.price > 0 && m.price < 1);

                setMarkets(tickerData);
            } catch (error) {
                console.error("[MarketTicker] Failed to fetch events:", error);
            }
        }

        fetchMarkets();
    }, []);

    // No data = no ticker (honest empty state)
    if (markets.length === 0) return null;

    return (
        <div className="w-full bg-black/80 border-y border-white/5 backdrop-blur-md overflow-hidden py-3 flex items-center relative z-40">
            {/* Gradient Fades */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10" />

            <motion.div
                className="flex items-center gap-12 whitespace-nowrap"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 30,
                }}
            >
                {/* Double for seamless loop */}
                {[...markets, ...markets].map((market, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <span className="font-bold text-zinc-400 text-sm tracking-wider">
                            {market.symbol}
                        </span>
                        <span className="font-mono font-bold text-sm text-white">
                            {Math.round(market.price * 100)}¢
                        </span>
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
