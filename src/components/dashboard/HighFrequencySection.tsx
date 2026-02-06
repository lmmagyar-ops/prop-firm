"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Zap, Activity, Layers, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
type TerminalState = "DEFAULT" | "EXECUTION" | "VELOCITY" | "LIQUIDITY" | "SETTLEMENT";

// --- Components ---

const TypewriterLine = ({ text, delay = 0, color = "text-zinc-400" }: { text: string; delay?: number; color?: string }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.2 }}
            className={`font-mono text-xs ${color} truncate`}
        >
            <span className="opacity-50 mr-2">{new Date().toISOString().split('T')[1].slice(0, 12)}</span>
            {text}
        </motion.div>
    );
};

const TerminalDisplay = ({ state }: { state: TerminalState }) => {
    // Force re-render on state change to restart animations
    return (
        <div className="h-full w-full p-6 md:p-8 font-mono overflow-hidden flex flex-col relative">
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] pointer-events-none z-20 opacity-20" />

            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4 z-10">
                <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest">
                    {state === "DEFAULT" ? "System Monitor" : `Mode: --${state.toLowerCase()}`}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative z-10 overflow-hidden">
                <AnimatePresence mode="wait">
                    {state === "DEFAULT" && (
                        <motion.div
                            key="default"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            <div className="mb-6">
                                <div className="text-xs text-zinc-500 mb-1">$ polymarket --status</div>
                                <div className="text-sm text-[#29af73] font-bold">POLYMARKET NETWORK: CONNECTED</div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                                    <span className="text-zinc-400 text-xs">Uptime</span>
                                    <span className="text-emerald-400 text-xs font-bold">99.99%</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                                    <span className="text-zinc-400 text-xs">Latency</span>
                                    <span className="text-emerald-400 text-xs font-bold">42ms</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                                    <span className="text-zinc-400 text-xs">Active Mkts</span>
                                    <span className="text-purple-400 text-xs font-bold">15,420</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <span className="text-xs text-zinc-600 animate-pulse">Waiting for command...</span>
                            </div>
                        </motion.div>
                    )}

                    {state === "EXECUTION" && (
                        <motion.div key="execution" className="space-y-1">
                            <TypewriterLine text="> INIT_EXECUTION_ENGINE" color="text-white" />
                            <TypewriterLine text="> CONNECTING_CLOB... OK" delay={0.1} color="text-emerald-500" />
                            <TypewriterLine text="[EXEC] BUY 'TRUMP' @ $0.45 | qty: 5000" delay={0.3} color="text-blue-400" />
                            <TypewriterLine text="[EXEC] SELL 'BIDEN' @ $0.12 | qty: 2500" delay={0.4} color="text-red-400" />
                            <TypewriterLine text="[FILL] ORDER #88219 CONFIRMED (32ms)" delay={0.6} color="text-zinc-300" />
                            <TypewriterLine text="[FILL] ORDER #88220 CONFIRMED (28ms)" delay={0.8} color="text-zinc-300" />
                            <TypewriterLine text="> SPEED_OPTIMIZED" delay={1} color="text-emerald-500" />
                        </motion.div>
                    )}

                    {state === "VELOCITY" && (
                        <motion.div key="velocity" className="space-y-1">
                            <TypewriterLine text="> ANALYZING_TURNOVER" color="text-white" />
                            <TypewriterLine text="CAPITAL_DEPLOYED: $25,000.00" delay={0.1} />
                            <TypewriterLine text="DAILY_VOLUME: $142,500.00" delay={0.2} color="text-blue-400" />
                            <TypewriterLine text="POSITIONS_CLOSED: 42" delay={0.3} />
                            <div className="py-2 border-y border-white/10 my-2">
                                <div className="text-xs text-zinc-500">VELOCITY_MULTIPLIER</div>
                                <div className="text-xl font-black text-purple-400">5.7x</div>
                            </div>
                            <TypewriterLine text="> FEE_REBATE_ACTIVED" delay={0.5} color="text-emerald-500" />
                        </motion.div>
                    )}

                    {state === "LIQUIDITY" && (
                        <motion.div key="liquidity" className="space-y-1">
                            <TypewriterLine text="> FETCHING_DEPTH_CHART" color="text-white" />
                            <div className="font-mono text-[10px] leading-tight opacity-80 mt-2">
                                <div className="flex justify-between text-red-400"><span>0.68</span> <span>250,000</span></div>
                                <div className="flex justify-between text-red-500"><span>0.67</span> <span>125,000</span></div>
                                <div className="flex justify-between text-red-600 border-b border-red-900/30 mb-1"><span>0.66</span> <span>50,000</span></div>
                                <div className="text-center text-zinc-500 text-xs py-1">--- SPREAD ---</div>
                                <div className="flex justify-between text-green-600 border-t border-green-900/30 mt-1"><span>0.65</span> <span>75,000</span></div>
                                <div className="flex justify-between text-green-500"><span>0.64</span> <span>150,000</span></div>
                                <div className="flex justify-between text-green-400"><span>0.63</span> <span>300,000</span></div>
                            </div>
                            <TypewriterLine text="> LIQUIDITY_SCORE: HIGH" delay={0.4} color="text-blue-400" />
                        </motion.div>
                    )}

                    {state === "SETTLEMENT" && (
                        <motion.div key="settlement" className="space-y-1">
                            <TypewriterLine text="> INITIATE_SETTLEMENT" color="text-white" />
                            <TypewriterLine text="VERIFYING_WALLET... OK" delay={0.2} color="text-emerald-500" />
                            <TypewriterLine text="BATCHING_TRANSFERS... " delay={0.4} />
                            <TypewriterLine text="TX_HASH: 0x7f...3a2b" delay={0.6} color="text-blue-400" />
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded mt-2">
                                <div className="text-xs text-emerald-400 font-bold flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3" /> SETTLEMENT COMPLETE
                                </div>
                                <div className="text-[10px] text-emerald-400/70">USDC SENT via POLYGON</div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#050505] to-transparent z-10 flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-500 font-mono">LIVE</span>
                </div>
                <span className="text-zinc-700 font-mono border border-zinc-900 bg-zinc-950 px-1 rounded">v2.4.0-stable</span>
            </div>
        </div>
    );
};

export function HighFrequencySection() {
    const [activeState, setActiveState] = useState<TerminalState>("DEFAULT");

    const features = [
        {
            id: "EXECUTION",
            icon: Zap,
            title: "Direct Market Access",
            desc: "Executions < 100ms. Direct connection to the Polymarket CLOB.",
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "group-hover:border-blue-500/50"
        },
        {
            id: "VELOCITY",
            icon: Activity,
            title: "Institutional Velocity",
            desc: "Smart carry costs. High turnover strategies are encouraged.",
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "group-hover:border-purple-500/50"
        },
        {
            id: "LIQUIDITY",
            icon: Layers,
            title: "Deep Liquidity",
            desc: "Access to $2.1B+ combined volume across all markets.",
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
            border: "group-hover:border-cyan-500/50"
        },
        {
            id: "SETTLEMENT",
            icon: Lock,
            title: "Bank-Grade Settlement",
            desc: "Bi-weekly USDC payouts. Audited smart contracts on Polygon.",
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "group-hover:border-emerald-500/50"
        }
    ];

    return (
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-32">
            <div className="relative bg-gradient-to-b from-[#131722] to-[#0B0E14] border border-[#2E3A52] rounded-[40px] p-8 md:p-16 overflow-hidden">
                {/* Background Grid/Glow */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(46,129,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(46,129,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">

                    {/* Left: Content & Interactive List */}
                    <div className="flex-1 space-y-8 text-center lg:text-left">
                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                            Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#29af73] to-cyan-400">High Frequency</span> <br />
                            Prediction Markets.
                        </h2>

                        <p className="text-zinc-400 text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                            Experience the speed and precision of a real trading desk. Our infrastructure is designed to handle the velocity of modern prediction markets.
                        </p>

                        <div className="grid gap-4 pt-4 text-left">
                            {features.map((feat) => (
                                <div
                                    key={feat.id}
                                    onMouseEnter={() => setActiveState(feat.id as TerminalState)}
                                    // Optional: onMouseLeave={() => setActiveState("DEFAULT")} 
                                    className={`group relative p-4 rounded-2xl border border-transparent hover:bg-[#1A1F2B] transition-all duration-300 cursor-default ${activeState === feat.id ? 'bg-[#1A1F2B] border-[#2E3A52]' : ''}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center flex-shrink-0 border border-white/5 group-hover:scale-110 transition-transform`}>
                                            <feat.icon className={`w-5 h-5 ${feat.color}`} />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-lg text-zinc-200 group-hover:text-white transition-colors ${activeState === feat.id ? 'text-white' : ''}`}>
                                                {feat.title}
                                            </h3>
                                            <p className="text-zinc-500 text-sm leading-relaxed group-hover:text-zinc-400 transition-colors">
                                                {feat.desc}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Active Indicator Line */}
                                    {activeState === feat.id && (
                                        <motion.div
                                            layoutId="active-line"
                                            className="absolute left-0 top-4 bottom-4 w-1 bg-[#29af73] rounded-r-full"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: The Interactive Terminal */}
                    <div className="flex-1 w-full relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-20 blur-xl" />
                        <div className="relative bg-[#050505] border border-[#2E3A52] rounded-2xl shadow-2xl h-[500px] w-full max-w-md mx-auto overflow-hidden ring-1 ring-white/5">
                            <TerminalDisplay state={activeState} />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
