"use client";

import { useEffect, useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Crown, TrendingUp, Shield, Calendar, UserCheck } from "lucide-react";
import ShinyText from "@/components/reactbits/ShinyText";
import CountUp from "@/components/reactbits/CountUp";
import SplitText from "@/components/reactbits/SplitText";
import SpotlightCard from "@/components/reactbits/SpotlightCard";

interface FundedTransitionModalProps {
    challengeId: string;
    tier: "5k" | "10k" | "25k";
    profitSplit: number;
    payoutCap: number;
    maxDailyDrawdown: number;
    maxTotalDrawdown: number;
    startingBalance: number;
    minTradingDays: number;
}

const STORAGE_PREFIX = "funded-transition-seen-";

export function FundedTransitionModal({
    challengeId,
    tier,
    profitSplit,
    payoutCap,
    maxDailyDrawdown,
    maxTotalDrawdown,
    startingBalance,
    minTradingDays,
}: FundedTransitionModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const storageKey = `${STORAGE_PREFIX}${challengeId}`;

    useEffect(() => {
        try {
            if (!localStorage.getItem(storageKey)) {
                setIsOpen(true);
            }
        } catch {
            // SSR or storage disabled
        }
    }, [storageKey]);

    const handleDismiss = () => {
        setIsOpen(false);
        try {
            localStorage.setItem(storageKey, new Date().toISOString());
        } catch {
            // Storage disabled
        }
    };

    const tierLabel = tier === "5k" ? "$5,000" : tier === "10k" ? "$10,000" : "$25,000";
    const dailyPct = startingBalance > 0 ? Math.round((maxDailyDrawdown / startingBalance) * 100) : 4;
    const totalPct = startingBalance > 0 ? Math.round((maxTotalDrawdown / startingBalance) * 100) : 8;
    const splitPct = Math.round(profitSplit * 100);

    return (
        <AlertDialog open={isOpen} onOpenChange={handleDismiss}>
            <AlertDialogContent className="bg-[#111820] border border-emerald-500/30 text-white max-w-lg p-0 overflow-hidden">
                {/* Emerald glow border effect */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-emerald-500/10 via-transparent to-emerald-500/5 pointer-events-none" />

                <div className="relative p-6 pb-4">
                    {/* Crown icon with pulsing glow */}
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                            <div className="relative w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-[0_0_50px_-12px_rgba(16,185,129,0.5)]">
                                <Crown className="w-10 h-10 text-emerald-400" />
                            </div>
                        </div>
                    </div>

                    {/* Shiny animated title */}
                    <div className="text-center mb-1">
                        <ShinyText
                            text="You're Funded!"
                            color="#34d399"
                            shineColor="#a7f3d0"
                            speed={3}
                            className="text-3xl font-bold"
                        />
                    </div>

                    {/* Staggered subtitle reveal */}
                    <div className="text-center mb-5">
                        <SplitText
                            text={`You passed the ${tierLabel} challenge.`}
                            className="text-sm text-zinc-400"
                            delay={0.03}
                            duration={0.4}
                            splitType="words"
                            from={{ opacity: 0, y: 10 }}
                            to={{ opacity: 1, y: 0 }}
                        />
                    </div>

                    {/* Animated stat cards with spotlight hover */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <SpotlightCard
                            className="rounded-xl"
                            spotlightColor="rgba(52, 211, 153, 0.12)"
                            spotlightSize={250}
                        >
                            <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700/40 h-full">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Profit Split</span>
                                </div>
                                <p className="text-2xl font-bold text-white">
                                    <CountUp to={splitPct} from={0} duration={1.5} delay={0.3} suffix="%" />
                                </p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                    You keep {splitPct}% of profits
                                </p>
                            </div>
                        </SpotlightCard>

                        <SpotlightCard
                            className="rounded-xl"
                            spotlightColor="rgba(251, 191, 36, 0.12)"
                            spotlightSize={250}
                        >
                            <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700/40 h-full">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Drawdown</span>
                                </div>
                                <p className="text-2xl font-bold text-white">
                                    <CountUp to={totalPct} from={0} duration={1.5} delay={0.5} suffix="%" />
                                </p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                    Max total / {dailyPct}% daily
                                </p>
                            </div>
                        </SpotlightCard>

                        <SpotlightCard
                            className="rounded-xl"
                            spotlightColor="rgba(59, 130, 246, 0.12)"
                            spotlightSize={250}
                        >
                            <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700/40 h-full">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Payout Cycle</span>
                                </div>
                                <p className="text-2xl font-bold text-white">
                                    <CountUp to={minTradingDays} from={0} duration={1.5} delay={0.7} />
                                    <span className="text-base font-medium text-zinc-400 ml-1">days</span>
                                </p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                    Min trading days per payout
                                </p>
                            </div>
                        </SpotlightCard>

                        <SpotlightCard
                            className="rounded-xl"
                            spotlightColor="rgba(139, 92, 246, 0.12)"
                            spotlightSize={250}
                        >
                            <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700/40 h-full">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <UserCheck className="w-3.5 h-3.5 text-violet-400" />
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">KYC Required</span>
                                </div>
                                <p className="text-lg font-bold text-white leading-tight mt-0.5">Before Payout</p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                    Identity verification needed
                                </p>
                            </div>
                        </SpotlightCard>
                    </div>

                    {/* Payout cap */}
                    <p className="text-[11px] text-zinc-500 text-center mt-3">
                        Max payout per cycle:{" "}
                        <span className="text-zinc-300 font-medium">${payoutCap.toLocaleString()}</span>
                    </p>
                </div>

                <AlertDialogFooter className="px-6 pb-5 pt-0 sm:justify-center">
                    <AlertDialogAction asChild>
                        <Button
                            onClick={handleDismiss}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 text-base rounded-xl transition-all duration-200 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.6)]"
                        >
                            Start Trading
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
