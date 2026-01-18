"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { TrendingUp, Zap, ArrowLeftRight } from "lucide-react";

export function ChartsVsReality() {
    const [sliderValue, setSliderValue] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;
        setSliderValue(percentage);
    };

    const handleTouchMove = (e: React.TouchEvent | TouchEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;
        setSliderValue(percentage);
    };

    // Auto-animate when not interacting to show the feature
    useEffect(() => {
        let direction = 1;
        let animationId: number;
        let lastTime = 0;

        const animate = (time: number) => {
            if (!isDragging) {
                if (time - lastTime > 30) { // Limit framerate for this specific auto-movement
                    setSliderValue(prev => {
                        const next = prev + 0.2 * direction;
                        if (next > 65) direction = -1;
                        if (next < 35) direction = 1;
                        return next;
                    });
                    lastTime = time;
                }
            }
            animationId = requestAnimationFrame(animate);
        };

        return () => cancelAnimationFrame(animationId);
    }, [isDragging]);


    return (
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-32 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2E81FF]/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Section Header */}
            <div className="relative text-center space-y-4 mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-tight">
                        Trade <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E81FF] to-cyan-400">Events</span>, Not Noise.
                    </h2>
                    <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mt-6 leading-relaxed">
                        Drag to compare the chaos of technical analysis with the clarity of prediction markets.
                    </p>
                </motion.div>
            </div>

            {/* Interactive Slider Container */}
            <div
                ref={containerRef}
                className="relative w-full max-w-5xl mx-auto h-[500px] rounded-3xl border border-[#2E3A52] overflow-hidden cursor-ew-resize select-none shadow-2xl"
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onMouseMove={(e) => isDragging && handleMouseMove(e)}
                onTouchStart={() => setIsDragging(true)}
                onTouchEnd={() => setIsDragging(false)}
                onTouchMove={(e) => isDragging && handleTouchMove(e)}
            >
                {/* 1. Underlying Layer (Prediction Market - The "New Way") */}
                <div className="absolute inset-0 bg-[#0B0E14] flex flex-col items-center justify-center p-8 select-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#131722] to-[#050505]" />
                    <div className="absolute top-10 right-10 flex items-center gap-2 px-4 py-2 bg-[#2E81FF]/20 border border-[#2E81FF]/30 rounded-full">
                        <Zap className="w-4 h-4 text-[#2E81FF]" />
                        <span className="text-[#2E81FF] font-bold text-sm tracking-widest uppercase">The New Way</span>
                    </div>

                    {/* Clean UI Content */}
                    <div className="relative z-10 flex flex-col items-center gap-8 scale-110 md:scale-125 transition-transform">
                        <div className="text-center space-y-4">
                            <div className="inline-block text-6xl mb-4">🇺🇸</div>
                            <h3 className="text-4xl md:text-5xl font-black text-white leading-none">US Recession in 2026?</h3>
                            <div className="flex items-center justify-center gap-4 text-zinc-500 font-bold tracking-widest text-sm">
                                <span>ECONOMY</span>
                                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                <span>$15.2M VOL</span>
                            </div>
                        </div>

                        <div className="flex gap-4 w-full max-w-md">
                            <div className="flex-1 bg-green-500/10 border border-green-500/30 p-6 rounded-2xl flex flex-col items-center gap-2 group hover:bg-green-500/20 transition-colors">
                                <span className="text-green-500 font-bold uppercase tracking-wider text-sm">Yes</span>
                                <span className="text-4xl font-black text-white">28¢</span>
                            </div>
                            <div className="flex-1 bg-red-500/10 border border-red-500/30 p-6 rounded-2xl flex flex-col items-center gap-2 group hover:bg-red-500/20 transition-colors">
                                <span className="text-red-500 font-bold uppercase tracking-wider text-sm">No</span>
                                <span className="text-4xl font-black text-white">72¢</span>
                            </div>
                        </div>

                        <p className="text-blue-200/60 font-medium text-lg mt-4">Simple. Binary. Logic.</p>
                    </div>
                </div>

                {/* 2. Overlay Layer (Technical Analysis - The "Old Way") */}
                <div
                    className="absolute inset-0 bg-[#050505] overflow-hidden"
                    style={{
                        clipPath: `polygon(0 0, ${sliderValue}% 0, ${sliderValue}% 100%, 0 100%)`
                    }}
                >
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 select-none border-r border-white/20">
                        <div className="absolute top-10 left-10 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full z-20">
                            <TrendingUp className="w-4 h-4 text-red-400" />
                            <span className="text-red-400 font-bold text-sm tracking-widest uppercase">The Old Way</span>
                        </div>

                        {/* Complex Chart Content (Same as before, but full size) */}
                        <div className="relative w-full h-full opacity-40 scale-105">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
                                {[...Array(100)].map((_, i) => (
                                    <div key={i} className="border-[0.5px] border-zinc-800/50" />
                                ))}
                            </div>

                            {/* Candesticks SVG */}
                            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                {/* Just random noise lines */}
                                <path d="M0 300 L50 250 L100 280 L150 200 L200 220 L250 150 L300 180 L350 100 L400 120 L450 50" fill="none" stroke="#ef4444" strokeWidth="2" />
                                <path d="M0 320 L60 290 L120 310 L180 240 L240 260 L300 190 L360 210 L420 130" fill="none" stroke="#22c55e" strokeWidth="2" />
                                {/* Indicators */}
                                <path d="M0 400 Q 200 300 400 350 T 800 300" fill="none" stroke="#3b82f6" strokeWidth="3" opacity="0.5" />
                                <path d="M0 450 Q 300 400 600 420 T 900 380" fill="none" stroke="#eab308" strokeWidth="3" opacity="0.5" />
                            </svg>

                            {/* Floating Indicators Overlay */}
                            <div className="absolute top-1/4 left-1/4 space-y-2 font-mono text-xs">
                                <div className="text-red-400">RSI: 88.2 (Overbought)</div>
                                <div className="text-blue-400">MACD: Bearish Div</div>
                                <div className="text-yellow-400">Elliott Wave: Wave 5?</div>
                                <div className="text-zinc-500">Fib Retracement: 0.618</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Slider Handle */}
                <div
                    className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-30 shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                    style={{ left: `${sliderValue}%` }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl text-black">
                        <ArrowLeftRight className="w-5 h-5" />
                    </div>
                </div>

            </div>

            {/* Instruction Cue */}
            <div className="text-center mt-8 text-zinc-500 text-sm font-medium animate-pulse">
                &larr; Drag Slider &rarr;
            </div>

        </section>
    );
}
