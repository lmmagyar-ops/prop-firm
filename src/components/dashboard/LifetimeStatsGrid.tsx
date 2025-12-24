"use client";

import { Activity, TrendingUp, Wallet } from "lucide-react";
import React from "react";

interface LifetimeStatsGridProps {
    stats: {
        totalChallengesStarted: number;
        successRate: number;
        totalProfitEarned: number;
        bestMarketCategory: string | null;
        currentWinStreak: number | null;
        avgTradeWinRate: number | null;
    };
}

export function LifetimeStatsGrid({ stats }: LifetimeStatsGridProps) {
    // Guard clause for loading state
    if (!stats) return null;

    const {
        totalChallengesStarted,
        successRate,
        totalProfitEarned,
        bestMarketCategory,
        currentWinStreak,
        avgTradeWinRate
    } = stats;

    return (
        <div className="bg-[#1A232E] border border-[#2E3A52] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-6">
                Trader Performance
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Total Attempts */}
                <StatCard
                    label="Total Attempts"
                    value={totalChallengesStarted}
                    icon={<Activity className="w-4 h-4" />}
                />

                {/* Card 2: Success Rate */}
                <StatCard
                    label="Success Rate"
                    value={`${successRate.toFixed(1)}%`}
                    valueColor={successRate > 50 ? 'text-green-500' : 'text-zinc-400'}
                    icon={<TrendingUp className="w-4 h-4" />}
                />

                {/* Card 3: Total Profit */}
                <StatCard
                    label="Total Profit Earned"
                    value={`$${totalProfitEarned.toFixed(2)}`}
                    valueColor="text-green-500"
                    icon={<Wallet className="w-4 h-4" />}
                />

                {/* Card 4: Best Category */}
                <StatCard
                    label="Best Market Category"
                    value={bestMarketCategory || 'N/A'}
                    subtitle={bestMarketCategory ? "Highest win rate" : "No data yet"}
                />

                {/* Card 5: Current Streak */}
                <StatCard
                    label="Current Win Streak"
                    value={currentWinStreak !== null ? currentWinStreak : '-'}
                    valueColor={(currentWinStreak || 0) > 0 ? 'text-blue-500' : 'text-zinc-400'}
                />

                {/* Card 6: Trade Win Rate */}
                <StatCard
                    label="Avg Trade Win Rate"
                    value={avgTradeWinRate !== null ? `${avgTradeWinRate.toFixed(1)}%` : '-'}
                    subtitle="Across all positions"
                />
            </div>
        </div>
    );
}

interface StatCardProps {
    label: string;
    value: string | number;
    valueColor?: string;
    subtitle?: string;
    icon?: React.ReactNode;
}

function StatCard({ label, value, valueColor = 'text-white', subtitle, icon }: StatCardProps) {
    return (
        <div className="bg-[#0E1217] border border-[#2E3A52] rounded-xl p-4 hover:border-blue-500/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">{label}</span>
                {icon && <div className="text-zinc-600">{icon}</div>}
            </div>
            <div className={`text-2xl font-mono font-bold ${valueColor} mb-1`}>
                {value}
            </div>
            {subtitle && (
                <div className="text-xs text-zinc-600">{subtitle}</div>
            )}
        </div>
    );
}
