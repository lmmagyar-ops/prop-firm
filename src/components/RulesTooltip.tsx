"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Info, Shield, Target, AlertTriangle, Scale } from "lucide-react";
import { useState } from "react";

export function RulesTooltip() {
    const [isOpen, setIsOpen] = useState(false);

    const rules = [
        {
            icon: Target,
            color: "text-green-500",
            title: "Profit Target",
            value: "10%",
            desc: "Reach $11,000 equity (for $10k account)"
        },
        {
            icon: Shield,
            color: "text-blue-500",
            title: "Max Drawdown",
            value: "8%",
            desc: "Static limit. No trailing nonsense."
        },
        {
            icon: AlertTriangle,
            color: "text-red-500",
            title: "Max Daily Loss",
            value: "4%",
            desc: "Measured from start-of-day balance."
        },
        {
            icon: Scale,
            color: "text-purple-500",
            title: "Consistency",
            value: "30%",
            desc: "Max allowable profit from a single day."
        }
    ];

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium mt-4 group">
                <Info className="w-4 h-4 group-hover:text-blue-500 transition-colors" />
                View Trading Rules
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[340px] z-50 pointer-events-none"
                    >
                        <div className="bg-[#0f1115]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-5 overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Evaluation Parameters</h3>
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono">PHASE 1</span>
                            </div>

                            {/* Rules Grid */}
                            <div className="space-y-4">
                                {rules.map((rule, i) => (
                                    <div key={i} className="flex items-start gap-4 group/item">
                                        <div className={`p-2 rounded-lg bg-zinc-900 border border-white/5 ${rule.color.replace('text-', 'bg-')}/10 shrink-0`}>
                                            <rule.icon className={`w-4 h-4 ${rule.color}`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-bold">{rule.value}</span>
                                                <span className="text-zinc-500 text-xs font-semibold uppercase">{rule.title}</span>
                                            </div>
                                            <p className="text-zinc-400 text-xs mt-0.5 leading-snug">
                                                {rule.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer Gradient Line */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />
                        </div>

                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-2 border-8 border-transparent border-t-[#0f1115]/95 blur-[1px]" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
