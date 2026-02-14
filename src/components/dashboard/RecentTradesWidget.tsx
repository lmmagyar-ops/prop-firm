"use client";

import { useState, useEffect } from "react";
import { Clock, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSelectedChallengeContext } from "@/contexts/SelectedChallengeContext";
import { apiFetch } from "@/lib/api-fetch";
import ScrollReveal from "@/components/reactbits/ScrollReveal";
import SpotlightCard from "@/components/reactbits/SpotlightCard";

interface Trade {
    id: string;
    marketId: string;
    marketTitle: string;
    eventTitle?: string;
    image?: string;
    type: "BUY" | "SELL";
    direction: "YES" | "NO" | null;
    price: number;
    amount: number;
    shares: number;
    realizedPnL: number | null;
    executedAt: string;
}

export function RecentTradesWidget() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { selectedChallengeId } = useSelectedChallengeContext();

    useEffect(() => {
        const fetchTrades = async () => {
            setError(null);
            try {
                const params = new URLSearchParams({ limit: "5" });
                if (selectedChallengeId) {
                    params.set("challengeId", selectedChallengeId);
                }
                const res = await apiFetch(`/api/trades/history?${params}`);
                if (res.ok) {
                    const data = await res.json();
                    setTrades(data.trades || []);
                } else {
                    console.error(`[RecentTradesWidget] API error: ${res.status}`);
                    setError(res.status === 429 ? "Rate limited" : `Error (${res.status})`);
                }
            } catch (e) {
                console.error("[RecentTradesWidget] Network error:", e);
                setError("Network error");
            } finally {
                setLoading(false);
            }
        };

        fetchTrades();

        const handleBalanceUpdate = () => {
            fetchTrades();
        };
        window.addEventListener('balance-updated', handleBalanceUpdate);
        return () => window.removeEventListener('balance-updated', handleBalanceUpdate);
    }, [selectedChallengeId]);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    if (loading) {
        return (
            <div className="bg-card/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">Recent Trades</h3>
                </div>
                <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">
                    Loading...
                </div>
            </div>
        );
    }

    if (error && trades.length === 0) {
        return (
            <div className="bg-card/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">Recent Trades</h3>
                </div>
                <div className="flex flex-col items-center justify-center h-24 text-amber-400 text-sm">
                    <span className="text-xs opacity-70">⚠ {error}</span>
                </div>
            </div>
        );
    }

    if (trades.length === 0) {
        return (
            <div className="bg-card/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">Recent Trades</h3>
                </div>
                <div className="flex flex-col items-center justify-center h-24 text-zinc-500 text-sm">
                    <Clock className="w-5 h-5 mb-2 opacity-50" />
                    <span>No trades yet</span>
                </div>
            </div>
        );
    }

    return (
        <ScrollReveal direction="up" distance={20} duration={0.4}>
            <SpotlightCard
                className="bg-card/50 border border-white/5 rounded-xl p-6"
                spotlightColor="rgba(0, 255, 178, 0.06)"
                spotlightSize={500}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-zinc-500" />
                        Recent Trades
                    </h3>
                    <Link
                        href="/dashboard/history"
                        className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                        View All <ExternalLink className="w-3 h-3" />
                    </Link>
                </div>

                <div className="space-y-3">
                    {trades.map((trade, index) => (
                        <ScrollReveal key={trade.id} direction="up" distance={15} duration={0.3} delay={index * 0.05}>
                            <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {/* Market Image */}
                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                                        {trade.image ? (
                                            <img src={trade.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs">📊</div>
                                        )}
                                    </div>

                                    {/* Market Details */}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-white truncate">
                                            {trade.marketTitle}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded font-bold",
                                                trade.type === "BUY"
                                                    ? "bg-green-500/10 text-green-400"
                                                    : "bg-red-500/10 text-red-400"
                                            )}>
                                                {trade.type}
                                            </span>
                                            {trade.direction && (
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded font-bold",
                                                    trade.direction === "YES"
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : "bg-rose-500/10 text-rose-400"
                                                )}>
                                                    {trade.direction}
                                                </span>
                                            )}
                                            <span>{trade.shares.toFixed(1)} @ {(trade.price * 100).toFixed(1)}¢</span>
                                            <span className="text-zinc-600">•</span>
                                            <span>{formatTime(trade.executedAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Amount / P&L */}
                                <div className="text-right flex-shrink-0 ml-4">
                                    <p className="text-sm font-bold text-white">${trade.amount.toFixed(2)}</p>
                                    {trade.realizedPnL !== null && (
                                        <p className={cn(
                                            "text-xs font-medium flex items-center justify-end gap-0.5",
                                            trade.realizedPnL >= 0 ? "text-green-400" : "text-red-400"
                                        )}>
                                            {trade.realizedPnL >= 0 ? (
                                                <TrendingUp className="w-3 h-3" />
                                            ) : (
                                                <TrendingDown className="w-3 h-3" />
                                            )}
                                            {trade.realizedPnL >= 0 ? "+" : ""}${trade.realizedPnL.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </SpotlightCard>
        </ScrollReveal>
    );
}
