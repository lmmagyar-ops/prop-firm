"use client";

import { motion } from "framer-motion";
import { TrendingUp, Zap } from "lucide-react";

export function ChartsVsReality() {
    return (
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-32 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2E81FF]/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Section Header */}
            <div className="relative text-center space-y-4 mb-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-tight">
                        Trade <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E81FF] to-cyan-400">Events</span>, Not Charts.
                    </h2>
                    <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mt-6 leading-relaxed">
                        Stop fighting algorithms with technical analysis. Use your real-world knowledge to profit from global events.
                    </p>
                </motion.div>
            </div>

            {/* Split Comparison */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 relative">

                {/* LEFT: The Old Way (Forex/Traditional) */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="relative group"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />

                    <div className="relative bg-[#0A0E14] border border-red-900/30 rounded-3xl p-8 overflow-hidden">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-6">
                            <TrendingUp className="w-3 h-3" /> The Old Way
                        </div>

                        {/* Complex Chart Visualization */}
                        <div className="relative h-[400px] bg-[#050505] rounded-2xl border border-zinc-800 p-4 overflow-hidden">
                            {/* Chart Header */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                                </div>
                                <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">EUR/USD • 1H</div>
                            </div>

                            {/* Simulated Complex Chart */}
                            <div className="relative h-full opacity-60">
                                {/* Candlesticks */}
                                <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                                    {/* Grid lines */}
                                    {[...Array(6)].map((_, i) => (
                                        <line key={`h-${i}`} x1="0" y1={i * 60} x2="400" y2={i * 60} stroke="#27272a" strokeWidth="0.5" />
                                    ))}
                                    {[...Array(8)].map((_, i) => (
                                        <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="300" stroke="#27272a" strokeWidth="0.5" />
                                    ))}

                                    {/* Random candlesticks */}
                                    {[...Array(20)].map((_, i) => {
                                        const x = i * 20;
                                        const open = 100 + Math.random() * 100;
                                        const close = open + (Math.random() - 0.5) * 40;
                                        const high = Math.max(open, close) + Math.random() * 20;
                                        const low = Math.min(open, close) - Math.random() * 20;
                                        const isGreen = close > open;

                                        return (
                                            <g key={i}>
                                                <line x1={x + 10} y1={high} x2={x + 10} y2={low} stroke={isGreen ? "#22c55e" : "#ef4444"} strokeWidth="1" />
                                                <rect x={x + 5} y={Math.min(open, close)} width="10" height={Math.abs(close - open)} fill={isGreen ? "#22c55e" : "#ef4444"} />
                                            </g>
                                        );
                                    })}

                                    {/* Indicator lines (RSI, MACD, etc.) */}
                                    <path d="M 0 150 Q 100 120, 200 140 T 400 160" stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.5" />
                                    <path d="M 0 180 Q 100 160, 200 170 T 400 190" stroke="#8b5cf6" strokeWidth="2" fill="none" opacity="0.5" />
                                    <path d="M 0 100 Q 100 130, 200 110 T 400 140" stroke="#f59e0b" strokeWidth="2" fill="none" opacity="0.5" />
                                </svg>

                                {/* Overlaid Indicators */}
                                <div className="absolute top-2 left-2 space-y-1">
                                    <div className="text-[8px] font-mono text-blue-400">RSI(14): 67.3</div>
                                    <div className="text-[8px] font-mono text-purple-400">MACD: 0.0012</div>
                                    <div className="text-[8px] font-mono text-amber-400">BB(20,2): 1.0892</div>
                                    <div className="text-[8px] font-mono text-green-400">EMA(50): 1.0845</div>
                                </div>
                            </div>
                        </div>

                        {/* Caption */}
                        <div className="mt-6 space-y-2">
                            <h3 className="text-xl font-bold text-red-400">Technical Analysis. Patterns. Noise.</h3>
                            <p className="text-sm text-zinc-500 leading-relaxed">
                                Years of study. Dozens of indicators. Still guessing where the price goes next.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* RIGHT: The New Way (Prediction Markets) */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.4 }}
                    className="relative group"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#2E81FF] to-cyan-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative bg-[#0A0E14] border border-[#2E81FF]/30 rounded-3xl p-8">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2E81FF]/10 border border-[#2E81FF]/20 text-[#2E81FF] text-xs font-bold uppercase tracking-wider mb-6">
                            <Zap className="w-3 h-3" /> The New Way
                        </div>

                        {/* Clean Prediction Market Card */}
                        <div className="relative h-[400px] bg-gradient-to-b from-[#131722] to-[#0B0E14] rounded-2xl border border-[#2E3A52] p-6 flex flex-col">
                            {/* Market Question */}
                            <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6">
                                {/* Icon/Visual */}
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center text-4xl border border-zinc-700 shadow-lg">
                                        🇺🇸
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-2xl border border-zinc-700 shadow-lg">
                                        📉
                                    </div>
                                </div>

                                {/* Question */}
                                <h3 className="text-2xl font-black text-white leading-tight max-w-sm">
                                    US recession in 2026?
                                </h3>

                                {/* Market Info */}
                                <div className="flex items-center gap-3 text-xs font-bold text-zinc-500">
                                    <span className="text-blue-400">ECONOMY</span>
                                    <span>•</span>
                                    <span>VOL: $15.2M</span>
                                </div>
                            </div>

                            {/* Trading Buttons */}
                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <button className="group/btn relative overflow-hidden bg-green-500/10 hover:bg-green-500/20 active:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 active:border-green-500 rounded-xl p-4 transition-all duration-300 active:scale-95 active:shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                                    <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent opacity-0 group-hover/btn:opacity-100 group-active/btn:opacity-100 transition-opacity" />
                                    <div className="relative space-y-1">
                                        <div className="text-xs font-bold text-green-400 uppercase tracking-wider">Yes</div>
                                        <div className="text-2xl font-black text-green-400">28¢</div>
                                    </div>
                                </button>

                                <button className="group/btn relative overflow-hidden bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 active:border-red-500 rounded-xl p-4 transition-all duration-300 active:scale-95 active:shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                                    <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent opacity-0 group-hover/btn:opacity-100 group-active/btn:opacity-100 transition-opacity" />
                                    <div className="relative space-y-1">
                                        <div className="text-xs font-bold text-red-400 uppercase tracking-wider">No</div>
                                        <div className="text-2xl font-black text-red-400">72¢</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Caption */}
                        <div className="mt-6 space-y-2">
                            <h3 className="text-xl font-bold text-[#2E81FF]">News. Events. Logic.</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                Read the news. Make a prediction. Profit. No charts required.
                            </p>
                        </div>
                    </div>
                </motion.div>

            </div>

            {/* Bottom CTA */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-center mt-16"
            >
                <p className="text-lg text-zinc-400 mb-6">
                    <span className="text-white font-bold">Prediction markets are inherently easier to understand than Forex.</span>
                    <br />
                    If you can read the news, you can trade.
                </p>
            </motion.div>
        </section>
    );
}
