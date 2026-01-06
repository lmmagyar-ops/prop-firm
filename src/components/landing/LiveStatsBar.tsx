"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Globe, TrendingUp, Zap, ArrowUpRight } from "lucide-react";

// Platform USPs (Honest Launch Stats)
const STATS = [
    {
        id: "markets",
        label: "Market Access",
        value: "24/7",
        icon: Globe,
        detail: "Global Event Trading"
    },
    {
        id: "scaling",
        label: "Growth Potential",
        value: "$4M+",
        icon: TrendingUp,
        detail: "Scale Your Capital"
    },
    {
        id: "payouts",
        label: "Payout Speed",
        value: "Daily",
        icon: Zap,
        detail: "Instant Crypto Withdrawals"
    }
];

export function LiveStatsBar() {
    return (
        <section className="relative z-20 border-y border-[#2E3A52]/50 bg-[#0B0E14]/80 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#2E3A52]/50">
                    {STATS.map((stat, index) => (
                        <div key={stat.id} className="py-6 md:px-8 first:pl-0 last:pr-0 flex items-center justify-between group cursor-default">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                                    <stat.icon className="w-4 h-4 text-[#2E81FF]" />
                                    {stat.label}
                                </div>
                                <div className="text-2xl md:text-3xl font-black text-white group-hover:text-[#2E81FF] transition-colors">
                                    {stat.value}
                                </div>
                                <div className="text-xs text-zinc-600 font-medium">
                                    {stat.detail}
                                </div>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileHover={{ opacity: 1, scale: 1 }}
                                className="w-8 h-8 rounded-full bg-[#2E81FF]/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <ArrowUpRight className="w-4 h-4 text-[#2E81FF]" />
                            </motion.div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
