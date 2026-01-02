"use client";

import { Badge } from "@/components/ui/badge";
import { Wallet, Calendar, TrendingUp, Sparkles } from "lucide-react";

interface FundedAccountHeaderProps {
    startingBalance: number;
    currentBalance: number;
    tier: "5k" | "10k" | "25k";
    profitSplit: number; // 0.80 = 80%
    payoutCap: number;
    daysUntilPayout: number;
    platform: "polymarket" | "kalshi";
}

export function FundedAccountHeader({
    startingBalance,
    currentBalance,
    tier,
    profitSplit,
    payoutCap,
    daysUntilPayout,
    platform,
}: FundedAccountHeaderProps) {
    const profit = currentBalance - startingBalance;
    const isProfitable = profit > 0;

    // Platform-specific accent colors
    const platformColors = platform === "polymarket"
        ? {
            primary: "#F59E0B",      // Amber for Polymarket funded
            secondary: "#D97706",
            glow: "rgba(245, 158, 11, 0.3)",
            gradient: "from-amber-500 via-orange-500 to-amber-600",
            border: "border-amber-500/30",
            bg: "bg-amber-500/10",
            text: "text-amber-500",
        }
        : {
            primary: "#8B5CF6",      // Purple for Kalshi funded  
            secondary: "#7C3AED",
            glow: "rgba(139, 92, 246, 0.3)",
            gradient: "from-violet-500 via-purple-500 to-violet-600",
            border: "border-violet-500/30",
            bg: "bg-violet-500/10",
            text: "text-violet-500",
        };

    return (
        <div className="relative overflow-hidden rounded-2xl">
            {/* Animated gradient background */}
            <div
                className={`absolute inset-0 bg-gradient-to-br ${platformColors.gradient} opacity-10 
                    animate-[shimmer_3s_ease-in-out_infinite]`}
            />

            {/* Glow effect */}
            <div
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30"
                style={{ backgroundColor: platformColors.primary }}
            />

            <div className={`relative bg-[#1A232E]/90 backdrop-blur-xl ${platformColors.border} border rounded-2xl p-6`}>
                {/* Top Row: Status + Tier */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${platformColors.bg} rounded-xl flex items-center justify-center ${platformColors.border} border`}>
                            <Sparkles className={`w-5 h-5 ${platformColors.text}`} />
                        </div>
                        <div>
                            <Badge
                                variant="outline"
                                className={`${platformColors.border} ${platformColors.bg} ${platformColors.text} text-xs uppercase tracking-widest font-bold mb-1`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
                                Funded Trader
                            </Badge>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                ${startingBalance.toLocaleString()} Account
                                <span className="text-xs px-2 py-0.5 rounded-full border border-green-500/30 text-green-500 bg-green-500/10 uppercase font-semibold">
                                    {tier} Tier
                                </span>
                            </h2>
                        </div>
                    </div>

                    {/* Right: Payout Countdown */}
                    <div className="text-right">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1 flex items-center justify-end gap-1">
                            <Calendar className="w-3 h-3" />
                            Next Payout Cycle
                        </div>
                        <div className={`text-3xl font-mono font-bold ${platformColors.text}`}>
                            {daysUntilPayout > 0 ? `${daysUntilPayout}d` : "Ready"}
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Current Balance */}
                    <div className="bg-[#0E1217]/60 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            Balance
                        </div>
                        <div className="text-xl font-mono font-bold text-white">
                            ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Profit/Loss */}
                    <div className="bg-[#0E1217]/60 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Total P&L
                        </div>
                        <div className={`text-xl font-mono font-bold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                            {isProfitable ? '+' : ''}${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Profit Split */}
                    <div className={`${platformColors.bg} rounded-xl p-4 ${platformColors.border} border`}>
                        <div className={`text-xs ${platformColors.text} uppercase tracking-wider font-semibold mb-1`}>
                            Your Share
                        </div>
                        <div className={`text-xl font-mono font-bold ${platformColors.text}`}>
                            {(profitSplit * 100).toFixed(0)}%
                        </div>
                    </div>

                    {/* Payout Cap */}
                    <div className="bg-[#0E1217]/60 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">
                            Payout Cap
                        </div>
                        <div className="text-xl font-mono font-bold text-white">
                            ${payoutCap.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Platform Badge */}
                <div className="mt-4 flex justify-end">
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-400 text-xs">
                        {platform === "polymarket" ? "🔮 Polymarket" : "📊 Kalshi"} Trader
                    </Badge>
                </div>
            </div>
        </div>
    );
}
