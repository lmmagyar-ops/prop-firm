"use client";

import { useState, useEffect } from "react";
import { Clock, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelectedChallengeContext } from "@/contexts/SelectedChallengeContext";

interface Trade {
    id: string;
    marketId: string;
    marketTitle: string;
    eventTitle?: string;
    image?: string;
    type: "BUY" | "SELL";
    price: number;
    amount: number;
    shares: number;
    realizedPnL: number | null;
    executedAt: string;
}

export function TradeHistoryTable() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const { selectedChallengeId } = useSelectedChallengeContext();

    const pageSize = 20;

    useEffect(() => {
        const fetchTrades = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ limit: "100" }); // Fetch more for client-side pagination
                if (selectedChallengeId) {
                    params.set("challengeId", selectedChallengeId);
                }
                const res = await fetch(`/api/trades/history?${params}`);
                if (res.ok) {
                    const data = await res.json();
                    setTrades(data.trades || []);
                }
            } catch (e) {
                console.error("Failed to fetch trade history:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchTrades();
    }, [selectedChallengeId]);

    const filteredTrades = trades.filter(trade =>
        trade.marketTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.eventTitle?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredTrades.length / pageSize);
    const paginatedTrades = filteredTrades.slice((page - 1) * pageSize, page * pageSize);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading) {
        return (
            <div className="bg-card/50 border border-white/5 rounded-xl p-8">
                <div className="flex items-center justify-center h-48 text-zinc-500">
                    Loading trades...
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card/50 border border-white/5 rounded-xl overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-white/5">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search markets..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-zinc-900/50 border-b border-white/5">
                        <tr>
                            <th className="text-left text-xs font-bold text-zinc-500 uppercase tracking-wider px-4 py-3">Date</th>
                            <th className="text-left text-xs font-bold text-zinc-500 uppercase tracking-wider px-4 py-3">Market</th>
                            <th className="text-center text-xs font-bold text-zinc-500 uppercase tracking-wider px-4 py-3">Type</th>
                            <th className="text-right text-xs font-bold text-zinc-500 uppercase tracking-wider px-4 py-3">Price</th>
                            <th className="text-right text-xs font-bold text-zinc-500 uppercase tracking-wider px-4 py-3">Shares</th>
                            <th className="text-right text-xs font-bold text-zinc-500 uppercase tracking-wider px-4 py-3">Amount</th>
                            <th className="text-right text-xs font-bold text-zinc-500 uppercase tracking-wider px-4 py-3">P&L</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {paginatedTrades.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-zinc-500">
                                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    {searchQuery ? "No trades match your search" : "No trades yet"}
                                </td>
                            </tr>
                        ) : (
                            paginatedTrades.map((trade) => (
                                <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">
                                        {formatDate(trade.executedAt)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                                                {trade.image ? (
                                                    <img src={trade.image} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs">📊</div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white truncate max-w-[300px]">
                                                    {trade.marketTitle}
                                                </p>
                                                {trade.eventTitle && (
                                                    <p className="text-xs text-zinc-500 truncate max-w-[300px]">
                                                        {trade.eventTitle}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={cn(
                                            "px-2 py-1 rounded text-xs font-bold",
                                            trade.type === "BUY"
                                                ? "bg-green-500/10 text-green-400"
                                                : "bg-red-500/10 text-red-400"
                                        )}>
                                            {trade.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-mono text-white">
                                        {(trade.price * 100).toFixed(1)}¢
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-mono text-zinc-400">
                                        {trade.shares.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-white">
                                        ${trade.amount.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {trade.realizedPnL !== null ? (
                                            <span className={cn(
                                                "text-sm font-bold flex items-center justify-end gap-1",
                                                trade.realizedPnL >= 0 ? "text-green-400" : "text-red-400"
                                            )}>
                                                {trade.realizedPnL >= 0 ? (
                                                    <TrendingUp className="w-3 h-3" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3" />
                                                )}
                                                {trade.realizedPnL >= 0 ? "+" : ""}${trade.realizedPnL.toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-zinc-600">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                    <p className="text-xs text-zinc-500">
                        Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, filteredTrades.length)} of {filteredTrades.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-zinc-400">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
