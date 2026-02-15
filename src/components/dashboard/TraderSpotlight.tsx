"use client";

import { TrendingUp, Target, Flame, Star, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import CountUp from "@/components/reactbits/CountUp";
import ShinyText from "@/components/reactbits/ShinyText";
import ScrollReveal from "@/components/reactbits/ScrollReveal";

interface TraderSpotlightProps {
    totalTrades: number;
    winRate: number | null;
    currentStreak: number;
    daysActive: number;
    profitProgress: number;
}

export function TraderSpotlight({
    totalTrades,
    winRate,
    currentStreak,
    daysActive,
    profitProgress,
}: TraderSpotlightProps) {
    const getSpotlightMessage = () => {
        if (totalTrades === 0) {
            return {
                icon: Star,
                title: "Welcome Aboard!",
                message: "Your trading journey starts now. Take your time to analyze the markets.",
                color: "text-primary",
                bgColor: "bg-primary/10",
                shineColor: "#00FFB2",
            };
        }

        if (currentStreak >= 5) {
            return {
                icon: Flame,
                title: "On Fire! 🔥",
                message: `${currentStreak} trades in a row! Momentum is building.`,
                color: "text-orange-400",
                bgColor: "bg-orange-500/10",
                shineColor: "#fb923c",
            };
        }

        if (profitProgress >= 75) {
            return {
                icon: Trophy,
                title: "Almost There!",
                message: `${profitProgress.toFixed(0)}% to your profit target. Keep pushing!`,
                color: "text-yellow-400",
                bgColor: "bg-yellow-500/10",
                shineColor: "#facc15",
            };
        }

        if (profitProgress >= 50) {
            return {
                icon: Target,
                title: "Halfway Mark!",
                message: "You've crossed the 50% milestone. Stay disciplined.",
                color: "text-green-400",
                bgColor: "bg-green-500/10",
                shineColor: "#4ade80",
            };
        }

        if (profitProgress > 0) {
            return {
                icon: TrendingUp,
                title: "Building Progress",
                message: "Every trade counts. Stay consistent and focused.",
                color: "text-primary",
                bgColor: "bg-primary/10",
                shineColor: "#00FFB2",
            };
        }

        if (totalTrades > 0) {
            return {
                icon: TrendingUp,
                title: "Stay Disciplined",
                message: "Markets are volatile. Stick to your strategy and manage risk.",
                color: "text-primary",
                bgColor: "bg-primary/10",
                shineColor: "#00FFB2",
            };
        }

        return {
            icon: Star,
            title: "Getting Started",
            message: "Take your time. Focus on quality over quantity.",
            color: "text-primary",
            bgColor: "bg-primary/10",
            shineColor: "#00FFB2",
        };
    };

    const spotlight = getSpotlightMessage();
    const Icon = spotlight.icon;

    return (
        <ScrollReveal direction="up" distance={30} duration={0.5} delay={0.1}>
            <Card className="bg-[#1A232E] border-[#2E3A52] p-6">
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-xl ${spotlight.bgColor}`}>
                        <Icon className={`w-6 h-6 ${spotlight.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <h3 className={`text-lg font-bold mb-1`}>
                            <ShinyText
                                text={spotlight.title}
                                speed={3}
                                color={spotlight.shineColor}
                                shineColor="#ffffff"
                                spread={120}
                                className={`text-lg font-bold`}
                            />
                        </h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            {spotlight.message}
                        </p>

                        {/* Quick Stats Grid — with CountUp */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-[#0f1115] rounded-lg p-3">
                                <p className="text-xs text-zinc-500 mb-1">Total Trades</p>
                                <p className="text-lg font-bold text-white">
                                    <CountUp to={totalTrades} from={0} duration={1.5} />
                                </p>
                            </div>
                            <div className="bg-[#0f1115] rounded-lg p-3">
                                <p className="text-xs text-zinc-500 mb-1">Win Rate</p>
                                <p className="text-lg font-bold text-white">
                                    {winRate === null ? '-' : <CountUp to={winRate} from={0} duration={1.5} suffix="%" />}
                                </p>
                            </div>
                            <div className="bg-[#0f1115] rounded-lg p-3">
                                <p className="text-xs text-zinc-500 mb-1">Streak</p>
                                <p className="text-lg font-bold text-white">
                                    <CountUp
                                        to={currentStreak}
                                        from={0}
                                        duration={1.5}
                                        prefix={currentStreak > 0 ? "+" : ""}
                                    />
                                </p>
                            </div>
                            <div className="bg-[#0f1115] rounded-lg p-3">
                                <p className="text-xs text-zinc-500 mb-1">Days Active</p>
                                <p className="text-lg font-bold text-white">
                                    <CountUp to={daysActive} from={0} duration={1.5} />
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </ScrollReveal>
    );
}
