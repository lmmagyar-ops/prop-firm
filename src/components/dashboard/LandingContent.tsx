"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, BarChart3, Trophy, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketTicker } from "../MarketTicker";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartsVsReality } from "./ChartsVsReality";
import { MiniAcademy } from "./MiniAcademy";
import { EventTradingPlaybook } from "./EventTradingPlaybook";
import { PricingSection } from "./PricingSection";
import { HighFrequencySection } from "./HighFrequencySection";

export function LandingContent() {
    const [selectedSize, setSelectedSize] = useState("5K");

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-[#2E81FF]/30 overflow-x-hidden font-sans">

            {/* As Seen On - Social Proof */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 pb-20 pt-10 text-center border-t border-[#2E3A52]/30">
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-[0.2em] mb-8">As Seen In</p>
                <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-70">
                    <a href="#" className="text-2xl font-serif font-bold text-zinc-500 hover:text-white transition-colors duration-300 tracking-tight">
                        yahoo<span className="text-[#6001D2] font-sans">!</span>finance
                    </a>
                    <a href="#" className="text-2xl font-bold text-zinc-500 hover:text-white transition-colors duration-300 tracking-wider font-mono">
                        NASDAQ
                    </a>
                    <a href="#" className="text-2xl font-serif font-extrabold text-zinc-500 hover:text-white transition-colors duration-300 italic tracking-tighter">
                        MarketWatch
                    </a>
                </div>
            </div>

            {/* Pricing Section - Moved Up for Visibility */}
            <PricingSection />

            {/* Charts vs Reality - The "Aha!" Moment */}
            <ChartsVsReality />

            {/* Event Trading Playbook - How To Trade */}
            <EventTradingPlaybook />



            {/* Mini Academy - Prove They Can Trade */}
            <MiniAcademy />




            {/* High Frequency Command Center */}
            <HighFrequencySection />

            {/* Final CTA Section */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 py-32">
                <div className="relative bg-gradient-to-b from-[#131722] to-[#0B0E14] border border-[#2E3A52] rounded-[40px] p-12 md:p-20 overflow-hidden">
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#2E81FF]/10 via-transparent to-transparent" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#2E81FF]/10 blur-[120px] rounded-full pointer-events-none" />

                    <div className="relative z-10 text-center space-y-8">
                        {/* Eyebrow */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2E81FF]/10 border border-[#2E81FF]/20 text-[#2E81FF] text-xs font-bold uppercase tracking-[0.2em]">
                            Ready to Trade?
                        </div>

                        {/* Headline */}
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight max-w-4xl mx-auto">
                            Your Edge Is Waiting.
                            <br />
                            Your Capital Is Ready.
                        </h2>

                        {/* Subtext */}
                        <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto">
                            Stop trading with your own money. Start trading with ours.
                        </p>

                        {/* CTA Button */}
                        <Link
                            href="/signup"
                            className="inline-block group relative"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#2E81FF] to-cyan-500 rounded-full blur opacity-40 group-hover:opacity-100 transition duration-500 animate-pulse" />
                            <Button
                                size="lg"
                                className="relative px-12 py-6 text-lg font-black rounded-full transition-all duration-300 bg-[#2E81FF] text-white hover:bg-[#2E81FF] hover:brightness-110 hover:shadow-[0_0_40px_-5px_rgba(46,129,255,0.6)] hover:scale-105 active:scale-95 border-none"
                            >
                                GET FUNDED <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform stroke-[3px]" />
                            </Button>
                        </Link>

                        {/* Email Subscription */}
                        <div className="pt-8 space-y-4">
                            <p className="text-zinc-400 text-lg">
                                Get exclusive trading insights and promotions
                            </p>
                            <form className="max-w-md mx-auto">
                                <div className="relative">
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        className="w-full px-6 py-4 bg-[#0A0E14] border border-[#2E3A52] rounded-full text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#2E81FF] transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#2E81FF] hover:bg-[#2E81FF]/90 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                                    >
                                        <ChevronRight className="w-5 h-5 text-white stroke-[3px]" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="relative z-10 border-t border-[#2E3A52] py-12 text-center text-zinc-600 text-sm">
                <div className="flex justify-center items-center gap-8 text-zinc-500 mb-6">
                    <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
                    <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
                    <span className="hover:text-white cursor-pointer transition-colors">Risk Disclosure</span>
                </div>
                <p>
                    &copy; 2025 Project X via Polymarket Data. All rights reserved. <br />
                    This is a simulated trading environment. No real funds are at risk during evaluation.
                </p>
            </footer>
        </div>
    );
}
