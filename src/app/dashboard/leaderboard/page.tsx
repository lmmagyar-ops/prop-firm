"use client";

import { useState, useEffect } from "react";
import { Trophy, TrendingUp, DollarSign, User, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

interface LeaderboardEntry {
    rank: number;
    userId: string;
    displayName: string;
    image: string | null;
    country: string | null;
    tradingVolume: number;
    totalProfit: number;
    leaderboardPrivacy: string;
    showCountry: boolean;
    showStatsPublicly: boolean;
}

interface LeaderboardData {
    entries: LeaderboardEntry[];
    myStats: { rank: number; tradingVolume: number; totalProfit: number } | null;
    totalTraders: number;
    meta: { page: number; pageSize: number; totalPages: number };
}

const FLAGS: Record<string, string> = {
    US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪", FR: "🇫🇷",
    JP: "🇯🇵", BR: "🇧🇷", IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", SE: "🇸🇪",
    NO: "🇳🇴", FI: "🇫🇮", KR: "🇰🇷", MX: "🇲🇽", IN: "🇮🇳", PL: "🇵🇱",
};

function formatMoney(n: number): string {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
}

export default function LeaderboardPage() {
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<"profit" | "volume">("profit");
    const [page, setPage] = useState(1);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/leaderboard?sort=${sortBy}&page=${page}&limit=20`)
            .then((r) => r.json())
            .then((d) => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [sortBy, page]);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!data || data.totalTraders === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <Trophy className="w-16 h-16 text-zinc-700 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Leaderboard Coming Soon</h2>
                <p className="text-zinc-500 max-w-md">
                    Start trading to claim your spot. Rankings are based on realized profit and trading volume.
                </p>
            </div>
        );
    }

    const usePodium = data.totalTraders <= 10;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
                    <p className="text-sm text-zinc-500 mt-1">{data.totalTraders} ranked trader{data.totalTraders !== 1 ? "s" : ""}</p>
                </div>
                <Select value={sortBy} onValueChange={(v) => { setSortBy(v as "profit" | "volume"); setPage(1); }}>
                    <SelectTrigger className="w-44 bg-[#0E1217] border-[#2E3A52] text-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A232E] border-[#2E3A52] text-white">
                        <SelectItem value="profit" className="focus:bg-[#29af73]/20 cursor-pointer">
                            <span className="flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" /> By Profit</span>
                        </SelectItem>
                        <SelectItem value="volume" className="focus:bg-[#29af73]/20 cursor-pointer">
                            <span className="flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> By Volume</span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Your Stats Card */}
            {data.myStats && <MyStatsCard stats={data.myStats} totalTraders={data.totalTraders} />}

            {/* Rankings */}
            {usePodium
                ? <PodiumView entries={data.entries} />
                : <TableView entries={data.entries} meta={data.meta} page={page} setPage={setPage} loading={loading} />
            }
        </div>
    );
}

/* ─── Your Stats Card ─── */
function MyStatsCard({ stats, totalTraders }: { stats: NonNullable<LeaderboardData["myStats"]>; totalTraders: number }) {
    return (
        <div className="bg-gradient-to-br from-primary/10 to-purple-600/10 border border-primary/30 rounded-2xl p-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                        <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white">Your Ranking</h2>
                        <p className="text-xs text-zinc-500">Out of {totalTraders.toLocaleString()} traders</p>
                    </div>
                </div>
                <p className="text-3xl font-bold text-white tabular-nums">#{stats.rank}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-[#1A232E]/50 border border-[#2E3A52] rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">Total Profit</p>
                    <p className={`text-lg font-bold tabular-nums ${stats.totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {formatMoney(stats.totalProfit)}
                    </p>
                </div>
                <div className="bg-[#1A232E]/50 border border-[#2E3A52] rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">Volume</p>
                    <p className="text-lg font-bold text-primary tabular-nums">{formatMoney(stats.tradingVolume)}</p>
                </div>
            </div>
        </div>
    );
}

/* ─── Podium View (≤10 traders) ─── */
function PodiumView({ entries }: { entries: LeaderboardEntry[] }) {
    const medals = ["🥇", "🥈", "🥉"];

    return (
        <div className="space-y-3">
            {entries.map((e) => {
                const isPublic = e.leaderboardPrivacy === "public";
                const isTop3 = e.rank <= 3;

                return (
                    <div
                        key={e.userId}
                        className={`
                            relative rounded-2xl p-5 transition-all
                            ${isTop3
                                ? "bg-gradient-to-r from-[#1A232E] to-[#1A232E]/80 border-2 border-primary/20"
                                : "bg-[#1A232E] border border-[#2E3A52]"
                            }
                        `}
                    >
                        <div className="flex items-center gap-4">
                            {/* Rank */}
                            <div className="flex-shrink-0 w-12 text-center">
                                {isTop3 ? (
                                    <span className="text-3xl">{medals[e.rank - 1]}</span>
                                ) : (
                                    <span className="text-lg font-mono text-zinc-400 tabular-nums">#{e.rank}</span>
                                )}
                            </div>

                            {/* Avatar */}
                            <div className={`w-12 h-12 rounded-full flex-shrink-0 overflow-hidden border-2 ${isTop3 ? "border-primary/40" : "border-[#2E3A52]"}`}>
                                {e.image && isPublic ? (
                                    <img src={e.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#0E1217] text-zinc-500 font-bold">
                                        {isPublic ? e.displayName[0]?.toUpperCase() : "?"}
                                    </div>
                                )}
                            </div>

                            {/* Name + Flag */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    {e.showCountry && e.country && (
                                        <span className="text-lg">{FLAGS[e.country] || "🌍"}</span>
                                    )}
                                    {isPublic ? (
                                        <Link
                                            href={`/profile/${e.userId}`}
                                            className="font-semibold text-white hover:text-primary transition-colors truncate"
                                        >
                                            {e.displayName}
                                        </Link>
                                    ) : (
                                        <span className="font-medium text-zinc-500 italic">Trader #{e.rank}</span>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-6 flex-shrink-0">
                                {e.showStatsPublicly ? (
                                    <>
                                        <div className="text-right">
                                            <p className="text-xs text-zinc-500 mb-0.5">Profit</p>
                                            <p className={`text-base font-bold font-mono tabular-nums ${e.totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                {formatMoney(e.totalProfit)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-zinc-500 mb-0.5">Volume</p>
                                            <p className="text-base font-mono text-zinc-300 tabular-nums">
                                                {formatMoney(e.tradingVolume)}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-zinc-600 italic">Stats hidden</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Table View (10+ traders) ─── */
function TableView({ entries, meta, page, setPage, loading }: {
    entries: LeaderboardEntry[];
    meta: LeaderboardData["meta"];
    page: number;
    setPage: (p: number) => void;
    loading: boolean;
}) {
    return (
        <div className={`bg-[#1A232E] border border-[#2E3A52] rounded-2xl overflow-hidden ${loading ? "opacity-60" : ""}`}>
            {/* Header */}
            <div className="bg-[#0E1217]/50 border-b border-[#2E3A52] px-6 py-3.5">
                <div className="grid grid-cols-[60px_1fr_140px_140px] gap-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <div>Rank</div>
                    <div>Trader</div>
                    <div className="text-right">Profit</div>
                    <div className="text-right">Volume</div>
                </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[#2E3A52]">
                {entries.map((e) => {
                    const isPublic = e.leaderboardPrivacy === "public";
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                        <div key={e.userId} className="px-6 py-3.5 hover:bg-[#29af73]/5 transition-colors">
                            <div className="grid grid-cols-[60px_1fr_140px_140px] gap-4 items-center">
                                <div className="flex items-center justify-center">
                                    {e.rank <= 3
                                        ? <span className="text-xl">{medals[e.rank - 1]}</span>
                                        : <span className="text-sm font-mono text-zinc-400 tabular-nums">#{e.rank}</span>
                                    }
                                </div>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden border border-[#2E3A52]">
                                        {e.image && isPublic ? (
                                            <img src={e.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-[#0E1217] text-zinc-500 text-xs font-bold">
                                                {isPublic ? e.displayName[0]?.toUpperCase() : "?"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                        {e.showCountry && e.country && <span>{FLAGS[e.country] || "🌍"}</span>}
                                        {isPublic ? (
                                            <Link href={`/profile/${e.userId}`} className="font-medium text-white hover:text-primary transition-colors truncate">
                                                {e.displayName}
                                            </Link>
                                        ) : (
                                            <span className="text-zinc-500 italic">Trader #{e.rank}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    {e.showStatsPublicly ? (
                                        <span className={`font-mono font-semibold tabular-nums ${e.totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                                            {formatMoney(e.totalProfit)}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-zinc-600 italic">Hidden</span>
                                    )}
                                </div>
                                <div className="text-right">
                                    {e.showStatsPublicly ? (
                                        <span className="font-mono text-zinc-300 tabular-nums text-sm">{formatMoney(e.tradingVolume)}</span>
                                    ) : (
                                        <span className="text-sm text-zinc-600 italic">Hidden</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div className="bg-[#0E1217]/50 border-t border-[#2E3A52] px-6 py-3.5 flex items-center justify-between">
                    <p className="text-sm text-zinc-500">
                        Page {meta.page} of {meta.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}
                            className="bg-[#1A232E] border-[#2E3A52] text-white hover:bg-[#2E3A52]">
                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= meta.totalPages}
                            className="bg-[#1A232E] border-[#2E3A52] text-white hover:bg-[#2E3A52]">
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
