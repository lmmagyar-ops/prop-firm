"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Position {
    id: string;
    marketId: string;
    marketTitle: string;
    direction: "YES" | "NO";
    shares: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
}

interface PositionsTableProps {
    challengeId?: string;
}

/**
 * PositionsTable - Polymarket-style inline positions table
 * 
 * Shows: OUTCOME | QTY | AVG | VALUE | RETURN | [Sell]
 * Matches Polymarket's trading interface below the chart
 */
export function PositionsTable({ challengeId }: PositionsTableProps) {
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);
    const [closingId, setClosingId] = useState<string | null>(null);
    const [viewNetted, setViewNetted] = useState(false);
    const router = useRouter();

    // Fetch positions
    const fetchPositions = async () => {
        try {
            const params = new URLSearchParams();
            if (challengeId) params.set("challengeId", challengeId);

            const res = await fetch(`/api/trade/positions?${params}`);
            if (res.ok) {
                const data = await res.json();
                setPositions(data.positions || []);
            }
        } catch (e) {
            console.error("Failed to fetch positions:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPositions();

        // Listen for balance updates to refresh
        const handleBalanceUpdate = () => fetchPositions();
        window.addEventListener("balance-updated", handleBalanceUpdate);
        return () => window.removeEventListener("balance-updated", handleBalanceUpdate);
    }, [challengeId]);

    // Close position handler
    const handleClose = async (positionId: string) => {
        setClosingId(positionId);
        try {
            const res = await fetch("/api/trade/close", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ positionId, idempotencyKey: crypto.randomUUID() }),
            });
            const data = await res.json();
            if (data.success) {
                setPositions((prev) => prev.filter((p) => p.id !== positionId));
                window.dispatchEvent(new Event("balance-updated"));
                router.refresh();
            } else {
                alert(`Failed to close: ${data.error || "Unknown error"}`);
            }
        } catch (e) {
            console.error("Close error:", e);
            alert("Network error closing position");
        } finally {
            setClosingId(null);
        }
    };

    // Calculate return % for display
    const formatReturn = (pnl: number, cost: number) => {
        if (cost === 0) return { text: "$0.00 (0.00%)", positive: true };
        const pct = (pnl / cost) * 100;
        const sign = pnl >= 0 ? "+" : "";
        return {
            text: `${sign}$${Math.abs(pnl).toFixed(2)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`,
            positive: pnl >= 0,
        };
    };

    if (loading) {
        return (
            <div className="bg-card/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">Positions</h3>
                </div>
                <div className="text-zinc-500 text-sm text-center py-4">Loading...</div>
            </div>
        );
    }

    if (positions.length === 0) {
        return null; // Don't show section if no positions
    }

    return (
        <div className="bg-card/50 border border-white/5 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Positions</h3>
                <button
                    onClick={() => setViewNetted(!viewNetted)}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                    {viewNetted ? "View All" : "View Net Positions"}
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                            <th className="text-left py-2 pr-4">Outcome</th>
                            <th className="text-right py-2 px-2">Qty</th>
                            <th className="text-right py-2 px-2">Avg</th>
                            <th className="text-right py-2 px-2">Value</th>
                            <th className="text-right py-2 px-2">Return</th>
                            <th className="text-right py-2 pl-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {positions.map((pos) => {
                            // Calculate values
                            const cost = pos.shares * pos.entryPrice;
                            const currentValue = pos.shares * (pos.direction === "NO" ? 1 - pos.currentPrice : pos.currentPrice);
                            const returnData = formatReturn(pos.unrealizedPnL, cost);

                            return (
                                <tr
                                    key={pos.id}
                                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                                >
                                    {/* Outcome */}
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-bold",
                                                    pos.direction === "YES"
                                                        ? "bg-green-500/20 text-green-400"
                                                        : "bg-red-500/20 text-red-400"
                                                )}
                                            >
                                                {pos.direction}
                                            </span>
                                            <span className="text-white font-medium truncate max-w-[180px]">
                                                {pos.marketTitle}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Qty */}
                                    <td className="py-3 px-2 text-right text-white">
                                        {pos.shares.toFixed(0)}
                                    </td>

                                    {/* Avg Entry Price */}
                                    <td className="py-3 px-2 text-right text-zinc-400">
                                        {(pos.entryPrice * 100).toFixed(0)}¢
                                    </td>

                                    {/* Current Value */}
                                    <td className="py-3 px-2 text-right">
                                        <div className="text-white font-medium">
                                            ${currentValue.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-zinc-500">
                                            Cost: ${cost.toFixed(2)}
                                        </div>
                                    </td>

                                    {/* Return */}
                                    <td className="py-3 px-2 text-right">
                                        <div
                                            className={cn(
                                                "flex items-center justify-end gap-1 font-medium",
                                                returnData.positive ? "text-green-400" : "text-red-400"
                                            )}
                                        >
                                            {returnData.positive ? (
                                                <TrendingUp className="w-3 h-3" />
                                            ) : (
                                                <TrendingDown className="w-3 h-3" />
                                            )}
                                            {returnData.text}
                                        </div>
                                    </td>

                                    {/* Sell Button */}
                                    <td className="py-3 pl-2 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleClose(pos.id)}
                                            disabled={closingId === pos.id}
                                            className="h-7 px-3 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                                        >
                                            {closingId === pos.id ? "..." : "Sell"}
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
