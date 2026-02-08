"use client";

import { Trophy, DollarSign, TrendingUp, Target, Flame, Award } from "lucide-react";

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    earned: boolean;
    earnedAt?: Date;
}

interface AchievementBadgesSectionProps {
    totalTrades: number;
    winRate: number;
    totalPayouts: number;
    isFunded: boolean;
    activeDays: number;
}

export function AchievementBadgesSection({
    totalTrades,
    winRate,
    totalPayouts,
    isFunded,
    activeDays
}: AchievementBadgesSectionProps) {

    const achievements: Achievement[] = [
        {
            id: "funded-trader",
            name: "Funded Trader",
            description: "Passed evaluation and received funded account",
            icon: <Trophy className="w-8 h-8" />,
            earned: isFunded,
        },
        {
            id: "first-payout",
            name: "First Payout",
            description: "Received your first payout",
            icon: <DollarSign className="w-8 h-8" />,
            earned: totalPayouts > 0,
        },
        {
            id: "profit-master",
            name: "10% Profit",
            description: "Achieved 10% account growth",
            icon: <TrendingUp className="w-8 h-8" />,
            earned: false, // TODO: Calculate from account performance
        },
        {
            id: "marksman",
            name: "Marksman",
            description: "Achieved 90%+ win rate",
            icon: <Target className="w-8 h-8" />,
            earned: winRate >= 90,
        },
        {
            id: "streak",
            name: "10-Day Streak",
            description: "Traded for 10 consecutive days",
            icon: <Flame className="w-8 h-8" />,
            earned: activeDays >= 10,
        },
        {
            id: "veteran",
            name: "Veteran Trader",
            description: "Completed 100+ trades",
            icon: <Award className="w-8 h-8" />,
            earned: totalTrades >= 100,
        },
    ];

    const earnedCount = achievements.filter(a => a.earned).length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">
                    {earnedCount} of {achievements.length} badges earned
                </p>
                <div className="h-2 w-32 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
                        style={{ width: `${(earnedCount / achievements.length) * 100}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {achievements.map((achievement) => (
                    <div
                        key={achievement.id}
                        className={`
                            relative group p-4 rounded-xl border text-center transition-all duration-300
                            ${achievement.earned
                                ? 'bg-gradient-to-b from-yellow-500/10 to-orange-500/10 border-yellow-500/30 hover:border-yellow-500/50 hover:scale-105'
                                : 'bg-[#1A232E] border-[#2E3A52] opacity-50'
                            }
                        `}
                    >
                        {achievement.earned && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                                <Trophy className="w-3 h-3 text-black" />
                            </div>
                        )}

                        <div className={`
                            mb-2 flex justify-center
                            ${achievement.earned ? 'text-yellow-400' : 'text-zinc-600'}
                        `}>
                            {achievement.icon}
                        </div>

                        <p className={`
                            text-xs font-semibold mb-1
                            ${achievement.earned ? 'text-white' : 'text-zinc-600'}
                        `}>
                            {achievement.name}
                        </p>

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {achievement.description}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
