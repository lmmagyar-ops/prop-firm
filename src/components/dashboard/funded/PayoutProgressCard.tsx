"use client";

import { DollarSign, Minus, TrendingUp, TrendingDown, AlertCircle, ArrowRight } from "lucide-react";

interface PayoutProgressCardProps {
    grossProfit: number;
    excludedPnl: number;  // Resolution events excluded
    profitSplit: number;  // 0.80 = 80%
    payoutCap: number;
    platform: "polymarket" | "kalshi";
}

export function PayoutProgressCard({
    grossProfit,
    excludedPnl,
    profitSplit,
    payoutCap,
    platform,
}: PayoutProgressCardProps) {
    // Check if underwater (negative P&L)
    const isUnderwater = grossProfit < 0;

    // Calculate adjusted profit after exclusions (floor to 0 for payout purposes)
    const adjustedProfit = Math.max(0, grossProfit - excludedPnl);

    // Apply payout cap
    const cappedProfit = Math.min(adjustedProfit, payoutCap);
    const wasCapped = adjustedProfit > payoutCap;

    // Calculate split
    const traderShare = cappedProfit * profitSplit;
    const firmShare = cappedProfit * (1 - profitSplit);

    const platformColors = platform === "polymarket"
        ? { primary: "amber", gradient: "from-amber-500 to-orange-500", text: "text-amber-500", bg: "bg-amber-500" }
        : { primary: "violet", gradient: "from-violet-500 to-purple-500", text: "text-violet-500", bg: "bg-violet-500" };

    return (
        <div className="bg-[#1A232E]/80 backdrop-blur-sm border border-[#2E3A52] rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl ${platformColors.bg}/10 flex items-center justify-center border border-${platformColors.primary}-500/30`}>
                    <DollarSign className={`w-5 h-5 ${platformColors.text}`} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Payout Breakdown</h3>
                    <p className="text-xs text-zinc-500">Your share after adjustments</p>
                </div>
            </div>

            {/* Calculation Breakdown */}
            <div className="space-y-3">
                {/* Gross Profit */}
                <div className={`flex items-center justify-between p-3 rounded-lg ${isUnderwater ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-900/50 border-white/5'} border`}>
                    <div className="flex items-center gap-2">
                        {isUnderwater ? (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                        ) : (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                        )}
                        <span className="text-sm text-zinc-400">Gross Profit</span>
                    </div>
                    <span className={`font-mono font-bold ${isUnderwater ? 'text-red-500' : 'text-green-500'}`}>
                        {isUnderwater ? '-' : '+'}${Math.abs(grossProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Exclusions (if any) */}
                {excludedPnl > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-yellow-400">Resolution Exclusions</span>
                        </div>
                        <span className="font-mono font-bold text-yellow-500">
                            -${excludedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                )}

                {/* Adjusted */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                    <span className="text-sm text-zinc-400">Adjusted Profit</span>
                    <span className="font-mono font-bold text-white">
                        ${adjustedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Cap Applied (if hit) */}
                {wasCapped && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <div className="flex items-center gap-2">
                            <Minus className="w-4 h-4 text-orange-500" />
                            <span className="text-sm text-orange-400">Payout Cap Applied</span>
                        </div>
                        <span className="font-mono font-bold text-orange-500">
                            Max ${payoutCap.toLocaleString()}
                        </span>
                    </div>
                )}

                {/* Divider */}
                <div className="border-t border-white/10 my-4" />

                {/* Split Visualization */}
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-white/5">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                        Profit Split ({(profitSplit * 100).toFixed(0)}% / {((1 - profitSplit) * 100).toFixed(0)}%)
                    </div>

                    {/* Visual Bar */}
                    <div className="h-4 bg-zinc-800 rounded-full overflow-hidden mb-3 flex">
                        <div
                            className={`h-full ${platformColors.bg} transition-all duration-500`}
                            style={{ width: `${profitSplit * 100}%` }}
                        />
                        <div
                            className="h-full bg-zinc-600 transition-all duration-500"
                            style={{ width: `${(1 - profitSplit) * 100}%` }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">Your Share</div>
                            <div className={`text-xl font-mono font-bold ${platformColors.text}`}>
                                ${traderShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-zinc-500 mb-1">Firm Share</div>
                            <div className="text-xl font-mono font-bold text-zinc-500">
                                ${firmShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Final Amount */}
                <div className={`p-4 rounded-xl bg-gradient-to-r ${platformColors.gradient}/10 border border-${platformColors.primary}-500/30`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ArrowRight className={`w-5 h-5 ${platformColors.text}`} />
                            <span className="text-lg font-semibold text-white">Net Payout</span>
                        </div>
                        <span className={`text-2xl font-mono font-bold ${platformColors.text}`}>
                            ${traderShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
