"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Trophy, TrendingUp, Flame, Star, Target } from "lucide-react";
import { toast } from "sonner";

interface Milestone {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
}

interface MilestoneCelebrationProps {
    totalTrades: number;
    profitProgress: number;
    currentStreak: number;
    dailyProfitRecord: number;
    totalProfit: number;
}

const MILESTONES: Record<string, Milestone> = {
    first_trade: {
        id: "first_trade",
        title: "First Trade! 🎉",
        description: "You've made your first trade. The journey begins!",
        icon: Star,
        color: "#3B82F6",
    },
    streak_5: {
        id: "streak_5",
        title: "5-Trade Streak! 🔥",
        description: "Five consecutive trades! Momentum is building.",
        icon: Flame,
        color: "#F97316",
    },
    halfway: {
        id: "halfway",
        title: "Halfway There! 🚀",
        description: "You've reached 50% of your profit target!",
        icon: Target,
        color: "#10B981",
    },
    milestone_10_trades: {
        id: "milestone_10_trades",
        title: "10 Trades Complete! 💎",
        description: "You've completed 10 cumulative trades.",
        icon: Trophy,
        color: "#8B5CF6",
    },
    profit_record: {
        id: "profit_record",
        title: "Daily Profit Record! 📈",
        description: "New personal best for daily profit!",
        icon: TrendingUp,
        color: "#EAB308",
    },
};

export function MilestoneCelebration({
    totalTrades,
    profitProgress,
    currentStreak,
    dailyProfitRecord,
    totalProfit,
}: MilestoneCelebrationProps) {
    const [celebratedMilestones, setCelebratedMilestones] = useState<Set<string>>(
        new Set()
    );

    const triggerCelebration = (milestone: Milestone) => {
        // Confetti animation
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min;
        }

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: [milestone.color],
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: [milestone.color],
            });
        }, 250);

        // Toast notification
        const Icon = milestone.icon;
        toast.success(milestone.title, {
            description: milestone.description,
            duration: 5000,
            icon: <Icon className="w-5 h-5" style={{ color: milestone.color }} />,
        });
    };

    useEffect(() => {
        // Check for milestones
        const newMilestones: Milestone[] = [];

        // First trade
        if (totalTrades === 1 && !celebratedMilestones.has("first_trade")) {
            newMilestones.push(MILESTONES.first_trade);
        }

        // 5-trade streak
        if (currentStreak === 5 && !celebratedMilestones.has("streak_5")) {
            newMilestones.push(MILESTONES.streak_5);
        }

        // 50% profit target
        if (
            profitProgress >= 50 &&
            profitProgress < 75 &&
            !celebratedMilestones.has("halfway")
        ) {
            newMilestones.push(MILESTONES.halfway);
        }

        // 10 cumulative trades
        if (totalTrades === 10 && !celebratedMilestones.has("milestone_10_trades")) {
            newMilestones.push(MILESTONES.milestone_10_trades);
        }

        // Daily profit record (simplified - would need backend tracking)
        // This is a placeholder for demonstration
        if (
            dailyProfitRecord > 0 &&
            totalProfit > 0 &&
            !celebratedMilestones.has("profit_record")
        ) {
            // Only trigger once per session for demo purposes
            // In production, check against historical data
        }

        // Trigger celebrations for new milestones
        if (newMilestones.length > 0) {
            newMilestones.forEach((milestone, index) => {
                setTimeout(() => {
                    triggerCelebration(milestone);
                    setCelebratedMilestones((prev) => new Set([...prev, milestone.id]));
                }, index * 1000); // Stagger celebrations by 1 second
            });
        }
    }, [totalTrades, profitProgress, currentStreak, dailyProfitRecord, totalProfit]);

    return null; // This component doesn't render anything visible
}
