"use client";

import { useState } from "react";
import { PLANS } from "@/config/plans";
import { CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
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
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2E3A52]/50 hover:bg-[#2E3A52] border border-[#2E3A52] text-xs font-bold text-[#2E81FF] transition-all cursor-help"
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
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-[#151B26] border border-[#2E3A52] rounded-xl shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                    >
                        {/* Gradient Border Top */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2E81FF] to-cyan-400" />

                        <div className="space-y-3 relative z-10">
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">3 Steps to Funding</p>
                            {STEPS.map((step) => (
                                <div key={step.number} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-[#2E81FF]/10 text-[#2E81FF] text-[10px] font-bold flex items-center justify-center border border-[#2E81FF]/20">
                                        {step.number}
                                    </div>
                                    <span className="text-sm text-zinc-200 font-medium">{step.text}</span>
                                </div>
                            ))}
                        </div>

                        {/* Arrow */}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#151B26] border-b border-r border-[#2E3A52] rotate-45 transform" />
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
            color: "text-blue-400",
            glow: "blue",
            btnColor: "bg-[#2E3A52]/50 hover:bg-white hover:text-black",
            popular: false
        },
        {
            key: "grinder" as const,
            name: "GRINDER",
            subtext: "Most Popular",
            sizeDisplay: "10K",
            desc: "The standard for serious traders looking to scale up.",
            color: "text-purple-400",
            glow: "purple",
            btnColor: "bg-gradient-to-r from-[#2E81FF] to-cyan-500 hover:brightness-110",
            popular: true
        },
        {
            key: "executive" as const,
            name: "EXECUTIVE",
            subtext: "Pro Level",
            sizeDisplay: "25K",
            desc: "Maximum capital for experienced market operators.",
            color: "text-emerald-400",
            glow: "emerald",
            btnColor: "bg-[#2E3A52]/50 hover:bg-white hover:text-black",
            popular: false
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

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
                {TIERS.map((tierData) => {
                    const plan = PLANS[tierData.key];
                    const isPopular = tierData.popular;

                    return (
                        <div
                            key={tierData.key}
                            className={`relative flex flex-col h-full bg-[#131722]/80 backdrop-blur-xl border ${isPopular ? 'border-[#2E81FF]/50 shadow-[0_0_50px_-10px_rgba(46,129,255,0.15)] scale-105 z-10' : 'border-[#2E3A52] hover:border-[#2E81FF]/30'} rounded-[32px] p-8 md:p-10 transition-all duration-300 group overflow-hidden`}
                        >
                            {/* Popular Badge */}
                            {isPopular && (
                                <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-[#2E81FF]/10 border border-[#2E81FF]/20 text-[#2E81FF] text-[10px] font-bold uppercase tracking-widest">
                                    Most Popular
                                </div>
                            )}

                            {/* Header */}
                            <div className="mb-8 text-center space-y-2">
                                <div className={`text-6xl font-black text-white tracking-tighter drop-shadow-lg`}>
                                    {tierData.sizeDisplay}
                                </div>
                                <div className={`text-sm font-bold uppercase tracking-[0.2em] ${tierData.color}`}>
                                    {tierData.name} Evaluation
                                </div>
                                <p className="text-zinc-500 text-sm font-medium pt-2 max-w-[200px] mx-auto leading-relaxed">
                                    {tierData.desc}
                                </p>
                            </div>

                            {/* Features Grid */}
                            <div className="flex-1 space-y-4 mb-10">
                                {/* Target */}
                                <div className="flex items-center gap-3 group/item">
                                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isPopular ? 'text-[#2E81FF]' : 'text-[#2E81FF]'}`} />
                                    <span className="text-zinc-300 font-medium text-sm">
                                        Target: <span className="text-white font-bold">${plan.profitTarget.toLocaleString()}</span> (10%)
                                    </span>
                                </div>

                                {/* Drawdown */}
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isPopular ? 'text-[#2E81FF]' : 'text-[#2E81FF]'}`} />
                                    <span className="text-zinc-300 font-medium text-sm">
                                        Max Drawdown: <span className="text-white font-bold">6%</span>
                                    </span>
                                </div>

                                {/* Contracts */}
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isPopular ? 'text-[#2E81FF]' : 'text-[#2E81FF]'}`} />
                                    <span className="text-zinc-300 font-medium text-sm">
                                        Contracts: <span className="text-white font-bold">Unlimited</span>
                                    </span>
                                </div>

                                {/* Min Days */}
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isPopular ? 'text-[#2E81FF]' : 'text-[#2E81FF]'}`} />
                                    <span className="text-zinc-300 font-medium text-sm">
                                        Min. Trading Days: <span className="text-white font-bold">5 Days</span>
                                    </span>
                                </div>

                                {/* Profit Split */}
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isPopular ? 'text-[#2E81FF]' : 'text-[#2E81FF]'}`} />
                                    <span className="text-zinc-300 font-medium text-sm">
                                        Up to <span className="text-white font-bold">90% Profit Split</span>
                                    </span>
                                </div>
                            </div>

                            {/* Learn How Tooltip Section */}
                            <div className="mb-6 flex items-center justify-center p-3 rounded-2xl bg-[#0A0E14]/50 border border-[#2E3A52]/50">
                                <span className="text-[11px] font-bold text-green-400 uppercase tracking-wide">
                                    How to get 1st payout?
                                </span>
                                <LearnHowTooltip />
                            </div>

                            {/* Price & CTA */}
                            <div className="mt-auto space-y-6">
                                <div className="text-center">
                                    <span className="text-4xl font-black text-white tracking-tight">${plan.price}</span>
                                    <span className="text-zinc-500 font-medium ml-2">/ month</span>
                                </div>

                                <Link href={`/signup?plan=${tierData.key}`} className="block">
                                    <Button
                                        className={`w-full h-14 rounded-2xl text-base font-bold tracking-wide transition-all duration-300 ${tierData.btnColor} border-none`}
                                    >
                                        Start Now <ChevronRight className="w-5 h-5 ml-1" />
                                    </Button>
                                </Link>
                            </div>

                        </div>
                    );
                })}
            </div>
        </section>
    );
}
