"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, BarChart3, ShieldCheck, Zap, Trophy, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketTicker } from "../MarketTicker";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartsVsReality } from "./ChartsVsReality";
import { MiniAcademy } from "./MiniAcademy";
import { EventTradingPlaybook } from "./EventTradingPlaybook";

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

            {/* Charts vs Reality - The "Aha!" Moment */}
            <ChartsVsReality />

            {/* Event Trading Playbook - How To Trade */}
            <EventTradingPlaybook />

            {/* How It Works - Premium Redesign */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 py-32 border-t border-[#2E3A52]/50">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#2E81FF]/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative text-center space-y-4 mb-20">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white">
                        Your Path to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E81FF] to-cyan-400">Capital.</span>
                    </h2>
                    <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        A simple, transparent evaluation process designed to get you funded.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    {[
                        {
                            step: "01",
                            icon: Zap,
                            title: "The Challenge",
                            desc: "Show us your skills. Hit the profit target without violating daily drawdown.",
                            color: "text-blue-400",
                            bg: "bg-blue-500/10",
                            border: "group-hover:border-blue-500/50"
                        },
                        {
                            step: "02",
                            icon: ShieldCheck,
                            title: "The Verification",
                            desc: "Prove consistency. Repeat your performance to validate your strategy.",
                            color: "text-purple-400",
                            bg: "bg-purple-500/10",
                            border: "group-hover:border-purple-500/50"
                        },
                        {
                            step: "03",
                            icon: Wallet,
                            title: "Professional Trader",
                            desc: "Trade our capital. Keep up to 90% of the profits. Reliable bi-weekly USDC settlements—direct to your wallet.",
                            color: "text-emerald-400",
                            bg: "bg-emerald-500/10",
                            border: "group-hover:border-emerald-500/50"
                        }
                    ].map((item, i) => (
                        <div key={i} className="group relative bg-[#131722]/80 backdrop-blur-xl border border-[#2E3A52] rounded-[32px] p-8 md:p-10 hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_0_50px_-10px_rgba(46,129,255,0.15)] overflow-hidden">
                            {/* Hover Gradient */}
                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-b from-white/5 to-transparent pointer-events-none`} />

                            {/* Step Number */}
                            <div className="absolute top-6 right-8 text-6xl font-black text-white/5 group-hover:text-white/10 transition-colors select-none font-mono">
                                {item.step}
                            </div>

                            {/* Icon */}
                            <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 ring-1 ring-white/5`}>
                                <item.icon className={`w-7 h-7 ${item.color} stroke-[2px]`} />
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">{item.title}</h3>
                            <p className="text-zinc-400 leading-relaxed font-medium">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Mini Academy - Prove They Can Trade */}
            <MiniAcademy />

            {/* Pricing Section */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 mb-20">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                        Simple, Transparent <span className="text-blue-500">Pricing.</span>
                    </h2>
                    <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                        No hidden fees. One-time payment. Refundable with your first payout.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                    {/* Card 1: Scout */}
                    <div className="relative bg-[#131722]/60 backdrop-blur-xl border border-[#2E3A52] rounded-3xl p-8 hover:border-blue-500/30 transition-colors">
                        <div className="mb-6">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-white">$49</span>
                                <span className="text-zinc-500 text-sm font-medium">/ lifetime</span>
                            </div>
                            <p className="text-blue-400 text-sm font-bold mt-2">$5,000 Starting Capital</p>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 text-zinc-300 text-sm"><CheckCircle2 className="w-4 h-4 text-blue-500" /> 80% Profit Split</li>
                            <li className="flex items-center gap-3 text-zinc-300 text-sm"><CheckCircle2 className="w-4 h-4 text-blue-500" /> 5% Daily Drawdown</li>
                            <li className="flex items-center gap-3 text-zinc-300 text-sm"><CheckCircle2 className="w-4 h-4 text-blue-500" /> 10% Max Drawdown</li>
                        </ul>
                        <button className="w-full py-4 rounded-xl bg-[#2E3A52]/50 hover:bg-white hover:text-black text-white font-bold transition-all duration-300 cursor-pointer">
                            Start Challenge
                        </button>
                    </div>

                    {/* Card 2: Grinder (Popular) */}
                    <div className="relative bg-[#1A202C]/80 backdrop-blur-xl border border-purple-500/50 rounded-3xl p-8 md:p-10 transform md:scale-105 shadow-[0_0_50px_-10px_rgba(168,85,247,0.2)] z-10">
                        <div className="absolute top-0 left-1/4 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                            Most Popular
                        </div>
                        <div className="mb-8">
                            <div className="flex items-baseline gap-1">
                                <span className="text-5xl font-black text-white">$99</span>
                                <span className="text-zinc-500 text-sm font-medium">/ lifetime</span>
                            </div>
                            <p className="text-purple-400 text-sm font-bold mt-2">$10,000 Starting Capital</p>
                        </div>
                        <ul className="space-y-4 mb-10">
                            <li className="flex items-center gap-3 text-white text-sm"><CheckCircle2 className="w-5 h-5 text-purple-500" /> Up to 90% Profit Split</li>
                            <li className="flex items-center gap-3 text-white text-sm"><CheckCircle2 className="w-5 h-5 text-purple-500" /> 5% Daily Drawdown</li>
                            <li className="flex items-center gap-3 text-white text-sm"><CheckCircle2 className="w-5 h-5 text-purple-500" /> 10% Max Drawdown</li>
                            <li className="flex items-center gap-3 text-white text-sm"><CheckCircle2 className="w-5 h-5 text-purple-500" /> Bi-weekly USDC Payouts</li>
                        </ul>
                        <button className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:to-blue-500 text-white font-bold shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                            Get Funded
                        </button>
                    </div>

                    {/* Card 3: Executive */}
                    <div className="relative bg-[#131722]/60 backdrop-blur-xl border border-[#2E3A52] rounded-3xl p-8 hover:border-emerald-500/30 transition-colors">
                        <div className="mb-6">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-white">$199</span>
                                <span className="text-zinc-500 text-sm font-medium">/ lifetime</span>
                            </div>
                            <p className="text-emerald-400 text-sm font-bold mt-2">$25,000 Starting Capital</p>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 text-zinc-300 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Up to 90% Profit Split</li>
                            <li className="flex items-center gap-3 text-zinc-300 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No Time Limit</li>
                            <li className="flex items-center gap-3 text-zinc-300 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Refundable Fee</li>
                        </ul>
                        <button className="w-full py-4 rounded-xl bg-[#2E3A52]/50 hover:bg-white hover:text-black text-white font-bold transition-all duration-300 cursor-pointer">
                            Start Challenge
                        </button>
                    </div>
                </div>
            </section>


            {/* Why Trade with Project X */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 mb-32">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8 text-center md:text-left">
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                            Built Different. <br />
                            <span className="text-zinc-500">Engineered for Longevity.</span>
                        </h2>
                        <p className="text-lg text-zinc-400 max-w-md mx-auto md:mx-0">
                            We don't rely on you failing. Our model is built on real market mechanics and sustainable growth.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                            {[
                                { icon: BarChart3, title: "True Execution", desc: "Real order book data. No simulated slippage manipulation." },
                                { icon: Wallet, title: "Instant Payouts", desc: "USDC withdrawals processed every 14 days. No delays." },
                                { icon: CheckCircle2, title: "No Time Limits", desc: "Trade at your own pace. Zero pressure to rush entries." },
                                { icon: Trophy, title: "Up to 90% Profit Split", desc: "Industry leading rewards. You keep what you earn." }
                            ].map((item, i) => (
                                <div key={i} className="bg-[#1A232E]/30 border border-[#2E3A52] p-5 rounded-2xl hover:bg-[#1A232E]/50 transition-colors">
                                    <item.icon className="w-8 h-8 text-blue-500 mb-3" />
                                    <h4 className="font-bold text-white mb-1">{item.title}</h4>
                                    <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Visual / Abstract Representation */}
                    <div className="relative h-[500px] w-full bg-[#0A0E14] border border-[#2E3A52] rounded-3xl overflow-hidden flex items-center justify-center group">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0A0E14] to-[#0A0E14]" />
                        <div className="relative z-10 text-center space-y-2">
                            <div className="text-8xl font-black text-white/5 select-none group-hover:text-white/10 transition-colors duration-500">
                                PRO
                            </div>
                            <div className="text-sm font-mono text-blue-500 tracking-[0.3em] uppercase">
                                Infrastructure
                            </div>
                        </div>

                        {/* Orbiting Elements (Decorative) */}
                        <div className="absolute w-[300px] h-[300px] border border-blue-500/10 rounded-full animate-spin-slow" />
                        <div className="absolute w-[450px] h-[450px] border border-dashed border-white/5 rounded-full animate-reverse-spin" />
                    </div>
                </div>
            </section>


            {/* Platform Features */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
                <div className="relative bg-gradient-to-b from-[#131722] to-[#0B0E14] border border-[#2E3A52] rounded-[40px] p-8 md:p-16 overflow-hidden">
                    {/* Background Grid/Glow */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(46,129,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(46,129,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-16">
                        <div className="flex-1 space-y-8 text-center md:text-left">
                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                                Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E81FF] to-cyan-400">High Frequency</span> <br />
                                Prediction Markets.
                            </h2>

                            <p className="text-zinc-400 text-lg leading-relaxed max-w-lg mx-auto md:mx-0">
                                Experience the speed and precision of a real trading desk. Our infrastructure is designed to handle the velocity of modern prediction markets.
                            </p>

                            <ul className="space-y-6 pt-4">
                                {[
                                    { text: "Real-time Polymarket Data Feeds (<100ms)", sub: "Direct connection to the CLOB." },
                                    { text: "One-Click Execution", sub: "Enter and exit positions instantly." },
                                    { text: "Visual Risk Management", sub: "Live odometer and position gauges." },
                                    { text: "Velocity Fee Engine", sub: "Smart carry costs to encourage volume." }
                                ].map((feat, i) => (
                                    <li key={i} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-[#2E3A52]/30 flex items-center justify-center flex-shrink-0 border border-white/5">
                                            <CheckCircle2 className="w-5 h-5 text-[#2E81FF]" />
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-lg">{feat.text}</div>
                                            <div className="text-zinc-500 text-sm">{feat.sub}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Feature Visual - Network Status Terminal */}
                        <div className="flex-1 w-full relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-20 blur-xl" />
                            <div className="relative bg-[#050505] border border-[#2E3A52] rounded-2xl p-6 md:p-8 shadow-2xl">
                                {/* Terminal Header */}
                                <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Network Status</div>
                                </div>

                                {/* Terminal Title */}
                                <div className="mb-6">
                                    <div className="text-xs font-mono text-zinc-500 mb-1">$ polymarket --status</div>
                                    <div className="text-sm font-mono text-[#2E81FF] font-bold">POLYMARKET NETWORK</div>
                                </div>

                                {/* Stats Grid */}
                                <div className="space-y-4 font-mono text-sm">
                                    {[
                                        { label: "Total Volume", value: "$2.1B+", color: "text-blue-400" },
                                        { label: "Active Markets", value: "15,000+", color: "text-purple-400" },
                                        { label: "24h Volume", value: "$45M", color: "text-cyan-400" },
                                        { label: "Avg Execution", value: "< 100ms", color: "text-green-400" },
                                        { label: "Network Uptime", value: "99.9%", color: "text-emerald-400" }
                                    ].map((stat, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 rounded-lg hover:bg-white/5 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-[#2E81FF] transition-colors" />
                                                <span className="text-zinc-500 group-hover:text-zinc-400 transition-colors">{stat.label}</span>
                                            </div>
                                            <span className={`font-bold ${stat.color}`}>{stat.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Status Footer */}
                                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-xs font-mono text-green-500">CONNECTED</span>
                                    </div>
                                    <span className="text-xs font-mono text-zinc-600">Last updated: now</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

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
