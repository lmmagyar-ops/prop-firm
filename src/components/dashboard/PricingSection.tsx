"use client";

import { useState } from "react";
import { PLANS } from "@/config/plans";
import { Check, ChevronRight, HelpCircle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const STEPS = [
    { number: 1, text: "Hit Profit Target (10%)" },
    { number: 2, text: "Trade Min 5 Days" },
    { number: 3, text: "Request Your Payout" }
];

function LearnHowTooltip() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative inline-block ml-2">
            <button
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2E3A52]/30 hover:bg-[#2E3A52] border border-[#2E3A52] text-xs font-bold text-[#2E81FF] transition-all cursor-help"
            >
                <HelpCircle className="w-3 h-3" />
                Learn How
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-5 bg-[#0F1218]/95 backdrop-blur-xl border border-[#2E3A52] rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
                    >
                        {/* Gradient Border Top */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2E81FF] to-cyan-400" />

                        <div className="space-y-4 relative z-10">
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">3 Steps to Funding</p>
                            {STEPS.map((step) => (
                                <div key={step.number} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#2E81FF]/20 text-[#2E81FF] text-xs font-bold flex items-center justify-center border border-[#2E81FF]/30">
                                        {step.number}
                                    </div>
                                    <span className="text-sm text-zinc-200 font-medium">{step.text}</span>
                                </div>
                            ))}
                        </div>

                        {/* Arrow */}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0F1218] border-b border-r border-[#2E3A52] rotate-45 transform" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function PricingSection() {
    // Map config plans to display format
    const TIERS = [
        {
            key: "scout" as const,
            name: "SCOUT",
            subtext: "For Beginners",
            sizeDisplay: "5K",
            desc: "Perfect for learning market mechanics with minimal risk.",
            popular: false,
            gradient: "from-blue-500/20 to-cyan-500/5",
            border: "group-hover:border-blue-500/50"
        },
        {
            key: "grinder" as const,
            name: "GRINDER",
            subtext: "Most Popular",
            sizeDisplay: "10K",
            desc: "The standard for serious traders looking to scale up.",
            popular: true,
            gradient: "from-violet-500/20 to-fuchsia-500/5",
            border: "border-[#2E81FF]/50"
        },
        {
            key: "executive" as const,
            name: "EXECUTIVE",
            subtext: "Pro Level",
            sizeDisplay: "25K",
            desc: "Maximum capital for experienced market operators.",
            popular: false,
            gradient: "from-emerald-500/20 to-teal-500/5",
            border: "group-hover:border-emerald-500/50"
        }
    ];

    return (
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 mb-20">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                    Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E81FF] to-cyan-400">Evaluations.</span>
                </h2>
                <p className="text-zinc-400 text-lg font-medium">
                    Choose your path to professional capital
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start">
                {TIERS.map((tierData) => {
                    const plan = PLANS[tierData.key];
                    const isPopular = tierData.popular;

                    return (
                        <motion.div
                            key={tierData.key}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: isPopular ? 0.1 : 0.2 }}
                            className={`relative group flex flex-col ${isPopular ? 'md:-mt-4 md:mb-4 z-10' : ''}`}
                        >
                            {/* Card Background & Border */}
                            <div className={`
                                relative flex flex-col h-full rounded-[2.5rem] overflow-hidden transition-all duration-300
                                bg-[#0F1218]/80 backdrop-blur-xl border border-[#2E3A52]
                                ${isPopular ? 'shadow-[0_0_80px_-20px_rgba(46,129,255,0.3)] ring-1 ring-[#2E81FF]/50' : 'hover:border-zinc-600 hover:shadow-2xl'}
                            `}>

                                {/* Inner Gradient */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${tierData.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                                {/* Popular Badge */}
                                {isPopular && (
                                    <div className="absolute top-0 right-0 left-0 flex justify-center -mt-3">
                                        <div className="px-4 py-1.5 rounded-full bg-[#2E81FF] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/50 border border-white/10">
                                            Most Popular
                                        </div>
                                    </div>
                                )}

                                <div className="relative p-8 md:p-10 flex flex-col h-full">

                                    {/* Header */}
                                    <div className="text-center space-y-2 mb-8">
                                        <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                                            {tierData.name}
                                        </div>
                                        <div className="text-6xl font-black text-white tracking-tighter">
                                            {tierData.sizeDisplay}
                                        </div>
                                        <p className="text-zinc-500 text-xs font-medium max-w-[180px] mx-auto leading-relaxed">
                                            {tierData.desc}
                                        </p>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-full h-px bg-white/5 mb-8" />

                                    {/* Features */}
                                    <div className="flex-1 space-y-5 mb-10">
                                        <div className="flex items-start justify-between">
                                            <span className="text-zinc-400 text-sm font-medium">Profit Target</span>
                                            <span className="text-white font-bold text-sm text-right">
                                                ${plan.profitTarget.toLocaleString()} <span className="text-[#2E81FF]">(10%)</span>
                                            </span>
                                        </div>
                                        <div className="flex items-start justify-between">
                                            <span className="text-zinc-400 text-sm font-medium">Drawdown</span>
                                            <span className="text-white font-bold text-sm text-right">6%</span>
                                        </div>
                                        <div className="flex items-start justify-between">
                                            <span className="text-zinc-400 text-sm font-medium">Daily Loss</span>
                                            <span className="text-white font-bold text-sm text-right">None</span>
                                        </div>
                                        <div className="flex items-start justify-between">
                                            <span className="text-zinc-400 text-sm font-medium">Min Days</span>
                                            <span className="text-white font-bold text-sm text-right">5 Days</span>
                                        </div>

                                        {/* Highlight Feature */}
                                        <div className="pt-4  flex items-center justify-between">
                                            <span className="text-zinc-300 text-sm font-bold">Profit Split</span>
                                            <span className="text-green-400 font-black text-base shadow-green-500/20 drop-shadow-sm">90%</span>
                                        </div>
                                        <div className="w-full bg-zinc-800/50 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-green-500 h-full w-[90%]" />
                                        </div>
                                    </div>

                                    {/* Tooltip & CTA */}
                                    <div className="mt-auto space-y-6">
                                        <div className="flex justify-center">
                                            <LearnHowTooltip />
                                        </div>

                                        <div className="text-center">
                                            <div className="flex items-baseline justify-center gap-1 mb-4">
                                                <span className="text-4xl font-black text-white tracking-tight">${plan.price}</span>
                                                <span className="text-zinc-500 text-sm font-medium">/ one-time</span>
                                            </div>

                                            <Link href={`/signup?plan=${tierData.key}`} className="block w-full">
                                                <Button
                                                    className={`w-full h-14 rounded-2xl text-base font-bold tracking-wide transition-all duration-300 border-none
                                                        ${isPopular
                                                            ? 'bg-[#2E81FF] hover:bg-[#2563EB] text-white hover:scale-[1.02] shadow-lg shadow-blue-600/20'
                                                            : 'bg-[#1A202C] hover:bg-white hover:text-black text-zinc-300'
                                                        }
                                                    `}
                                                >
                                                    Start Challenge <ChevronRight className="w-4 h-4 ml-1" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}
