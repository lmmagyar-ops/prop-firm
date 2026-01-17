"use client";

import { useEffect, useState, useRef } from "react";
import { DollarSign, TrendingUp, Loader2 } from "lucide-react";

interface RevenueData {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    totalChallenges: number;
}

export function RevenueOdometer() {
    const [data, setData] = useState<RevenueData | null>(null);
    const [displayValue, setDisplayValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const animationRef = useRef<number | undefined>(undefined);
    const startTimeRef = useRef<number | undefined>(undefined);
    const duration = 2000;

    // Fetch real revenue data
    useEffect(() => {
        const fetchRevenue = async () => {
            try {
                const res = await fetch("/api/admin/revenue/total");
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error("Failed to fetch revenue:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRevenue();
    }, []);

    // Animate the counter when data arrives
    useEffect(() => {
        if (!data) return;

        const targetValue = data.total;
        startTimeRef.current = undefined;

        const animate = (currentTime: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = currentTime;
            }

            const elapsed = currentTime - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.floor(easeOutQuart * targetValue);

            setDisplayValue(currentValue);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [data]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (loading) {
        return (
            <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-lg backdrop-blur-sm">
                <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
                <span className="text-emerald-400/70">Loading revenue...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-lg backdrop-blur-sm flex-1">
            <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <DollarSign className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="flex-1">
                <div className="text-xs font-medium text-emerald-400/70 uppercase tracking-wider">Total Revenue</div>
                <div className="text-3xl font-bold text-emerald-400 font-mono tracking-tight tabular-nums">
                    {formatCurrency(displayValue)}
                </div>
            </div>
            {data && (
                <div className="hidden md:flex flex-col gap-1 text-right">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-500">Today</span>
                        <span className="text-emerald-400 font-mono">{formatCurrency(data.today)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-500">This Month</span>
                        <span className="text-emerald-400 font-mono">{formatCurrency(data.thisMonth)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
