"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

const MARKETS = [
    { symbol: "BTC/USD", price: 96420.50, change: 2.4, isUp: true },
    { symbol: "ETH/USD", price: 3450.12, change: -1.2, isUp: false },
    { symbol: "SOL/USD", price: 145.20, change: 5.8, isUp: true },
    { symbol: "TRUMP 2024", price: 0.52, change: 1.1, isUp: true },
    { symbol: "FED RATE CUT", price: 0.85, change: 0.0, isUp: true },
    { symbol: "BITCOIN > 100K", price: 0.33, change: -4.5, isUp: false },
    { symbol: "TSLA/USD", price: 240.50, change: 1.5, isUp: true },
    { symbol: "NVDA/USD", price: 950.00, change: 3.2, isUp: true },
];

export function MarketTicker() {
    return (
        <div className="w-full bg-black/80 border-y border-white/5 backdrop-blur-md overflow-hidden py-3 flex items-center relative z-40">
            {/* Gradient Fades for Smooth Edges */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10" />

            <motion.div
                className="flex items-center gap-12 whitespace-nowrap"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 30, // Adjust speed here
                }}
            >
                {/* Double the list for seamless loop */}
                {[...MARKETS, ...MARKETS].map((market, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <span className="font-bold text-zinc-400 text-sm tracking-wider">{market.symbol}</span>
                        <span className={`font-mono font-bold text-sm ${market.isUp ? "text-green-400" : "text-red-400"}`}>
                            ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <div className={`flex items-center text-xs ml-1 ${market.isUp ? "text-green-500/80" : "text-red-500/80"}`}>
                            {market.isUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {Math.abs(market.change)}%
                        </div>
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
