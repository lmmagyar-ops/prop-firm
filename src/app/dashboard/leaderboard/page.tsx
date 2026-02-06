"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, DollarSign, Medal, User, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface LeaderboardEntry {
    rank: number;
    userId: string;
    displayName: string;
    avatarUrl?: string;
    tradingVolume: number;
    totalProfit: number;
    winRate: number;
    maxDrawdown: number;
    consistency: number;
    leaderboardPrivacy: "public" | "semi_private" | "fully_private";
    showCountry: boolean;
    showStatsPublicly: boolean;
    country?: string;
}

// Mock expanded data with privacy settings
const mockLeaderboard: LeaderboardEntry[] = [
    { rank: 1, userId: "2", displayName: "Cardman", tradingVolume: 35153161, totalProfit: 160487.63, winRate: 72.1, maxDrawdown: 3.8, consistency: 95, leaderboardPrivacy: "public", showCountry: true, showStatsPublicly: true, country: "GB" },
    { rank: 2, userId: "1", displayName: "Mat", tradingVolume: 64963427, totalProfit: 80126.18, winRate: 68.5, maxDrawdown: 4.2, consistency: 92, leaderboardPrivacy: "public", showCountry: true, showStatsPublicly: true, country: "US" },
    { rank: 3, userId: "3", displayName: "Michael", tradingVolume: 31498912, totalProfit: 78835.92, winRate: 65.3, maxDrawdown: 5.1, consistency: 88, leaderboardPrivacy: "semi_private", showCountry: false, showStatsPublicly: true, country: "CA" },
    { rank: 4, userId: "4", displayName: "David", tradingVolume: 28100500, totalProfit: 65000.00, winRate: 61.2, maxDrawdown: 6.5, consistency: 85, leaderboardPrivacy: "public", showCountry: true, showStatsPublicly: true, country: "AU" },
    { rank: 5, userId: "5", displayName: "Sarah", tradingVolume: 15200000, totalProfit: 50000.00, winRate: 58.7, maxDrawdown: 7.2, consistency: 82, leaderboardPrivacy: "public", showCountry: false, showStatsPublicly: true, country: "DE" },
    { rank: 6, userId: "6", displayName: "James", tradingVolume: 12800000, totalProfit: 45000.00, winRate: 56.3, maxDrawdown: 7.8, consistency: 79, leaderboardPrivacy: "semi_private", showCountry: false, showStatsPublicly: true, country: "FR" },
    { rank: 7, userId: "7", displayName: "Robert", tradingVolume: 11500000, totalProfit: 42000.00, winRate: 54.9, maxDrawdown: 8.1, consistency: 76, leaderboardPrivacy: "public", showCountry: true, showStatsPublicly: true, country: "JP" },
    { rank: 8, userId: "8", displayName: "Jennifer", tradingVolume: 10200000, totalProfit: 38000.00, winRate: 53.2, maxDrawdown: 8.5, consistency: 74, leaderboardPrivacy: "public", showCountry: true, showStatsPublicly: true, country: "BR" },
    { rank: 9, userId: "9", displayName: "William", tradingVolume: 9800000, totalProfit: 35000.00, winRate: 51.8, maxDrawdown: 8.9, consistency: 71, leaderboardPrivacy: "semi_private", showCountry: false, showStatsPublicly: true, country: "IT" },
    { rank: 10, userId: "10", displayName: "Emma", tradingVolume: 9200000, totalProfit: 32000.00, winRate: 50.4, maxDrawdown: 9.2, consistency: 69, leaderboardPrivacy: "public", showCountry: true, showStatsPublicly: true, country: "ES" },
    { rank: 11, userId: "11", displayName: "Alex", tradingVolume: 8500000, totalProfit: 29000.00, winRate: 49.1, maxDrawdown: 9.5, consistency: 67, leaderboardPrivacy: "public", showCountry: true, showStatsPublicly: true, country: "NL" },
    { rank: 12, userId: "12", displayName: "Olivia", tradingVolume: 7800000, totalProfit: 26000.00, winRate: 47.8, maxDrawdown: 9.8, consistency: 65, leaderboardPrivacy: "public", showCountry: true, showStatsPublicly: true, country: "SE" },
    { rank: 13, userId: "13", displayName: "Noah", tradingVolume: 7100000, totalProfit: 23000.00, winRate: 46.5, maxDrawdown: 9.9, consistency: 63, leaderboardPrivacy: "public", showCountry: true, showStatsPublicly: true, country: "NO" },
    { rank: 14, userId: "14", displayName: "Ava", tradingVolume: 6400000, totalProfit: 20000.00, winRate: 45.2, maxDrawdown: 10.0, consistency: 61, leaderboardPrivacy: "public", showCountry: true, showStatsPublicly: true, country: "FI" },
    { rank: 15, userId: "15", displayName: "PrivateUser", tradingVolume: 5700000, totalProfit: 17000.00, winRate: 43.9, maxDrawdown: 10.0, consistency: 59, leaderboardPrivacy: "semi_private", showCountry: false, showStatsPublicly: true, country: "UK" },
];

