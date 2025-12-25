"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Zap, ShieldCheck, Trophy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { PLANS } from "@/config/plans";

import { MarketTicker } from "@/components/MarketTicker";
import { Navbar } from "@/components/Navbar";

export function LandingHero() {
    // Default to grinder (10k)
    const [selectedPlanKey, setSelectedPlanKey] = useState<keyof typeof PLANS>("grinder");
    const activePlan = PLANS[selectedPlanKey];

    // Helper to get plan by size for the selector buttons
    const planKeys = Object.keys(PLANS) as (keyof typeof PLANS)[];
    // Sort by price to ensure 5k -> 10k -> 25k order
    planKeys.sort((a, b) => PLANS[a].price - PLANS[b].price);

    return (
        <div className="relative z-50 flex flex-col items-center justify-between min-h-[85vh] overflow-hidden pt-36 bg-[#050505]">

            <Navbar />

            {/* 0. Aurora Background Effects (Ambient) - Deep Blue/Violet */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#2E81FF]/20 blur-[120px] rounded-full opacity-40 pointer-events-none animate-pulse" />
            <div className="absolute top-20 left-1/4 w-[800px] h-[500px] bg-violet-600/10 blur-[100px] rounded-full opacity-30 pointer-events-none" />

            <div className="flex flex-col items-center space-y-8 px-4 w-full max-w-7xl mx-auto mt-8"> {/* Compacted spacing */}

                {/* 1. Main Headline - Massive & Bold */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4 max-w-5xl relative text-center"
                >
                    <h1 className="text-6xl md:text-8xl lg:text-[100px] leading-[0.9] font-black tracking-tighter text-white drop-shadow-2xl">
                        Trade with <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E81FF] via-cyan-400 to-[#2E81FF] animate-text-shimmer bg-[length:200%_auto]">
                            Our Liquidity.
                        </span>
                    </h1>

                    <div className="flex flex-col items-center gap-4">
                        <p className="text-xl md:text-2xl text-zinc-400 font-medium leading-relaxed max-w-3xl mx-auto">
                            Trade Polymarket with Our Capital. <span className="text-white font-bold">Zero Personal Liability.</span>
                        </p>
                    </div>
                </motion.div>

                {/* 2. Account Selector - Glassmorphism */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="w-full max-w-lg bg-[#1A232E]/80 backdrop-blur-2xl border border-[#2E3A52] p-2 rounded-3xl flex gap-1 shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-[#2E3A52]"
                >
                    {planKeys.map((key) => {
                        const plan = PLANS[key];
                        const sizeLabel = (plan.size / 1000) + "k"; // 5000 -> "5k"
                        return (
                            <button
                                key={key}
                                onClick={() => setSelectedPlanKey(key)}
                                className={`relative flex-1 py-4 rounded-2xl text-base font-bold transition-all duration-300 overflow-hidden ${selectedPlanKey === key
                                    ? "bg-[#2E81FF] text-white shadow-xl ring-1 ring-white/20"
                                    : "text-zinc-500 hover:bg-[#2E81FF]/10 hover:text-white"
                                    }`}
                            >
                                {selectedPlanKey === key && (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                                )}
                                <span className="relative z-10">${sizeLabel.toUpperCase()}</span>
                            </button>
                        );
                    })}
                </motion.div>

                {/* 3. Pricing & CTA - High Conversions */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col items-center space-y-6"
                >
                    <div className="flex flex-col items-center">
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">${activePlan.price}</span>
                            <span className="text-zinc-500 font-medium text-lg">/ one-time</span>
                        </div>

                    </div>

                    <Link
                        href={`/signup?intent=buy_evaluation&tier=${activePlan.id}&price=${activePlan.price}`}
                        className="w-full max-w-sm group relative"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#2E81FF] to-cyan-500 rounded-full blur opacity-40 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                        <Button
                            size="lg"
                            className="relative w-full h-16 text-xl font-black rounded-full transition-all duration-300 bg-[#2E81FF] text-white hover:bg-[#2E81FF] hover:brightness-110 hover:shadow-[0_0_40px_-5px_rgba(46,129,255,0.6)] hover:scale-[1.02] active:scale-95 border-none"
                        >
                            START CHALLENGE <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform stroke-[3px]" />
                        </Button>
                    </Link>

                    <Link href="/rules" className="text-sm font-bold text-zinc-500 hover:text-white transition-colors border-b border-transparent hover:border-white/20 pb-0.5">
                        View Trading Rules
                    </Link>


                </motion.div>

            </div>

            {/* 4. Live Market Ticker Integration */}
            <div className="w-full mt-8 pb-4">
                <MarketTicker />
            </div>

        </div>
    );
}
