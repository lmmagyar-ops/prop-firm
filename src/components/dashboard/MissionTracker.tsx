"use client";

import { motion } from "framer-motion";
import { Target, AlertTriangle, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import CountUp from "@/components/reactbits/CountUp";

interface MissionTrackerProps {
    startingBalance: number;
    currentBalance: number;
    profitTarget: number;
    maxDrawdown: number;
    dailyLossLimit: number;

}

export function MissionTracker({
    startingBalance,
    currentBalance,
    profitTarget, // e.g., 500 (absolute $)
    maxDrawdown,  // e.g., 1000 (absolute $)
    dailyLossLimit,

}: MissionTrackerProps) {
    const profit = currentBalance - startingBalance;
    const isProfit = profit >= 0;

    // Progress towards Target (0 to 100)
    const targetProgress = Math.min(Math.max((profit / profitTarget) * 100, 0), 100);

    // Drawdown Utilized (0 to 100) - How close are we to blowing up?
    const drawdownAmount = startingBalance - currentBalance;
    const drawdownProgress = Math.max((drawdownAmount / maxDrawdown) * 100, 0);

    return (
        <div className="bg-[#0f1115] border-b border-white/5 p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className={`absolute top-0 left-0 bottom-0 w-1 ${isProfit ? "bg-green-500" : "bg-red-500"} transition-colors`} />

            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

                {/* 1. Mission Status */}
                <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="bg-zinc-900 p-2 rounded-lg border border-white/5">
                        <Target className={`w-5 h-5 ${isProfit ? "text-green-400" : "text-zinc-500"}`} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Mission Status</div>
                        <div className="text-white font-bold text-sm flex items-center gap-2">
                            Phase 1 Evaluation <span className="text-zinc-600">|</span> <span className="text-primary">No Time Limit</span>
                        </div>
                    </div>
                </div>

                {/* 2. Progress Bars (Center) */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">

                    {/* Profit Target */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-zinc-400">Target ${(startingBalance + profitTarget).toLocaleString()}</span>
                            <span className="text-green-400">{targetProgress.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${targetProgress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-green-600 to-green-400 relative"
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </motion.div>
                        </div>
                        <div className="text-[10px] text-zinc-500 text-right font-mono">
                            ${profit.toFixed(2)} / ${profitTarget.toFixed(2)}
                        </div>
                    </div>

                    {/* Daily Loss Limit */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-zinc-400">Daily Limit -${dailyLossLimit.toLocaleString()}</span>
                            {/* Assuming profit acts as daily P&L for MVP Day 1 */}
                            <span className={`${profit < -300 ? "text-red-500 animate-pulse" : "text-primary"}`}>
                                {Math.max(0, dailyLossLimit + Math.min(profit, 0)).toFixed(0)} Left
                            </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                            {/* Fills up as you lose money */}
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(Math.abs(Math.min(profit, 0)) / dailyLossLimit * 100, 100)}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full relative ${profit < -320 ? "bg-red-500" : "bg-orange-500"}`}
                            />
                        </div>
                        <div className="text-[10px] text-zinc-500 text-right font-mono">
                            -${Math.abs(Math.min(profit, 0)).toFixed(2)} Loss
                        </div>
                    </div>

                    {/* Max Drawdown */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-zinc-400">Max DD -${maxDrawdown.toLocaleString()}</span>
                            <span className={`${drawdownProgress > 80 ? "text-red-500 animate-pulse" : "text-primary"}`}>
                                {(100 - drawdownProgress).toFixed(1)}% Left
                            </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${drawdownProgress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full relative ${drawdownProgress > 80 ? "bg-red-500" : "bg-primary"}`}
                            />
                        </div>
                        <div className="text-[10px] text-zinc-500 text-right font-mono">
                            -${Math.max(drawdownAmount, 0).toFixed(2)} Loss
                        </div>
                    </div>

                </div>

                {/* 3. Daily Stats */}
                <div className="flex items-center gap-6 min-w-[150px] justify-end border-l border-white/5 pl-6">
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Account Balance</div>
                        <div className="text-lg font-bold font-mono text-white">
                            <CountUp
                                to={currentBalance}
                                from={startingBalance}
                                duration={1.5}
                                separator=","
                                prefix="$"
                                className="text-lg font-bold font-mono text-white"
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
