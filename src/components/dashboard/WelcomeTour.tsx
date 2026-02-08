"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { Target, Shield, X } from "lucide-react";

export function WelcomeTour() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (searchParams.get("welcome") === "true") {
            setIsVisible(true);
            document.body.style.overflow = "hidden";
            // Remove param so it doesn't show on refresh
            router.replace("/dashboard", { scroll: false });
        }
    }, [searchParams]);

    const handleDismiss = () => {
        setIsVisible(false);
        document.body.style.overflow = "auto";
    };

    const nextStep = () => {
        if (step < 2) setStep(s => s + 1);
        else handleDismiss();
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
                onClick={handleDismiss}
            >
                {/* Step 1: Mission Tracker Spotlight */}
                {step === 0 && (
                    <div className="absolute top-[20%] w-full max-w-4xl px-4" onClick={(e) => e.stopPropagation()}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-zinc-900 border border-primary/50 p-6 rounded-2xl relative shadow-[0_0_50px_rgba(59,130,246,0.2)]"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                                    <Target className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Your Mission Monitor</h3>
                                    <p className="text-zinc-400 leading-relaxed mb-6">
                                        This is your cockpit. Track your **Profit Target** and **Drawdown** limits in real-time here. If your Equity line crosses the red line, the evaluation fails.
                                    </p>
                                    <button
                                        onClick={nextStep}
                                        className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
                                    >
                                        Next: Risk Rules
                                    </button>
                                </div>
                            </div>

                            {/* Decorative Arrow pointing up */}
                            <div className="absolute -top-3 left-12 w-6 h-6 bg-zinc-900 border-t border-l border-primary/50 rotate-45" />
                        </motion.div>
                    </div>
                )}

                {/* Step 2: Risk Meter Spotlight */}
                {step === 1 && (
                    <div className="absolute bottom-[20%] w-full max-w-4xl px-4" onClick={(e) => e.stopPropagation()}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-zinc-900 border border-red-500/50 p-6 rounded-2xl relative shadow-[0_0_50px_rgba(239,68,68,0.2)]"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                    <Shield className="w-8 h-8 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Hard Breach Limits</h3>
                                    <p className="text-zinc-400 leading-relaxed mb-6">
                                        Monitor your **Daily Loss Limit**. This resets every day at 00:00 UTC. Breaching this will instantly liquidate the account.
                                    </p>
                                    <button
                                        onClick={nextStep}
                                        className="bg-white hover:bg-zinc-200 text-black px-6 py-2 rounded-lg font-bold text-sm transition-colors"
                                    >
                                        Compare Markets
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Step 3: Trading Terminal */}
                {step === 2 && (
                    <div className="text-center max-w-lg px-6" onClick={(e) => e.stopPropagation()}>
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl"
                        >
                            <h2 className="text-3xl font-medium text-white mb-4">System Online</h2>
                            <p className="text-zinc-400 mb-8">
                                You are now connected to the live Prediction Market feed. Execution is instant. Good luck.
                            </p>
                            <button
                                onClick={handleDismiss}
                                className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform"
                            >
                                Begin Trading
                            </button>
                        </motion.div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
