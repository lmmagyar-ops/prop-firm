"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { Users, DollarSign, TrendingUp, Award, Loader2 } from "lucide-react";

/**
 * LiveStatsBar - Real-time platform statistics for social proof
 * 
 * Anthropic Engineering Standards:
 * - Graceful loading states
 * - Animated counters for engagement
 * - Falls back silently on API failure
 * - Accessible (ARIA labels)
 */

interface LiveStats {
    tradersFundedThisMonth: number;
    totalPayoutsUSD: number;
    activeTraders: number;
    successRate: number;
}

/**
 * Animated counter component with spring physics
 */
function AnimatedNumber({
    value,
    prefix = "",
    suffix = "",
    decimals = 0
}: {
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
}) {
    const spring = useSpring(0, { stiffness: 100, damping: 30 });
    const display = useTransform(spring, (current) =>
        `${prefix}${current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${suffix}`
    );

    useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    return (
        <motion.span aria-label={`${prefix}${value}${suffix}`}>
            {display}
        </motion.span>
    );
}

/**
 * Individual stat card with loading state
 */
function StatCard({
    icon: Icon,
    label,
    value,
    detail,
    loading = false,
    prefix = "",
    suffix = "",
}: {
    icon: React.ElementType;
    label: string;
    value: number;
    detail: string;
    loading?: boolean;
    prefix?: string;
    suffix?: string;
}) {
    return (
        <div
            className="py-6 md:px-8 first:pl-0 last:pr-0 flex items-center justify-between group"
            role="region"
            aria-label={label}
        >
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    <Icon className="w-4 h-4 text-[#29af73]" aria-hidden="true" />
                    {label}
                </div>
                <div className="text-2xl md:text-3xl font-black text-white group-hover:text-[#29af73] transition-colors">
                    {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                    ) : (
                        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
                    )}
                </div>
                <div className="text-xs text-zinc-600 font-medium">
                    {detail}
                </div>
            </div>

            {/* Subtle pulse indicator for "live" feel */}
            <div className="relative flex items-center justify-center">
                <span className="absolute w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-75" />
                <span className="relative w-2 h-2 bg-emerald-500 rounded-full" />
            </div>
        </div>
    );
}

export function LiveStatsBar() {
    const [stats, setStats] = useState<LiveStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/stats/live", {
                    next: { revalidate: 60 }, // Cache for 1 minute
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                // Silently fail - component will show fallback
                console.warn("[LiveStatsBar] Failed to fetch stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();

        // Refresh every 5 minutes for live feel
        const interval = setInterval(fetchStats, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Fallback values for initial render or API failure
    const displayStats = stats ?? {
        tradersFundedThisMonth: 0,
        totalPayoutsUSD: 0,
        activeTraders: 0,
        successRate: 0,
    };

    return (
        <section
            className="relative z-20 border-y border-[#2E3A52]/50 bg-[#0B0E14]/80 backdrop-blur-sm"
            aria-label="Platform Statistics"
        >
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#2E3A52]/50">
                    <StatCard
                        icon={Award}
                        label="Funded This Month"
                        value={displayStats.tradersFundedThisMonth}
                        detail="Traders passed evaluation"
                        loading={loading}
                        suffix=" traders"
                    />
                    <StatCard
                        icon={DollarSign}
                        label="Total Payouts"
                        value={displayStats.totalPayoutsUSD}
                        detail="Paid to funded traders"
                        loading={loading}
                        prefix="$"
                    />
                    <StatCard
                        icon={Users}
                        label="Active Traders"
                        value={displayStats.activeTraders}
                        detail="Trading right now"
                        loading={loading}
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Success Rate"
                        value={displayStats.successRate}
                        detail="Evaluation pass rate"
                        loading={loading}
                        suffix="%"
                    />
                </div>
            </div>
        </section>
    );
}
