"use client";

import { motion } from "framer-motion";
import { Check, TrendingUp, Shield, Trophy } from "lucide-react";

const LEVELS = [
    {
        amount: "$10,000",
        label: "Starter",
        profitTarget: "8%",
        features: ["Standard Spreads", "Basic Analytics"],
        color: "from-zinc-500 to-zinc-400",
        icon: Check
    },
    {
        amount: "$50,000",
        label: "Validator",
        profitTarget: "10%",
        features: ["Lower Commissions", "Payout in 24h"],
        color: "from-blue-500 to-blue-400",
        icon: TrendingUp
    },
    {
        amount: "$200,000",
        label: "Pro",
        profitTarget: "10%",
        features: ["Zero Commissions", "Dedicated Support"],
        color: "from-purple-500 to-purple-400",
        icon: Shield
    },
    {
        amount: "$1,000,000+",
        label: "Elite",
        profitTarget: "Custom",
        features: ["Institutional Feeds", "Private Slack", "Concierge Payouts"],
        color: "from-amber-400 to-yellow-300",
        icon: Trophy
    }
];

export function ScalingLadder() {
    return (
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-32 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#2E81FF]/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="relative text-center space-y-4 mb-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white leading-tight">
                        Scale Your Capital.
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E81FF] to-cyan-400">
                            Prove Your Edge.
                        </span>
                    </h2>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto mt-6">
                        Start small. Hit your targets. We'll double your capital every step of the way.
                    </p>
                </motion.div>
            </div>

            {/* Ladder Visual */}
            <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Connecting Line (Desktop) */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-zinc-800 via-[#2E81FF]/50 to-amber-500/50 -translate-y-1/2 -z-10" />

                {LEVELS.map((level, index) => (
                    <motion.div
                        key={level.amount}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.15 }}
                        whileHover={{ y: -10 }}
                        className="relative group"
                    >
                        {/* Card */}
                        <div className="h-full bg-[#131722]/80 backdrop-blur-sm border border-[#2E3A52] rounded-2xl p-6 hover:border-[#2E81FF]/50 transition-colors duration-300 flex flex-col items-center text-center">

                            {/* Icon Badge */}
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${level.color} flex items-center justify-center mb-6 shadow-lg shadow-black/50 group-hover:scale-110 transition-transform duration-300`}>
                                <level.icon className="w-6 h-6 text-white text-shadow-sm" />
                            </div>

                            {/* Amount */}
                            <h3 className="text-2xl font-black text-white mb-1">
                                {level.amount}
                            </h3>
                            <p className="text-[#2E81FF] font-bold text-sm uppercase tracking-wider mb-6">
                                {level.label}
                            </p>

                            {/* Features */}
                            <div className="space-y-3 w-full">
                                <div className="flex items-center justify-between text-sm py-2 border-b border-dashed border-zinc-800">
                                    <span className="text-zinc-500">Target</span>
                                    <span className="text-white font-mono font-bold">{level.profitTarget}</span>
                                </div>

                                <ul className="space-y-2 text-left mt-4">
                                    {level.features.map(feature => (
                                        <li key={feature} className="text-xs text-zinc-400 flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-[#2E81FF]" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Mobile Connector Line */}
                            {index !== LEVELS.length - 1 && (
                                <div className="md:hidden absolute bottom-[-24px] left-1/2 w-0.5 h-6 bg-[#2E3A52]" />
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
