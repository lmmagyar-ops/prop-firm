"use client";

import { Check, X, Clock, AlertCircle, ChevronRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PayoutEligibilityCardProps {
    eligible: boolean;
    tradingDays: number;
    requiredTradingDays: number;
    consistencyFlagged: boolean;
    hasViolations: boolean;
    netProfit: number;
    platform: "polymarket" | "kalshi";
}

export function PayoutEligibilityCard({
    eligible,
    tradingDays,
    requiredTradingDays,
    consistencyFlagged,
    hasViolations,
    netProfit,
    platform,
}: PayoutEligibilityCardProps) {
    const hasProfits = netProfit > 0;
    const hasTradingDays = tradingDays >= requiredTradingDays;

    // Calculate overall progress
    const checks = [
        { met: hasProfits, label: "Net profit > $0" },
        { met: hasTradingDays, label: `${requiredTradingDays}+ trading days` },
        { met: !hasViolations, label: "No rule violations" },
    ];
    const metCount = checks.filter(c => c.met).length;
    const progressPercent = (metCount / checks.length) * 100;

    const platformColors = platform === "polymarket"
        ? { primary: "amber", gradient: "from-amber-500 to-orange-500" }
        : { primary: "violet", gradient: "from-violet-500 to-purple-500" };

    return (
        <div className="bg-[#1A232E]/80 backdrop-blur-sm border border-[#2E3A52] rounded-2xl p-6 relative overflow-hidden">
            {/* Top gradient accent */}
            <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${platformColors.gradient}`}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border
                        ${eligible
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-zinc-800 border-white/10'
                        }`}
                    >
                        <Wallet className={`w-6 h-6 ${eligible ? 'text-green-500' : 'text-zinc-400'}`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Payout Eligibility</h3>
                        <p className="text-xs text-zinc-500">
                            {eligible ? "You're eligible to request a payout!" : "Complete requirements to unlock"}
                        </p>
                    </div>
                </div>

                {/* Progress Ring */}
                <div className="relative w-14 h-14">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke="#27272a"
                            strokeWidth="4"
                        />
                        <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke={eligible ? "#22c55e" : "#a1a1aa"}
                            strokeWidth="4"
                            strokeDasharray={`${progressPercent * 1.51} 151`}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-bold ${eligible ? 'text-green-500' : 'text-zinc-400'}`}>
                            {metCount}/{checks.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Requirements Checklist */}
            <div className="space-y-3 mb-6">
                {/* Net Profit */}
                <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors
                    ${hasProfits
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-zinc-900/50 border-white/5'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center
                            ${hasProfits ? 'bg-green-500' : 'bg-zinc-700'}`}
                        >
                            {hasProfits ? (
                                <Check className="w-4 h-4 text-white" />
                            ) : (
                                <X className="w-4 h-4 text-zinc-400" />
                            )}
                        </div>
                        <span className={hasProfits ? 'text-green-400' : 'text-zinc-400'}>
                            Net profit available
                        </span>
                    </div>
                    <span className={`font-mono text-sm ${hasProfits ? 'text-green-500' : 'text-zinc-500'}`}>
                        ${netProfit.toFixed(2)}
                    </span>
                </div>

                {/* Trading Days */}
                <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors
                    ${hasTradingDays
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-zinc-900/50 border-white/5'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center
                            ${hasTradingDays ? 'bg-green-500' : 'bg-zinc-700'}`}
                        >
                            {hasTradingDays ? (
                                <Check className="w-4 h-4 text-white" />
                            ) : (
                                <Clock className="w-4 h-4 text-zinc-400" />
                            )}
                        </div>
                        <span className={hasTradingDays ? 'text-green-400' : 'text-zinc-400'}>
                            Minimum trading days
                        </span>
                    </div>
                    <span className={`font-mono text-sm ${hasTradingDays ? 'text-green-500' : 'text-zinc-500'}`}>
                        {tradingDays}/{requiredTradingDays}
                    </span>
                </div>

                {/* No Violations */}
                <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors
                    ${!hasViolations
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-red-500/5 border-red-500/20'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center
                            ${!hasViolations ? 'bg-green-500' : 'bg-red-500'}`}
                        >
                            {!hasViolations ? (
                                <Check className="w-4 h-4 text-white" />
                            ) : (
                                <X className="w-4 h-4 text-white" />
                            )}
                        </div>
                        <span className={!hasViolations ? 'text-green-400' : 'text-red-400'}>
                            No rule violations
                        </span>
                    </div>
                    <span className={`text-xs ${!hasViolations ? 'text-green-500' : 'text-red-500'}`}>
                        {hasViolations ? "VIOLATION" : "CLEAR"}
                    </span>
                </div>

                {/* Consistency Flag (soft warning) */}
                {consistencyFlagged && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                        <span className="text-yellow-400 text-sm">
                            Consistency review: 50%+ profit in single day
                        </span>
                    </div>
                )}
            </div>

            {/* CTA */}
            <Link href="/dashboard/payouts" className="block">
                <Button
                    className={`w-full ${eligible
                        ? `bg-gradient-to-r ${platformColors.gradient} hover:opacity-90`
                        : 'bg-zinc-800 hover:bg-zinc-700'
                        } text-white font-semibold py-6 text-base group transition-all duration-300`}
                    disabled={!eligible}
                >
                    <span className="flex items-center gap-2">
                        {eligible ? (
                            <>
                                Request Payout
                                <ChevronRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                            </>
                        ) : (
                            "Complete Requirements"
                        )}
                    </span>
                </Button>
            </Link>
        </div>
    );
}
