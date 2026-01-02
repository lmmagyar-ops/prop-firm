"use client";

import { AlertTriangle, Shield, TrendingDown } from "lucide-react";

interface FundedRiskMetersProps {
    // Static drawdown from initial balance (not HWM)
    currentBalance: number;
    startingBalance: number;
    maxTotalDrawdown: number;  // Absolute value (e.g., $1000 for 10k account)
    maxDailyDrawdown: number;  // Absolute value (e.g., $500)
    startOfDayBalance: number;
    platform: "polymarket" | "kalshi";
}

export function FundedRiskMeters({
    currentBalance,
    startingBalance,
    maxTotalDrawdown,
    maxDailyDrawdown,
    startOfDayBalance,
    platform,
}: FundedRiskMetersProps) {
    // STATIC drawdown calculation (from initial balance, NOT high water mark)
    const drawdownFromInitial = Math.max(0, startingBalance - currentBalance);
    const drawdownUsagePercent = (drawdownFromInitial / maxTotalDrawdown) * 100;

    // Daily loss calculation
    const dailyLoss = Math.max(0, startOfDayBalance - currentBalance);
    const dailyLossUsagePercent = (dailyLoss / maxDailyDrawdown) * 100;

    // Risk floor calculations
    const accountFloor = startingBalance - maxTotalDrawdown;
    const dailyFloor = startOfDayBalance - maxDailyDrawdown;

    // Color logic
    const getColor = (usage: number) => {
        if (usage >= 80) return "red";
        if (usage >= 60) return "orange";
        return platform === "polymarket" ? "amber" : "violet";
    };

    const totalColor = getColor(drawdownUsagePercent);
    const dailyColor = getColor(dailyLossUsagePercent);

    const colorMap = {
        red: {
            bar: "bg-red-500",
            text: "text-red-500",
            glow: "shadow-red-500/30",
        },
        orange: {
            bar: "bg-orange-500",
            text: "text-orange-500",
            glow: "shadow-orange-500/30",
        },
        amber: {
            bar: "bg-amber-500",
            text: "text-amber-500",
            glow: "shadow-amber-500/30",
        },
        violet: {
            bar: "bg-violet-500",
            text: "text-violet-500",
            glow: "shadow-violet-500/30",
        },
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Drawdown (STATIC from initial) */}
            <div className="bg-[#1A232E]/80 backdrop-blur-sm border border-[#2E3A52] rounded-2xl p-6 relative overflow-hidden">
                {/* Warning glow if high usage */}
                {drawdownUsagePercent >= 60 && (
                    <div
                        className={`absolute inset-0 ${colorMap[totalColor].bar} opacity-5`}
                    />
                )}

                <div className="relative">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg ${drawdownUsagePercent >= 80 ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-800'} border border-white/10 flex items-center justify-center`}>
                                <Shield className={`w-4 h-4 ${drawdownUsagePercent >= 80 ? 'text-red-500' : 'text-zinc-400'}`} />
                            </div>
                            <div>
                                <span className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                                    Account Limit
                                </span>
                                <div className="text-xs text-zinc-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                    Static from $${startingBalance.toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-2xl font-mono font-bold ${colorMap[totalColor].text}`}>
                                {drawdownUsagePercent.toFixed(1)}%
                            </span>
                            <div className="text-xs text-zinc-500">
                                ${drawdownFromInitial.toFixed(2)} / ${maxTotalDrawdown}
                            </div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-3 bg-zinc-800/80 rounded-full overflow-hidden mb-3">
                        <div
                            className={`h-full transition-all duration-700 ease-out ${colorMap[totalColor].bar} rounded-full`}
                            style={{ width: `${Math.min(100, drawdownUsagePercent)}%` }}
                        />
                    </div>

                    {/* Floor indicator */}
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-zinc-500">
                            <TrendingDown className="w-3 h-3" />
                            <span>Account Floor:</span>
                        </div>
                        <span className={`font-mono font-semibold ${colorMap[totalColor].text}`}>
                            ${accountFloor.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Daily Loss Limit */}
            <div className="bg-[#1A232E]/80 backdrop-blur-sm border border-[#2E3A52] rounded-2xl p-6 relative overflow-hidden">
                {/* Warning glow if high usage */}
                {dailyLossUsagePercent >= 60 && (
                    <div
                        className={`absolute inset-0 ${colorMap[dailyColor].bar} opacity-5`}
                    />
                )}

                <div className="relative">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg ${dailyLossUsagePercent >= 80 ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-800'} border border-white/10 flex items-center justify-center`}>
                                <AlertTriangle className={`w-4 h-4 ${dailyLossUsagePercent >= 80 ? 'text-red-500' : 'text-zinc-400'}`} />
                            </div>
                            <div>
                                <span className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                                    Daily Limit
                                </span>
                                <div className="text-xs text-zinc-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                    Resets at 00:00 UTC
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-2xl font-mono font-bold ${colorMap[dailyColor].text}`}>
                                {dailyLossUsagePercent.toFixed(1)}%
                            </span>
                            <div className="text-xs text-zinc-500">
                                ${dailyLoss.toFixed(2)} / ${maxDailyDrawdown}
                            </div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-3 bg-zinc-800/80 rounded-full overflow-hidden mb-3">
                        <div
                            className={`h-full transition-all duration-700 ease-out ${colorMap[dailyColor].bar} rounded-full`}
                            style={{ width: `${Math.min(100, dailyLossUsagePercent)}%` }}
                        />
                    </div>

                    {/* Floor indicator */}
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-zinc-500">
                            <TrendingDown className="w-3 h-3" />
                            <span>Today&apos;s Floor:</span>
                        </div>
                        <span className={`font-mono font-semibold ${colorMap[dailyColor].text}`}>
                            ${dailyFloor.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
