"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertCircle, Target, Clock, TrendingUp } from "lucide-react";

interface ChallengeStatsProps {
    challengeId: string;
    startedAt: Date;
    durationDays: number;
    currentEquity: number;
    initialBalance: number;
    profitTarget: number;
    maxDrawdown: number;
}

export function ChallengeStats({
    challengeId,
    startedAt,
    durationDays,
    currentEquity,
    initialBalance,
    profitTarget,
    maxDrawdown
}: ChallengeStatsProps) {
    const [timeLeft, setTimeLeft] = useState("");

    // Countdown Logic
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const start = new Date(startedAt);
            const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
            const diff = end.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft("Ended");
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            setTimeLeft(`${days}d ${hours}h left`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [startedAt, durationDays]);

    // Metrics Calculation
    const profit = currentEquity - initialBalance;
    const profitProgress = Math.min(100, Math.max(0, (profit / profitTarget) * 100));

    // Drawdown Calculation: How far are we from hitting the max loss?
    // Max Loss Level = Initial Balance - Max Drawdown
    // Distance to Death = Current Equity - (Initial - Max Drawdown)
    // Percentage Used = 1 - (Distance / Max Drawdown)
    const maxLossLevel = initialBalance - maxDrawdown;
    const distanceToDeath = currentEquity - maxLossLevel;
    const drawdownUsed = Math.min(100, Math.max(0, ((maxDrawdown - distanceToDeath) / maxDrawdown) * 100));

    // Status logic
    let status = "ACTIVE";
    let statusColor = "text-primary border-primary/30 bg-primary/10";

    if (distanceToDeath <= 0) {
        status = "FAILED";
        statusColor = "text-red-500 border-red-500/30 bg-red-500/10";
    } else if (profit >= profitTarget) {
        status = "PASSED";
        statusColor = "text-green-500 border-green-500/30 bg-green-500/10";
    }

    return (
        <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6 space-y-6">

            {/* Header / Timer */}
            <div className="flex items-center justify-between pb-4 border-b border-[#2E3A52]">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("font-bold tracking-wider", statusColor)}>
                        {status}
                    </Badge>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-sm font-mono">
                    <Clock className="w-4 h-4" />
                    <span>{timeLeft}</span>
                </div>
            </div>

            {/* Main Equity Display */}
            <div className="space-y-1">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Current Equity</span>
                <div className={cn(
                    "text-3xl font-black font-mono tracking-tight",
                    currentEquity >= initialBalance ? "text-white" : "text-red-400"
                )}>
                    ${currentEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className={cn(
                    "text-sm font-bold flex items-center gap-1",
                    profit >= 0 ? "text-green-500" : "text-red-500"
                )}>
                    {profit >= 0 ? "+" : ""}{profit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    <span className="text-zinc-500 font-normal ml-1">Total P&L</span>
                </div>
            </div>

            {/* Progress Meters */}
            <div className="space-y-6 pt-2">

                {/* Profit Target */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                        <span className="text-zinc-400 flex items-center gap-1"><Target className="w-3 h-3" /> Profit Target</span>
                        <span className="text-green-500">${profitTarget}</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 transition-all duration-700 ease-out"
                            style={{ width: `${profitProgress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                        <span>${profit.toFixed(0)}</span>
                        <span>{profitProgress.toFixed(1)}%</span>
                    </div>
                </div>

                {/* Drawdown Limit */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                        <span className="text-zinc-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Max Drawdown</span>
                        <span className="text-red-500">${maxDrawdown}</span>
                    </div>
                    {/* Drawdown bar fills up as you lose money */}
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden relative">
                        {/* Safe Zone Marker (optional) */}
                        <div
                            className={cn(
                                "h-full transition-all duration-700 ease-out",
                                drawdownUsed > 80 ? "bg-red-500 animate-pulse" : "bg-primary"
                            )}
                            style={{ width: `${drawdownUsed}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                        <span className={drawdownUsed > 80 ? "text-red-500 font-bold" : ""}>
                            Ref: ${(maxLossLevel).toLocaleString()}
                        </span>
                        <span>{drawdownUsed.toFixed(1)}% Used</span>
                    </div>
                </div>

            </div>

            {/* Rules Summary (Mini) */}
            <div className="pt-4 border-t border-[#2E3A52] grid grid-cols-2 gap-4 text-xs">
                <div>
                    <span className="text-zinc-500 block">Daily Loss</span>
                    <span className="text-white font-mono">$500.00</span>
                </div>
                <div className="text-right">
                    <span className="text-zinc-500 block">Max Position</span>
                    <span className="text-white font-mono">5.0 Lots</span>
                </div>
            </div>

        </div>
    );
}
