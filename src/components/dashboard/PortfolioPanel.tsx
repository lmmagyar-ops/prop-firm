"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Briefcase, X, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Position {
    id: string;
    marketId: string;
    marketTitle: string;
    direction: "YES" | "NO";
    shares: number;
    avgPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
}

interface AccountSummary {
    equity: number;
    cash: number;
    positionValue: number;
}

export function PortfolioPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [positions, setPositions] = useState<Position[]>([]);
    const [summary, setSummary] = useState<AccountSummary>({ equity: 0, cash: 0, positionValue: 0 });

    useEffect(() => {
        const fetchPositions = async () => {
            try {
                // PERF: Parallel fetch instead of sequential waterfall
                const [positionsRes, balanceRes] = await Promise.all([
                    fetch("/api/trade/positions"),
                    fetch("/api/user/balance")
                ]);

                if (positionsRes.ok) {
                    const data = await positionsRes.json();
                    setPositions(data.positions || []);

                    // Calculate summary
                    const positionValue = (data.positions || []).reduce(
                        (acc: number, p: Position) => acc + (p.shares * p.currentPrice), 0
                    );

                    if (balanceRes.ok) {
                        const balanceData = await balanceRes.json();
                        const cash = parseFloat(balanceData.balance || "0");
                        setSummary({
                            cash,
                            positionValue,
                            equity: cash + positionValue
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to fetch positions", e);
            }
        };

        fetchPositions();

        // Also refresh when balance-updated event fires
        const handleBalanceUpdate = () => fetchPositions();
        window.addEventListener('balance-updated', handleBalanceUpdate);

        const interval = setInterval(fetchPositions, 10000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('balance-updated', handleBalanceUpdate);
        };
    }, []);

    // PERF: Memoize to avoid recalculating on every render
    const totalPnL = useMemo(() =>
        positions.reduce((acc, p) => acc + p.unrealizedPnL, 0),
        [positions]
    );
    const positionCount = positions.length;

    return (
        <>
            {/* Trigger Button */}
            <button
                className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white transition-colors relative"
                onClick={() => setIsOpen(true)}
            >
                <Briefcase className="w-5 h-5" />
                <span className="text-sm font-medium hidden md:block">Portfolio</span>

                {/* Position Count Badge */}
                <AnimatePresence>
                    {positionCount > 0 && (
                        <motion.span
                            key={positionCount}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                            className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-blue-600 text-[10px] font-bold text-white rounded-full ring-2 ring-zinc-900"
                        >
                            {positionCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Portal for Backdrop and Panel - renders at document body level */}
            {typeof window !== "undefined" && isOpen && createPortal(
                <>
                    {/* Backdrop */}
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9998]"
                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
                            onClick={() => setIsOpen(false)}
                        />
                    </AnimatePresence>

                    {/* Slide-Out Panel */}
                    <AnimatePresence>
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-full max-w-md border-l border-zinc-800 shadow-2xl z-[9999] flex flex-col"
                            style={{ backgroundColor: '#09090b' }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <Briefcase className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-lg font-bold text-white">Portfolio</h2>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-zinc-400" />
                                </button>
                            </div>

                            {/* Account Summary */}
                            <div className="p-4 bg-zinc-900 border-b border-zinc-800">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Equity</p>
                                        <p className="text-lg font-bold text-white font-mono">
                                            ${summary.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Cash</p>
                                        <p className="text-sm font-medium text-zinc-300 font-mono">
                                            ${summary.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Positions</p>
                                        <p className="text-sm font-medium text-zinc-300 font-mono">
                                            ${summary.positionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Active Positions Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
                                <span className="text-sm font-medium text-zinc-400">Active Positions</span>
                                <span className={cn(
                                    "text-sm font-mono font-bold",
                                    totalPnL >= 0 ? "text-green-400" : "text-red-400"
                                )}>
                                    {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
                                </span>
                            </div>

                            {/* Positions List */}
                            <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#09090b' }}>
                                {positionCount === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                        <Briefcase className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="text-sm">No active positions</p>
                                        <p className="text-xs mt-1">Trade to open a position</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-zinc-800/50">
                                        {positions.map((pos) => {
                                            // For YES: profit when currentPrice > avgPrice
                                            // For NO: profit when currentPrice < avgPrice (so we use inverse prices)
                                            const entryNoPrice = 1 - pos.avgPrice;
                                            const currentNoPrice = 1 - pos.currentPrice;

                                            const pnlPercent = pos.direction === "YES"
                                                ? ((pos.currentPrice - pos.avgPrice) / pos.avgPrice * 100)
                                                : ((currentNoPrice - entryNoPrice) / entryNoPrice * 100);

                                            const isUp = pos.unrealizedPnL >= 0;

                                            return (
                                                <div key={pos.id} className="p-4 hover:bg-zinc-800/30 transition-colors">
                                                    {/* Market Title */}
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1 pr-2">
                                                            <h3 className="text-sm font-medium text-white line-clamp-2">
                                                                {pos.marketTitle || pos.marketId?.slice(0, 20) + "..."}
                                                            </h3>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={cn(
                                                                "text-sm font-bold font-mono",
                                                                isUp ? "text-green-400" : "text-red-400"
                                                            )}>
                                                                {isUp ? "+" : ""}${pos.unrealizedPnL.toFixed(2)}
                                                            </p>
                                                            <p className={cn(
                                                                "text-xs font-mono",
                                                                isUp ? "text-green-500/70" : "text-red-500/70"
                                                            )}>
                                                                {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Position Details */}
                                                    <div className="flex items-center gap-3 text-xs">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded font-bold",
                                                            pos.direction === "YES"
                                                                ? "bg-green-500/20 text-green-400"
                                                                : "bg-red-500/20 text-red-400"
                                                        )}>
                                                            {pos.direction}
                                                        </span>
                                                        <span className="text-zinc-500">
                                                            {pos.shares.toFixed(2)} shares
                                                        </span>
                                                        <span className="text-zinc-500">
                                                            @ {Math.round(pos.avgPrice * 100)}¢
                                                        </span>
                                                        <span className="text-zinc-400">
                                                            → {Math.round(pos.currentPrice * 100)}¢
                                                        </span>
                                                    </div>

                                                    {/* P&L Bar */}
                                                    <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(Math.abs(pnlPercent), 100)}%` }}
                                                            className={cn(
                                                                "h-full rounded-full",
                                                                isUp ? "bg-green-500" : "bg-red-500"
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </>,
                document.body
            )}
        </>
    );
}
