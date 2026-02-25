"use client";

import { useEffect, useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Crown, TrendingUp, Shield, Calendar, UserCheck } from "lucide-react";

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
        // Show modal only once per funded transition
        try {
            if (!localStorage.getItem(storageKey)) {
                setIsOpen(true);
            }
        } catch {
            // SSR or storage disabled — don't show
        }
    }, [storageKey]);

    const handleDismiss = () => {
        setIsOpen(false);
        try {
            localStorage.setItem(storageKey, new Date().toISOString());
        } catch {
            // Storage disabled — fail silently
        }
    };

    const tierLabel = tier === "5k" ? "$5,000" : tier === "10k" ? "$10,000" : "$25,000";
    const dailyPct = startingBalance > 0 ? ((maxDailyDrawdown / startingBalance) * 100).toFixed(0) : "4";
    const totalPct = startingBalance > 0 ? ((maxTotalDrawdown / startingBalance) * 100).toFixed(0) : "8";

    return (
        <AlertDialog open={isOpen} onOpenChange={handleDismiss}>
            <AlertDialogContent className="bg-[#1A232E] border-emerald-500/40 text-white max-w-lg">
                <AlertDialogHeader className="items-center text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3 border border-emerald-500/20 shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)]">
                        <Crown className="w-10 h-10 text-emerald-400" />
                    </div>

                    <AlertDialogTitle className="text-2xl font-bold text-emerald-400">
                        You&apos;re Funded!
                    </AlertDialogTitle>

                    <AlertDialogDescription className="text-zinc-400 mt-1 text-sm">
                        Congratulations — you passed the {tierLabel} challenge.
                        Your account is now a live funded account. Here&apos;s what changes:
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {/* Rules Grid */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-zinc-400 uppercase tracking-wide">Profit Split</span>
                        </div>
                        <p className="text-xl font-bold text-white">{(profitSplit * 100).toFixed(0)}%</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">You keep {(profitSplit * 100).toFixed(0)}% of profits</p>
                    </div>

                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-zinc-400 uppercase tracking-wide">Drawdown</span>
                        </div>
                        <p className="text-xl font-bold text-white">{totalPct}%</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Max total / {dailyPct}% daily</p>
                    </div>

                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-zinc-400 uppercase tracking-wide">Payout Cycle</span>
                        </div>
                        <p className="text-xl font-bold text-white">{minTradingDays} days</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Min trading days per payout</p>
                    </div>

                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <UserCheck className="w-4 h-4 text-violet-400" />
                            <span className="text-xs text-zinc-400 uppercase tracking-wide">KYC Required</span>
                        </div>
                        <p className="text-xl font-bold text-white">Before Payout</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Identity verification needed</p>
                    </div>
                </div>

                {/* Payout cap note */}
                <p className="text-xs text-zinc-500 text-center mt-2">
                    Max payout per cycle: <span className="text-zinc-300 font-medium">${payoutCap.toLocaleString()}</span>
                </p>

                <AlertDialogFooter className="sm:justify-center mt-4">
                    <AlertDialogAction asChild>
                        <Button
                            onClick={handleDismiss}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-base"
                        >
                            Start Trading
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
