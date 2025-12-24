"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, DollarSign } from "lucide-react";

interface LeaderboardEntry {
    rank: number;
    userId: string;
    displayName: string;
    avatarUrl?: string;
    value: number;
    isPrivate: boolean;
}

export default function LeaderboardPage() {
    const [season, setSeason] = useState("season-12-dec");
    const [volumeLeaders, setVolumeLeaders] = useState<LeaderboardEntry[]>([]);
    const [profitLeaders, setProfitLeaders] = useState<LeaderboardEntry[]>([]);
    const [countdown, setCountdown] = useState("10d 11h 42m");

    useEffect(() => {
        // Mock Data for now
        setVolumeLeaders([
            { rank: 1, userId: "1", displayName: "Mat", value: 64963427, isPrivate: false },
            { rank: 2, userId: "2", displayName: "Cardman", value: 35153161, isPrivate: false },
            { rank: 3, userId: "3", displayName: "Michael", value: 31498912, isPrivate: false },
            { rank: 4, userId: "4", displayName: "David", value: 28100500, isPrivate: false },
            { rank: 5, userId: "5", displayName: "Sarah", value: 15200000, isPrivate: false },
        ]);

        setProfitLeaders([
            { rank: 1, userId: "1", displayName: "Cardman", value: 160487.63, isPrivate: false },
            { rank: 2, userId: "6", displayName: "Mat", value: 80126.18, isPrivate: false },
            { rank: 3, userId: "3", displayName: "James", value: 78835.92, isPrivate: false },
            { rank: 4, userId: "7", displayName: "Robert", value: 65000.00, isPrivate: false },
            { rank: 5, userId: "8", displayName: "Jennifer", value: 50000.00, isPrivate: false },
        ]);
    }, [season]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Leaderboard</h1>

                <div className="flex items-center gap-4">
                    <Select value={season} onValueChange={setSeason}>
                        <SelectTrigger className="w-48 bg-[#0E1217] border-[#2E3A52] text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A232E] border-[#2E3A52] text-white">
                            <SelectItem value="season-12-dec" className="focus:bg-[#2E81FF]/20 cursor-pointer">Season 12: December</SelectItem>
                            <SelectItem value="season-11-nov" className="focus:bg-[#2E81FF]/20 cursor-pointer">Season 11: November</SelectItem>
                            <SelectItem value="season-10-oct" className="focus:bg-[#2E81FF]/20 cursor-pointer">Season 10: October</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="text-sm text-zinc-400">
                        Countdown: <span className="text-white font-mono">{countdown}</span>
                    </div>
                </div>
            </div>

            {/* Dual Leaderboards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trading Volume */}
                <LeaderboardCard
                    title="Trading Volume"
                    icon={<TrendingUp className="w-5 h-5 text-[#2E81FF]" />}
                    entries={volumeLeaders}
                    formatValue={(val) => `$${val.toLocaleString()}`}
                />

                {/* Profit */}
                <LeaderboardCard
                    title="Profit"
                    icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                    entries={profitLeaders}
                    formatValue={(val) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                />
            </div>
        </div>
    );
}

function LeaderboardCard({
    title,
    icon,
    entries,
    formatValue,
}: {
    title: string;
    icon: React.ReactNode;
    entries: LeaderboardEntry[];
    formatValue: (value: number) => string;
}) {
    const getMedal = (rank: number) => {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return null;
    };

    return (
        <div className="bg-[#1A232E] border border-[#2E3A52] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#0E1217]/50 border-b border-[#2E3A52] p-6 flex items-center gap-3">
                <div className="p-2 bg-[#2E81FF]/10 rounded-lg">
                    {icon}
                </div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
            </div>

            {/* Entries */}
            <div className="divide-y divide-[#2E3A52]">
                {entries.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                        No data available
                    </div>
                ) : (
                    entries.map((entry) => (
                        <div
                            key={entry.userId}
                            className="p-4 flex items-center gap-4 hover:bg-[#2E81FF]/5 transition-colors"
                        >
                            {/* Rank */}
                            <div className="w-8 text-center">
                                {getMedal(entry.rank) || (
                                    <span className="text-zinc-500 text-sm font-mono">{entry.rank}</span>
                                )}
                            </div>

                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-[#0E1217] overflow-hidden flex-shrink-0 border border-[#2E3A52]">
                                {entry.avatarUrl && !entry.isPrivate ? (
                                    <img src={entry.avatarUrl} alt={entry.displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-[#0E1217]">
                                        <span className="text-sm font-bold">{entry.isPrivate ? "?" : entry.displayName[0]}</span>
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0">
                                <p className={`font-medium truncate ${entry.isPrivate ? "text-zinc-500 italic" : "text-white"}`}>
                                    {entry.isPrivate ? "Private user" : entry.displayName}
                                </p>
                            </div>

                            {/* Value */}
                            <div className="text-right">
                                <p className="font-mono font-bold text-zinc-200">{formatValue(entry.value)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
