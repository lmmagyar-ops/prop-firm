"use client";

import { motion } from "framer-motion";
import { Zap, Clock, TrendingUp } from "lucide-react";

const NEWS_ITEMS = [
    { type: "urgent", text: "LIVE: Fed Interest Rate Decision in 14m", icon: Zap },
    { type: "info", text: "BTC/USD Breaches $100k - High Volatility Expected", icon: TrendingUp },
    { type: "market", text: "NFP Release Tomorrow 08:30 EST", icon: Clock },
    { type: "active", text: "4,202 Traders Active Right Now", icon: TrendingUp },
];

export function NewsTickerBar() {
    return (
        <div className="relative z-[60] bg-[#29af73] text-white text-[10px] md:text-xs font-bold py-1.5 overflow-hidden border-b border-[#29af73]/20">
            <div className="flex whitespace-nowrap">
                <motion.div
                    animate={{ x: [0, -1000] }}
                    transition={{
                        repeat: Infinity,
                        duration: 20,
                        ease: "linear"
                    }}
                    className="flex items-center gap-8 md:gap-16"
                >
                    {[...NEWS_ITEMS, ...NEWS_ITEMS, ...NEWS_ITEMS].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                            {item.type === "urgent" && (
                                <span className="relative flex h-2 w-2 mr-1">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                            )}
                            <item.icon className="w-3 h-3 opacity-80" />
                            <span className="uppercase tracking-wider">{item.text}</span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
