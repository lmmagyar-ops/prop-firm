"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, BarChart3, ShieldCheck, Zap, Trophy, Wallet } from "lucide-react";
import { MarketTicker } from "../MarketTicker";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LandingContent() {
    const [selectedSize, setSelectedSize] = useState("5K");

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-[#2E81FF]/30 overflow-x-hidden font-sans">
            {/* Background Gradients for Content Sections */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[20%] left-0 w-[600px] h-[600px] bg-[#2E81FF]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-violet-500/5 rounded-full blur-[120px]" />
            </div>


            {/* As Seen On - Social Proof (Hidden to match Vercel V1) */}
            {/* <div className="relative z-10 max-w-7xl mx-auto px-6 pb-20 pt-10 text-center border-t border-[#2E3A52]/30">
                ...
            </div> */}

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
                            desc: "Trade our capital. Keep up to 90% of the profits. Bi-weekly payouts via USDC.",
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


            {/* Pricing Section - Vercel Match High Fidelity */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 mb-20">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                        Simple, Transparent <span className="text-blue-500">Pricing.</span>
                    </h2>
                    <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                        No hidden fees. One-time payment. Refundable with your first payout.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
                    {/* SCOUT */}
                    <div className="group relative bg-[#0F1218] border border-[#2E3A52] rounded-[2.5rem] p-8 hover:border-blue-500/50 transition-all duration-500 overflow-hidden flex flex-col">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center text-center mb-8 space-y-2">
                            <h3 className="text-sm font-bold text-zinc-500 tracking-[0.2em] uppercase">Scout</h3>
                            <div className="text-6xl font-black text-white tracking-tighter">5K</div>
                            <p className="text-zinc-400 text-sm max-w-[200px] leading-relaxed">
                                Perfect for learning market mechanics with minimal risk.
                            </p>
                        </div>

                        <div className="flex-1 space-y-6 mb-8 relative z-10">
                            <div className="flex justify-between items-center text-sm border-b border-zinc-800 pb-4">
                                <span className="text-zinc-400">Profit Target</span>
                                <span className="text-white font-bold">$500 <span className="text-blue-500">(10%)</span></span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400">Drawdown</span>
                                <span className="text-white font-bold">6%</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400">Daily Loss</span>
                                <span className="text-white font-bold">None</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-zinc-800 pb-4">
                                <span className="text-zinc-400">Min Days</span>
                                <span className="text-white font-bold">5 Days</span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400 font-bold">Profit Split</span>
                                    <span className="text-green-500 font-bold">90%</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[90%] rounded-full" />
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 mt-auto pt-6 border-t border-zinc-800 text-center space-y-4">
                            <div className="flex items-center justify-center gap-2 text-[#2E81FF] text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-white transition-colors">
                                <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[8px]">?</div>
                                Learn How
                            </div>

                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-black text-white">$79</span>
                                <span className="text-zinc-500 text-sm">/ one-time</span>
                            </div>

                            <button className="w-full py-4 rounded-2xl bg-[#1A202C] hover:bg-white hover:text-black text-white font-bold transition-all duration-300 flex items-center justify-center gap-2 group/btn">
                                Start Challenge <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* GRINDER (Popular) */}
                    <div className="group relative bg-[#0F1218] border border-[#2E81FF]/50 rounded-[2.5rem] p-8 shadow-[0_0_80px_-20px_rgba(46,129,255,0.2)] md:scale-110 md:-translate-y-4 z-20 flex flex-col">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#2E81FF] text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-lg shadow-blue-900/50">
                            Most Popular
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-[#2E81FF]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center text-center mb-8 space-y-2 pt-4">
                            <h3 className="text-sm font-bold text-zinc-500 tracking-[0.2em] uppercase">Grinder</h3>
                            <div className="text-6xl font-black text-white tracking-tighter">10K</div>
                            <p className="text-zinc-400 text-sm max-w-[200px] leading-relaxed">
                                The standard for serious traders looking to scale up.
                            </p>
                        </div>

                        <div className="flex-1 space-y-6 mb-8 relative z-10">
                            <div className="flex justify-between items-center text-sm border-b border-zinc-800 pb-4">
                                <span className="text-zinc-400">Profit Target</span>
                                <span className="text-white font-bold">$1,000 <span className="text-blue-500">(10%)</span></span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400">Drawdown</span>
                                <span className="text-white font-bold">6%</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400">Daily Loss</span>
                                <span className="text-white font-bold">None</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-zinc-800 pb-4">
                                <span className="text-zinc-400">Min Days</span>
                                <span className="text-white font-bold">5 Days</span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400 font-bold">Profit Split</span>
                                    <span className="text-green-500 font-bold">90%</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[90%] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 mt-auto pt-6 border-t border-zinc-800 text-center space-y-4">
                            <div className="flex items-center justify-center gap-2 text-[#2E81FF] text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-white transition-colors">
                                <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[8px]">?</div>
                                Learn How
                            </div>

                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-5xl font-black text-white">$149</span>
                                <span className="text-zinc-500 text-sm">/ one-time</span>
                            </div>

                            <button className="w-full py-4 rounded-2xl bg-[#2E81FF] hover:bg-[#2563EB] hover:scale-[1.02] text-white font-bold transition-all duration-300 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 group/btn">
                                Start Challenge <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* EXECUTIVE */}
                    <div className="group relative bg-[#0F1218] border border-[#2E3A52] rounded-[2.5rem] p-8 hover:border-emerald-500/50 transition-all duration-500 overflow-hidden flex flex-col">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center text-center mb-8 space-y-2">
                            <h3 className="text-sm font-bold text-zinc-500 tracking-[0.2em] uppercase">Executive</h3>
                            <div className="text-6xl font-black text-white tracking-tighter">25K</div>
                            <p className="text-zinc-400 text-sm max-w-[200px] leading-relaxed">
                                Maximum capital for experienced market operators.
                            </p>
                        </div>

                        <div className="flex-1 space-y-6 mb-8 relative z-10">
                            <div className="flex justify-between items-center text-sm border-b border-zinc-800 pb-4">
                                <span className="text-zinc-400">Profit Target</span>
                                <span className="text-white font-bold">$3,000 <span className="text-blue-500">(10%)</span></span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400">Drawdown</span>
                                <span className="text-white font-bold">6%</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400">Daily Loss</span>
                                <span className="text-white font-bold">None</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-zinc-800 pb-4">
                                <span className="text-zinc-400">Min Days</span>
                                <span className="text-white font-bold">5 Days</span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400 font-bold">Profit Split</span>
                                    <span className="text-green-500 font-bold">90%</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[90%] rounded-full" />
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 mt-auto pt-6 border-t border-zinc-800 text-center space-y-4">
                            <div className="flex items-center justify-center gap-2 text-[#2E81FF] text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-white transition-colors">
                                <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[8px]">?</div>
                                Learn How
                            </div>

                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-black text-white">$299</span>
                                <span className="text-zinc-500 text-sm">/ one-time</span>
                            </div>

                            <button className="w-full py-4 rounded-2xl bg-[#1A202C] hover:bg-white hover:text-black text-white font-bold transition-all duration-300 flex items-center justify-center gap-2 group/btn">
                                Start Challenge <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>


            {/* Why Trade with Project X */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 mb-32">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                            Built Different. <br />
                            <span className="text-zinc-500">Engineered for Longevity.</span>
                        </h2>
                        <p className="text-lg text-zinc-400 max-w-md">
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


            {/* Academy Section */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    {/* Left: Visual Element */}
                    <div className="relative h-[400px] w-full bg-[#0A0E14] border border-[#2E3A52] rounded-3xl overflow-hidden flex items-center justify-center group order-2 md:order-1">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#0A0E14] to-[#0A0E14]" />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:30px_30px]" />

                        {/* Books/Learning Visual */}
                        <div className="relative z-10 text-center space-y-4">
                            <div className="text-7xl">📚</div>
                            <div className="text-sm font-mono text-emerald-400 tracking-[0.3em] uppercase">
                                Coming Soon
                            </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute w-[200px] h-[200px] border border-emerald-500/10 rounded-full animate-spin-slow" />
                        <div className="absolute w-[300px] h-[300px] border border-dashed border-white/5 rounded-full animate-reverse-spin" />
                    </div>

                    {/* Right: Content */}
                    <div className="space-y-6 order-1 md:order-2">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]">
                            Academy
                        </div>

                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                            Learn From The Best. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Become The Best.</span>
                        </h2>

                        <p className="text-zinc-400 text-lg leading-relaxed max-w-lg">
                            All the resources you need to unlock your true potential: guides, strategies, market analysis, and weekly sessions with our top traders.
                        </p>

                        <button
                            onClick={() => window.location.href = '/academy'}
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold hover:bg-emerald-500 hover:text-white transition-all duration-300 group"
                        >
                            Go To Academy
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
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
                        <div className="flex-1 space-y-8">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2E81FF]/10 border border-[#2E81FF]/20 text-[#2E81FF] text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20">
                                <Trophy className="w-3 h-3" /> World Class Tech
                            </div>

                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                                Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E81FF] to-cyan-400">High Frequency</span> <br />
                                Prediction Markets.
                            </h2>

                            <p className="text-zinc-400 text-lg leading-relaxed max-w-lg">
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

                        {/* Feature Visual */}
                        <div className="flex-1 w-full relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-20 blur-xl" />
                            <div className="relative bg-[#050505] border border-[#2E3A52] rounded-2xl p-6 md:p-8 shadow-2xl">
                                <div className="flex justify-between items-center border-b border-white/5 pb-6 mb-6">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Live Feed • <span className="text-green-500 animate-pulse">Connected</span></div>
                                </div>

                                <div className="space-y-4 font-mono text-sm">
                                    {[
                                        { user: "User_992", profit: "+$2,490.00", time: "just now" },
                                        { user: "CryptoWiz", profit: "+$8,100.00", time: "2s ago" },
                                        { user: "PredictionKing", profit: "+$1,250.00", time: "5s ago" },
                                        { user: "AlphaSeeker", profit: "+$5,000.00", time: "12s ago" },
                                        { user: "MarketMaker_X", profit: "+$12,400.00", time: "30s ago" }
                                    ].map((row, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 rounded-lg hover:bg-white/5 transition-colors cursor-default group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-green-500 animate-ping' : 'bg-zinc-700'}`} />
                                                <span className="text-zinc-400 group-hover:text-white transition-colors">{row.user}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-green-400 font-bold">{row.profit}</span>
                                                <span className="text-zinc-600 text-xs hidden sm:block">{row.time}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
