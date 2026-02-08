"use client";

import { Activity, TrendingUp, Wallet } from "lucide-react";
import React from "react";
import CountUp from "@/components/reactbits/CountUp";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import ScrollReveal from "@/components/reactbits/ScrollReveal";

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
        <ScrollReveal direction="up" distance={30} duration={0.5}>
            <div className="bg-[#1A232E] border border-[#2E3A52] rounded-2xl p-6">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-6">
                    Trader Performance
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card 1: Total Attempts */}
                    <StatCard
                        label="Total Attempts"
                        numericValue={totalChallengesStarted}
                        icon={<Activity className="w-4 h-4" />}
                    />

                    {/* Card 2: Success Rate */}
                    <StatCard
                        label="Success Rate"
                        numericValue={successRate}
                        suffix="%"
                        decimals={1}
                        valueColor={successRate > 50 ? 'text-green-500' : 'text-zinc-400'}
                        icon={<TrendingUp className="w-4 h-4" />}
                    />

                    {/* Card 3: Total Profit */}
                    <StatCard
                        label="Total Profit Earned"
                        numericValue={totalProfitEarned}
                        prefix="$"
                        decimals={2}
                        valueColor={totalProfitEarned > 0 ? 'text-green-500' : 'text-green-500'}
                        icon={<Wallet className="w-4 h-4" />}
                    />

                    {/* Card 4: Best Category */}
                    <StatCard
                        label="Best Market Category"
                        textValue={bestMarketCategory || 'N/A'}
                        subtitle={bestMarketCategory ? "Highest win rate" : "No data yet"}
                    />

                    {/* Card 5: Current Streak */}
                    <StatCard
                        label="Current Win Streak"
                        numericValue={currentWinStreak ?? 0}
                        valueColor={(currentWinStreak || 0) > 0 ? 'text-primary' : 'text-zinc-400'}
                    />

                    {/* Card 6: Trade Win Rate */}
                    <StatCard
                        label="Avg Trade Win Rate"
                        numericValue={avgTradeWinRate ?? 0}
                        suffix="%"
                        decimals={1}
                        textValue={avgTradeWinRate === null ? '-' : undefined}
                        subtitle="Across all positions"
                    />
                </div>
            </div>
        </ScrollReveal>
    );
}

interface StatCardProps {
    label: string;
    numericValue?: number;
    textValue?: string;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    valueColor?: string;
    subtitle?: string;
    icon?: React.ReactNode;
}

function StatCard({
    label,
    numericValue,
    textValue,
    prefix = '',
    suffix = '',
    decimals = 0,
    valueColor = 'text-white',
    subtitle,
    icon,
}: StatCardProps) {
    return (
        <SpotlightCard
            className="bg-[#0E1217] border border-[#2E3A52] rounded-xl p-4 hover:border-primary/30 transition-colors"
            spotlightColor="rgba(0, 255, 178, 0.08)"
            spotlightSize={300}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">{label}</span>
                {icon && <div className="text-zinc-600">{icon}</div>}
            </div>
            <div className={`text-2xl font-mono font-bold ${valueColor} mb-1`}>
                {textValue !== undefined ? (
                    textValue
                ) : numericValue !== undefined ? (
                    <CountUp
                        to={numericValue}
                        from={0}
                        duration={1.8}
                        prefix={prefix}
                        suffix={suffix}
                        className={`text-2xl font-mono font-bold ${valueColor}`}
                    />
                ) : (
                    '-'
                )}
            </div>
            {subtitle && (
                <div className="text-xs text-zinc-600">{subtitle}</div>
            )}
        </SpotlightCard>
    );
}