const currentUserMockData = {
    rank: 847,
    displayName: "You",
    tradingVolume: 125000,
    totalProfit: 2450.00,
    winRate: 52.3,
    maxDrawdown: 8.7,
    consistency: 71,
};

export default function LeaderboardPage() {
    const [season, setSeason] = useState("season-12-dec");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState<"volume" | "profit">("profit");
    const [countdown, setCountdown] = useState({ days: 10, hours: 11, minutes: 42, seconds: 35 });

    const itemsPerPage = 15;

    // Live countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                let { days, hours, minutes, seconds } = prev;

                seconds--;
                if (seconds < 0) {
                    seconds = 59;
                    minutes--;
                }
                if (minutes < 0) {
                    minutes = 59;
                    hours--;
                }
                if (hours < 0) {
                    hours = 23;
                    days--;
                }

                return { days, hours, minutes, seconds };
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Filter and sort
    const filteredData = mockLeaderboard
        .filter((entry) => entry.leaderboardPrivacy !== "fully_private") // Exclude fully private users
        .filter((entry) =>
            entry.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.rank.toString().includes(searchQuery)
        )
        .sort((a, b) => {
            if (sortBy === "profit") return b.totalProfit - a.totalProfit;
            return b.tradingVolume - a.tradingVolume;
        });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getMedal = (rank: number) => {
        if (rank === 1) return <span className="text-2xl">🥇</span>;
        if (rank === 2) return <span className="text-2xl">🥈</span>;
        if (rank === 3) return <span className="text-2xl">🥉</span>;
        return null;
    };

    const getCountryFlag = (country?: string) => {
        if (!country) return null;
        const flags: Record<string, string> = {
            US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪",
            FR: "🇫🇷", JP: "🇯🇵", BR: "🇧🇷", IT: "🇮🇹", ES: "🇪🇸",
            NL: "🇳🇱", SE: "🇸🇪", NO: "🇳🇴", FI: "🇫🇮"
        };
        return <span className="text-lg">{flags[country] || "🌍"}</span>;
    };

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
                            <SelectItem value="season-12-dec" className="focus:bg-[#29af73]/20 cursor-pointer">Season 12: December</SelectItem>
                            <SelectItem value="season-11-nov" className="focus:bg-[#29af73]/20 cursor-pointer">Season 11: November</SelectItem>
                            <SelectItem value="season-10-oct" className="focus:bg-[#29af73]/20 cursor-pointer">Season 10: October</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="text-sm text-zinc-400">
                        Ends in: <span className="text-white font-mono tabular-nums">
                            {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                        </span>
                    </div>
                </div>
            </div>

            {/* Your Stats Card - Sticky */}
            <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border-2 border-blue-500/30 rounded-2xl p-6 sticky top-4 z-10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                            <User className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Your Ranking</h2>
                            <p className="text-sm text-zinc-400">Track your performance</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-white tabular-nums">#{currentUserMockData.rank}</p>
                        <p className="text-xs text-zinc-500">out of 12,483 traders</p>
                    </div>
                </div>
                <div className="grid grid-cols-5 gap-4">
                    <StatCard label="Volume" value={`$${currentUserMockData.tradingVolume.toLocaleString()}`} />
                    <StatCard label="Profit" value={`$${currentUserMockData.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="green" />
                    <StatCard label="Win Rate" value={`${currentUserMockData.winRate}%`} />
                    <StatCard label="Max DD" value={`${currentUserMockData.maxDrawdown}%`} color="red" />
                    <StatCard label="Consistency" value={`${currentUserMockData.consistency}/100`} color="purple" />
                </div>
            </div>

            {/* Search & Sort Controls */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        type="text"
                        placeholder="Search by name or rank..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-10 bg-[#1A232E] border-[#2E3A52] text-white placeholder:text-zinc-500"
                    />
                </div>
                <Select value={sortBy} onValueChange={(val) => setSortBy(val as "volume" | "profit")}>
                    <SelectTrigger className="w-48 bg-[#1A232E] border-[#2E3A52] text-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A232E] border-[#2E3A52] text-white">
                        <SelectItem value="profit" className="focus:bg-[#29af73]/20">Sort by Profit</SelectItem>
                        <SelectItem value="volume" className="focus:bg-[#29af73]/20">Sort by Volume</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Full Rankings Table */}
            <div className="bg-[#1A232E] border border-[#2E3A52] rounded-2xl overflow-hidden">
                {/* Table Header */}
                <div className="bg-[#0E1217]/50 border-b border-[#2E3A52] px-6 py-4">
                    <div className="grid grid-cols-[60px_50px_1fr_150px_150px_120px_120px_120px] gap-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        <div>Rank</div>
                        <div></div>
                        <div>Trader</div>
                        <div className="text-right">Volume</div>
                        <div className="text-right">Profit</div>
                        <div className="text-right">Win Rate</div>
                        <div className="text-right">Max DD</div>
                        <div className="text-right">Score</div>
                    </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-[#2E3A52]">
                    {paginatedData.length === 0 ? (
                        <div className="p-12 text-center text-zinc-500">
                            No traders found matching "{searchQuery}"
                        </div>
                    ) : (
                        paginatedData.map((entry) => (
                            <div
                                key={entry.userId}
                                className="px-6 py-4 hover:bg-[#29af73]/5 transition-colors group"
                            >
                                <div className="grid grid-cols-[60px_50px_1fr_150px_150px_120px_120px_120px] gap-4 items-center">
                                    {/* Rank */}
                                    <div className="flex items-center justify-center">
                                        {getMedal(entry.rank) || (
                                            <span className="text-zinc-400 font-mono tabular-nums text-sm">#{entry.rank}</span>
                                        )}
                                    </div>

                                    {/* Flag */}
                                    <div className="flex items-center justify-center">
                                        {entry.showCountry && entry.country
                                            ? getCountryFlag(entry.country)
                                            : "🌍"}
                                    </div>

                                    {/* Trader Name + Avatar */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#0E1217] overflow-hidden flex-shrink-0 border border-[#2E3A52]">
                                            {entry.avatarUrl && entry.leaderboardPrivacy === "public" ? (
                                                <img src={entry.avatarUrl} alt={entry.displayName} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-[#0E1217]">
                                                    <span className="text-sm font-bold">
                                                        {entry.leaderboardPrivacy === "public" ? entry.displayName[0] : "?"}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {entry.leaderboardPrivacy === "public" ? (
                                            <Link
                                                href={`/profile/${entry.userId}`}
                                                className="font-medium text-white hover:text-blue-400 transition-colors group-hover:underline"
                                            >
                                                {entry.displayName}
                                            </Link>
                                        ) : (
                                            <span className="font-medium text-zinc-500 italic">
                                                Trader #{entry.rank}
                                            </span>
                                        )}
                                    </div>

                                    {/* Volume */}
                                    <div className="text-right">
                                        {entry.showStatsPublicly ? (
                                            <p className="font-mono text-sm text-zinc-300 tabular-nums">
                                                ${entry.tradingVolume.toLocaleString()}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-zinc-600 italic">Hidden</p>
                                        )}
                                    </div>

                                    {/* Profit */}
                                    <div className="text-right">
                                        {entry.showStatsPublicly ? (
                                            <p className="font-mono font-semibold text-green-400 tabular-nums">
                                                ${entry.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-zinc-600 italic">Hidden</p>
                                        )}
                                    </div>

                                    {/* Win Rate */}
                                    <div className="text-right">
                                        {entry.showStatsPublicly ? (
                                            <div className="inline-flex items-center gap-1">
                                                <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${entry.winRate}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-mono text-zinc-300 tabular-nums">{entry.winRate}%</span>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-zinc-600 italic">Hidden</p>
                                        )}
                                    </div>

                                    {/* Max DD */}
                                    <div className="text-right">
                                        {entry.showStatsPublicly ? (
                                            <p className="font-mono text-sm text-red-400 tabular-nums">
                                                {entry.maxDrawdown}%
                                            </p>
                                        ) : (
                                            <p className="text-sm text-zinc-600 italic">Hidden</p>
                                        )}
                                    </div>

                                    {/* Consistency Score */}
                                    <div className="text-right">
                                        {entry.showStatsPublicly ? (
                                            <div className="inline-flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-500 rounded-full"
                                                        style={{ width: `${entry.consistency}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-mono text-zinc-300 tabular-nums">{entry.consistency}</span>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-zinc-600 italic">Hidden</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-[#0E1217]/50 border-t border-[#2E3A52] px-6 py-4 flex items-center justify-between">
                        <p className="text-sm text-zinc-500">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} traders
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="bg-[#1A232E] border-[#2E3A52] text-white hover:bg-[#2E3A52]"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Previous
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={currentPage === pageNum
                                                ? "bg-blue-600 text-white"
                                                : "bg-[#1A232E] border-[#2E3A52] text-white hover:bg-[#2E3A52]"
                                            }
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="bg-[#1A232E] border-[#2E3A52] text-white hover:bg-[#2E3A52]"
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, color = "blue" }: { label: string; value: string; color?: "blue" | "green" | "red" | "purple" }) {
    const colors = {
        blue: "text-blue-400",
        green: "text-green-400",
        red: "text-red-400",
        purple: "text-purple-400",
    };

    return (
        <div className="bg-[#1A232E]/50 border border-[#2E3A52] rounded-lg p-3">
            <p className="text-xs text-zinc-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${colors[color]} tabular-nums`}>{value}</p>
        </div>
    );
}
