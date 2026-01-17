"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";
import { PLANS } from "@/config/plans";
import { Navbar } from "@/components/Navbar";
import { ProbabilityOrbs } from "@/components/ProbabilityOrbs";
import { UrgencyTimer } from "@/components/landing/UrgencyTimer";

export function LandingHero() {
    const [selectedPlanKey, setSelectedPlanKey] = useState<keyof typeof PLANS>("grinder");
    const activePlan = PLANS[selectedPlanKey];

    const planKeys = Object.keys(PLANS) as (keyof typeof PLANS)[];
    planKeys.sort((a, b) => PLANS[a].price - PLANS[b].price);

    return (
        <div className="relative z-50 flex flex-col items-center justify-between min-h-screen overflow-hidden bg-[#000000]">

            <Navbar />

            {/* Atmospheric Corner Glows - Vapi Style */}
            <div className="glow-indigo-corner animate-pulse-glow" />
            <div className="glow-purple-corner animate-pulse-glow" />

            {/* Dot Grid Background */}
            <div className="absolute inset-0 bg-dot-grid-subtle opacity-60 pointer-events-none" />

            {/* Floating Probability Orbs */}
            <ProbabilityOrbs />

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 w-full max-w-5xl mx-auto pt-32 pb-20">

                {/* Main Headline - Clean & Bold */}
                <div className="animate-slide-up text-center space-y-6 mb-12">
                    <h1 className="text-5xl md:text-7xl lg:text-[90px] leading-[0.95] font-black tracking-tight text-white">
                        Prove Your Edge.<br />
                        <span className="text-gradient-mint">Get Funded.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-[var(--vapi-gray-text)] max-w-2xl mx-auto leading-relaxed">
                        Pass our challenge. Trade prediction markets.
                        <span className="text-white font-medium"> Keep up to 90% of what you earn.</span>
                    </p>
                </div>

                {/* Account Size Selector - Thin Border Pills */}
                <div className="animate-slide-up-delay-2 w-full max-w-md mb-8">
                    <div className="thin-border-card rounded-full p-1.5 flex gap-1">
                        {planKeys.map((key) => {
                            const plan = PLANS[key];
                            const sizeLabel = "$" + (plan.size / 1000) + "K";
                            const isActive = selectedPlanKey === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedPlanKey(key)}
                                    className={`flex-1 py-3 rounded-full mono-label text-xs transition-all duration-300 ${isActive
                                        ? "bg-[var(--vapi-mint)] text-black"
                                        : "text-[var(--vapi-gray-text)] hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    {sizeLabel}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Price Display */}
                <div className="animate-slide-up-delay-2 flex items-baseline gap-2 mb-4">
                    <span className="text-5xl md:text-6xl font-black text-white tracking-tight">
                        ${activePlan.price}
                    </span>
                    <span className="text-[var(--vapi-gray-text)] text-lg">/one-time</span>
                </div>

                {/* Urgency Timer - FOMO */}
                <div className="animate-slide-up-delay-2 mb-8">
                    <UrgencyTimer hoursToExpire={24} label="Launch pricing ends in" />
                </div>

                {/* CTA Button - Mint Pill Style */}
                <div className="animate-slide-up-delay-3 flex flex-col items-center gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Link
                            href={`/signup?intent=buy_evaluation&tier=${activePlan.id}&price=${activePlan.price}`}
                            className="group"
                        >
                            <button className="pill-btn pill-btn-mint flex items-center gap-2 text-lg px-10 py-5 font-bold">
                                Get Funded
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                        <a
                            href="https://discord.gg/projectx"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group"
                        >
                            <button className="flex items-center gap-2 text-lg px-8 py-5 font-bold text-white bg-transparent border border-white/20 rounded-full hover:bg-white/10 transition-all">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                                Join Discord
                            </button>
                        </a>
                    </div>

                    <Link
                        href="/rules"
                        className="mono-label text-[var(--vapi-gray-text)] hover:text-[var(--vapi-mint)] transition-colors flex items-center gap-1"
                    >
                        View Rules <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>

            </div>

            {/* Bottom Border Line */}
            <div className="w-full h-px bg-[var(--vapi-border)]" />
        </div>
    );
}
