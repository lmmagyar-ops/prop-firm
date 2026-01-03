"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChartsVsReality } from "./ChartsVsReality";
import { MiniAcademy } from "./MiniAcademy";
import { EventTradingPlaybook } from "./EventTradingPlaybook";
import { PricingSection } from "./PricingSection";
import { HighFrequencySection } from "./HighFrequencySection";

// SVG Logos for better visual fidelity
function YahooLogo() {
    return (
        <svg viewBox="0 0 100 24" className="h-8 w-auto fill-current">
            <path d="M52.3 22l-1.3-4.2h-7L42.7 22H39l8.6-21.8h3.8L60 22h-3.8V22z M48.8 8.4L45.4 15h6.6L48.8 8.4z M13.7 0L8.1 12.8 2.6 0H0l7.1 15.6v6.2h3.9v-6.2L18.1 0H13.7z M29.1 22v-8.8h-7.8V22H19V0.2h2.3v10.3h7.8V0.2h2.3V22H29.1z M73.7 22V0.2h2.3V22H73.7z M100 22V0.2h2.3V22H100z M84.8 22V13h-7.8V22H75V0.2h2.3v10.3h7.8V0.2h2.3V22H84.8z" />
        </svg>
    );
}

function NasdaqLogo() {
    return (
        <svg viewBox="0 0 100 24" className="h-7 w-auto fill-current">
            <path d="M5.9 5.8v12.4H2.4V2h5.7l9.6 13.9V2h3.5v19.8h-5.9L5.9 5.8z M35.4 15.5H27v6.3h-3.6V2h3.9l8.2 13.5z M47.8 16.5c1.4 1.1 2.3 2.1 2.3 3.6 0 2.2-2.1 3.5-5.2 3.5-2.6 0-4.6-1.1-5.7-2.1l1.6-2.6c1.1 0.8 2.4 1.8 4 1.8 1.4 0 2-0.5 2-1s-0.5-0.9-1.5-1.5l-2-1.3c-2.7-1.7-4-3.3-4-5.4 0-2.3 1.9-3.5 4.8-3.5 2.1 0 3.8 0.8 4.9 1.6l-1.5 2.5c-0.8-0.6-2-1.2-3.3-1.2-1.1 0-1.7 0.4-1.7 0.9 0 0.5 0.6 0.9 1.7 1.6l1.8 1.1c2.2 1.4 3.6 2.6 3.6 5.1-0.1 1.2-0.6 2.3-1.8 3.2z M65.5 10.9V2h5.7c5.8 0 8.4 4.1 8.4 9.1v0.7c0 5-2.6 9.3-8.4 9.3h-9.3V2h3.6v8.9h0z M71.7 18.2c2.9 0 4.2-2.3 4.2-6.3v-0.6c0-3.9-1.3-6.2-4.2-6.2h-2.1v13.1h2.1z M89 15.5H80.6v6.3H77V2h3.9l8.2 13.5z M96.1 14.5l-2.6-2.6 3-3V21h-3.3v-2.8l-1.1 1.1c-1.3 1.3-2.9 1.9-4.8 1.9-4.1 0-7.2-3.3-7.2-8.3v-1.9c0-5 3.1-8.3 7.2-8.3 1.9 0 3.5 0.5 4.8 1.9l1.1 1.1V2h3.4v12.5h-0.5z M87.1 11v0.9c0 3.2 1.8 5.4 4.1 5.4 2.3 0 4.1-2.2 4.1-5.4v-0.9c0-3.2-1.8-5.4-4.1-5.4-2.3 0-4.1 2.2-4.1 5.4z" />
        </svg>
    );
}

function MarketWatchLogo() {
    return (
        <svg viewBox="0 0 140 24" className="h-6 w-auto fill-current">
            <path d="M12.4 2h4.5l5.2 15.8L27.3 2h4.4v20h-3.8V7.5L22.2 22h-4.3L12 7.5V22H8.2V2H12.4z M45 22l-1.2-4.1H37L35.8 22H32l8.3-20h4.4l8.3 20H45z M41 9.4L38.2 18h5.6L41 9.4z M61.6 12.8H57v9.2h-3.9V2h7.8c3.5 0 5.8 2.1 5.8 5.4 0 2.6-1.5 4.5-3.8 5.1l4.2 9.4h-4.2L61.6 12.8z M57 5.3v5.6h3.6c1.3 0 2-0.8 2-2.1 0-1.2-0.7-2.1-2-2.1H57z M72.8 12.9L77 18h-4.8l-2.6-3.2v7.2h-3.9V2h3.9v9L73.9 7h4.8L72.8 12.9z M90.4 5.3v5.6H94l-2.4 3.7h4.8l-2.5-3.7h3.3v-5.6H90.4z M90.4 14.8v7.2H86.5V2h10.7v3.3H90.4v1.8z M107.8 5.3v13.5h3.9V5.3h3.5V2h-10.9v3.3H107.8z M131.5 22h-4.1l-2.3-9.5-2.2 9.5h-4.2l-3.6-20h4l1.8 11.2 2.3-11.2h4.1l2.3 11.2 1.8-11.2h4L131.5 22z" />
        </svg>
    );
}

export function LandingContent() {
    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-[#2E81FF]/30 overflow-x-hidden font-sans">

            {/* As Seen On - Social Proof */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 pb-20 pt-10 text-center border-t border-[#2E3A52]/30">
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-[0.2em] mb-10">As Seen In</p>
                <div className="flex flex-wrap justify-center items-center gap-16 md:gap-32 opacity-40 hover:opacity-100 transition-opacity duration-500">
                    <motion.div whileHover={{ scale: 1.05, filter: "brightness(1.5)" }} className="text-zinc-400">
                        <YahooLogo />
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, filter: "brightness(1.5)" }} className="text-zinc-400">
                        <NasdaqLogo />
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, filter: "brightness(1.5)" }} className="text-zinc-400">
                        <MarketWatchLogo />
                    </motion.div>
                </div>
            </div>

            {/* Pricing Section (Evaluations) */}
            <PricingSection />

            {/* Value Proposition (Charts vs Reality) */}
            <ChartsVsReality />

            {/* Educational Content */}
            <EventTradingPlaybook />

            {/* Academy/Trust */}
            <MiniAcademy />

            {/* Technical/HF Section */}
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
