"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { TrendingUp, Wallet, ArrowUpRight, Zap, Globe, Activity, BarChart2 } from "lucide-react";
import { useEffect, useState } from "react";

export function Hero3DCard() {
    // Mouse interaction state
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth physics-based spring animation for the parallax
    const mouseX = useSpring(x, { stiffness: 50, damping: 15 });
    const mouseY = useSpring(y, { stiffness: 50, damping: 15 });

    // Calculate rotation based on mouse position
    const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
    const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

    // Handle mouse movement
    function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        x.set(event.clientX - centerX);
        y.set(event.clientY - centerY);
    }

    // Reset on mouse leave
    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <div
            className="relative w-full h-[600px] flex items-center justify-center perspective-[1200px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Background Atmosphere */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#2E81FF]/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Main Rotatable Container */}
            <motion.div
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                className="relative w-[380px] h-[500px] md:w-[420px]"
            >
                {/* 1. CENTRAL ENGINE: Main Market Card */}
                <motion.div
                    style={{ transform: "translateZ(50px)" }}
                    className="absolute inset-x-0 top-10 bg-[#0B0E14]/80 backdrop-blur-2xl border border-[#2E3A52] rounded-3xl p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,1),0_0_0_1px_rgba(255,255,255,0.05)] z-20 group"
                >
                    {/* Gloss Sheen Animation (Rounded) */}
                    <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-200%] group-hover:animate-shine" />
                    </div>

                    {/* Header */}
                    <div className="flex items-start justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2E81FF] to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(46,129,255,0.4)]">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-[#2E81FF] uppercase tracking-widest mb-0.5">Prediction Engine</p>
                                <h3 className="text-white font-bold text-xl leading-tight">Fed Rate Cut <br /> in March?</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#2E81FF]/10 border border-[#2E81FF]/20 text-[#2E81FF] text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#2E81FF]" /> Live
                        </div>
                    </div>

                    {/* The Chart Visual */}
                    <div className="relative h-40 w-full mb-6 rounded-xl border border-[#2E81FF]/20 overflow-hidden bg-[url('/grid-pattern.svg')]">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#2E81FF]/5 to-transparent" />

                        {/* Animated Line */}
                        <svg className="absolute inset-0 w-full h-full overflow-visible">
                            <motion.path
                                d="M0,100 C80,100 120,60 200,50 C280,40 320,20 420,10"
                                fill="none"
                                stroke="#2E81FF"
                                strokeWidth="3"
                                className="drop-shadow-[0_0_10px_rgba(46,129,255,0.5)]"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 2, ease: "easeInOut" }}
                            />
                            <motion.circle
                                cx="420" cy="10" r="4" fill="#fff"
                                className="drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 2 }}
                            />
                        </svg>

                        {/* Probability Badge */}
                        <div className="absolute top-4 right-4 bg-[#2E81FF] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg shadow-blue-500/20 tabular-nums">
                            92% PROBABILITY
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-[#131722]/80 border border-[#2E3A52]">
                            <p className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Your Position</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-white font-black text-xl">YES</span>
                                <span className="text-[#00b67a] text-xs font-bold">+18.2%</span>
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#131722]/80 border border-[#2E3A52]">
                            <p className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Unrealized P&L</p>
                            <span className="text-white font-black text-xl tabular-nums">$4,250.00</span>
                        </div>
                    </div>

                    {/* Primary Action */}
                    <button className="w-full h-12 bg-[#00b67a] hover:bg-[#00a06b] text-white text-sm font-black uppercase tracking-wide rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(0,182,122,0.4)] flex items-center justify-center gap-2 group">
                        Close Position <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>

                    {/* Gloss Reflection Wrapper */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                </motion.div>

                {/* 2. SATELLITE: Order Book (Right Orbit) - Z=75 */}
                <motion.div
                    style={{ transform: "translateZ(75px) translateX(60px) translateY(-40px)" }}
                    className="absolute -right-24 top-20 w-48 bg-[#0B0E14]/90 backdrop-blur-xl border border-[#2E3A52] rounded-2xl p-4 shadow-xl z-30"
                >
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#2E3A52]">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Order Book</span>
                        <BarChart2 className="w-3 h-3 text-zinc-500" />
                    </div>
                    <div className="space-y-1.5">
                        {[92, 91, 90, 89].map((price, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px]">
                                <span className="text-red-400 font-mono">{price}¢</span>
                                <span className="text-zinc-500 tabular-nums">{(Math.random() * 50000).toFixed(0)}</span>
                                <div className="w-12 h-1 bg-red-400/20 rounded-full overflow-hidden">
                                    <div style={{ width: `${Math.random() * 100}%` }} className="h-full bg-red-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* 3. SATELLITE: Success Notification (Left Orbit) - Z=150 */}
                <motion.div
                    style={{ transform: "translateZ(150px) translateX(-40px) translateY(180px)" }}
                    className="absolute -left-12 bottom-32 w-auto bg-[#131722] border border-[#2E3A52] p-3 pr-5 rounded-2xl shadow-2xl flex items-center gap-3 z-50"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="w-10 h-10 rounded-full bg-[#00b67a]/20 flex items-center justify-center ring-1 ring-[#00b67a]/40">
                        <Wallet className="w-5 h-5 text-[#00b67a]" />
                    </div>
                    <div>
                        <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-wider">Payout Processed</p>
                        <p className="text-white font-black text-lg tabular-nums">+$850.00</p>
                    </div>
                </motion.div>

                {/* 4. SATELLITE: Live News (Bottom Orbit) - Z=80 */}
                <motion.div
                    style={{ transform: "translateZ(80px) translateY(140px)" }}
                    className="absolute bottom-[-20px] inset-x-4 bg-[#0B0E14] border border-[#2E3A52] rounded-xl p-3 flex items-center gap-3 z-40"
                >
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-[10px] font-medium text-zinc-400 truncate">
                        BREAKING: Institutional Volume detects spike in YES contracts...
                    </p>
                </motion.div>

            </motion.div>
        </div>
    );
}
