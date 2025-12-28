"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck, Terminal, Target, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingProps {
    challenge: {
        startingBalance: number;
        profitTarget: number;
        maxDrawdown: number;
    }
}

export function OnboardingSequence({ challenge }: OnboardingProps) {
    const router = useRouter();
    const [step, setStep] = useState(0); // 0=Logs, 1=Vault, 2=Brief

    const { startingBalance, profitTarget, maxDrawdown } = challenge || { startingBalance: 10000, profitTarget: 500, maxDrawdown: 1000 };

    // Sequence Timing
    useEffect(() => {
        // 0s: Start (Handshake)
        const t1 = setTimeout(() => setStep(1), 2500);  // Switch to Vault
        // 2.5s -> 6.5s: Vault Animation
        const t2 = setTimeout(() => setStep(2), 6500); // Switch to Brief (Manual Launch)

        return () => {
            clearTimeout(t1); clearTimeout(t2);
        };
    }, []);

    const launchTerminal = () => {
        router.push("/dashboard?welcome=true");
    };

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center font-mono text-white">

            {/* Background Grid Scan */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
                <motion.div
                    initial={{ top: "-10%" }}
                    animate={{ top: "110%" }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-[2px] bg-blue-500/30 blur-[2px]"
                />
            </div>

            {/* Main Stage */}
            <div className="relative z-10 w-full max-w-2xl p-8 flex flex-col items-center justify-center">

                <AnimatePresence mode="wait">

                    {/* STEP 0: HANDSHAKE (Text Stream) */}
                    {step === 0 && (
                        <motion.div
                            key="handshake"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, filter: "blur(10px)" }}
                            className="space-y-4 w-full max-w-md"
                        >
                            <div className="flex items-center gap-3 text-blue-500 mb-8 border-b border-blue-500/20 pb-4">
                                <Terminal className="w-5 h-5 animate-pulse" />
                                <span className="text-xs font-bold tracking-[0.2em]">SECURE_UPLINK</span>
                            </div>
                            <LogLine delay={0}>Initializing neural handshake...</LogLine>
                            <LogLine delay={0.4}>Verifying biometric hash [0x9F...A2]</LogLine>
                            <LogLine delay={0.8}>Establishing connection to HFT Core...</LogLine>
                            <LogLine delay={1.2} color="text-green-500">{">>"} HANDSHAKE_COMPLETE</LogLine>
                        </motion.div>
                    )}

                    {/* STEP 1: THE VAULT */}
                    {step === 1 && (
                        <motion.div
                            key="vault"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0, filter: "brightness(2)" }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="text-center"
                        >
                            {/* The Digital Core */}
                            <div className="relative w-48 h-48 mx-auto mb-12">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, ease: "linear", repeat: Infinity }}
                                    className="absolute inset-0 rounded-full border border-zinc-800 border-t-blue-500/50 border-r-transparent"
                                />
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 12, ease: "linear", repeat: Infinity }}
                                    className="absolute inset-4 rounded-full border border-zinc-800 border-b-purple-500/50 border-l-transparent"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <ShieldCheck className="w-16 h-16 text-white" />
                                </div>
                            </div>

                            {/* The Numbers */}
                            <div className="space-y-2">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-xs font-bold text-zinc-500 uppercase tracking-widest"
                                >
                                    Allocating Capital
                                </motion.div>
                                <div className="text-5xl font-black text-white font-mono tracking-tighter">
                                    $<Counter from={0} to={startingBalance} duration={3} />.00
                                </div>
                                <div className="text-sm font-bold text-blue-500">USD EVALUATION LIMIT</div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: MISSION BRIEF (Manual Launch) */}
                    {step === 2 && (
                        <motion.div
                            key="brief"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="w-full max-w-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl"
                        >
                            <div className="text-center mb-8">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", delay: 0.2 }}
                                    className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-[0_0_40px_-10px_rgba(34,197,94,0.3)]"
                                >
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </motion.div>
                                <h1 className="text-3xl font-bold text-white mb-2">
                                    Evaluation Account Active
                                </h1>
                                <p className="text-zinc-400">
                                    Your trading environment is ready. Review objectives.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <BriefCard
                                    icon={Target}
                                    color="blue"
                                    label="Target"
                                    value={`$${profitTarget.toLocaleString()}`}
                                    sub={`reach $${(startingBalance + profitTarget).toLocaleString()}`}
                                    delay={0.4}
                                />
                                <BriefCard
                                    icon={Shield}
                                    color="zinc"
                                    label="Balance"
                                    value={`$${startingBalance.toLocaleString()}`}
                                    sub="simulated capital"
                                    delay={0.5}
                                />
                                <BriefCard
                                    icon={Shield}
                                    color="red"
                                    label="Max Loss"
                                    value={`$${maxDrawdown.toLocaleString()}`}
                                    sub="hard breach"
                                    delay={0.6}
                                />
                            </div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="flex justify-center"
                            >
                                <Button
                                    size="lg"
                                    onClick={launchTerminal}
                                    className="h-14 px-10 text-lg bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all rounded-full font-bold shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] flex items-center gap-3"
                                >
                                    Launch Terminal
                                    <ArrowRight className="w-5 h-5" />
                                </Button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// --- Sub Components ---

function LogLine({ children, delay, color = "text-zinc-400" }: { children: React.ReactNode, delay: number, color?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.3 }}
            className={cn("font-mono text-sm border-l-2 border-transparent pl-3 py-1", color === "text-zinc-400" ? "border-zinc-800" : "border-opacity-0")}
        >
            <span className={cn("mr-2 opacity-50", color)}>{">"}</span>
            <span className={color}>{children}</span>
        </motion.div>
    );
}

function Counter({ from, to, duration }: { from: number, to: number, duration: number }) {
    const [count, setCount] = useState(from);
    useEffect(() => {
        let startTime: number;
        let animationFrame: number;
        const update = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

            // Force exact end value
            if (progress === 1) {
                setCount(to);
            } else {
                const ease = 1 - Math.pow(2, -10 * progress);
                setCount(Math.floor(from + (to - from) * ease));
                animationFrame = requestAnimationFrame(update);
            }
        };
        animationFrame = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationFrame);
    }, [from, to, duration]);
    return <span>{count.toLocaleString()}</span>;
}

function BriefCard({ icon: Icon, color, label, value, sub, delay }: any) {
    const colorClass = color === "blue" ? "text-blue-400" : color === "red" ? "text-red-400" : "text-zinc-400";
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bg-zinc-950/50 border border-zinc-800 p-4 rounded-xl text-center"
        >
            <div className={`flex items-center justify-center gap-2 mb-2 ${colorClass}`}>
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">{value}</div>
            <div className="text-[10px] text-zinc-500 mt-1">{sub}</div>
        </motion.div>
    );
}
