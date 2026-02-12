"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Briefcase, X, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [closingId, setClosingId] = useState<string | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [summary, setSummary] = useState<AccountSummary>({ equity: 0, cash: 0, positionValue: 0 });

    // Navigate to trade page with market ID
    const handleNavigateToMarket = (marketId: string) => {
        setIsOpen(false);
        router.push(`/dashboard/trade?market=${marketId}`);
    };

    // Close position — same pattern as OpenPositions.tsx
    const handleClosePosition = async (e: React.MouseEvent, positionId: string) => {
        e.stopPropagation(); // Don't navigate to market
        setClosingId(positionId);
        try {
            const response = await fetch('/api/trade/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ positionId, idempotencyKey: crypto.randomUUID() }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to close position');
            }
            const result = await response.json();
            const pnl = result.pnl || 0;
            const pnlText = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
            if (pnl >= 0) {
                toast.success(`Position closed: ${pnlText} profit`);
            } else {
                toast.error(`Position closed: ${pnlText} loss`);
            }
            setPositions(prev => prev.filter(p => p.id !== positionId));
            window.dispatchEvent(new Event('balance-updated'));
            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to close position';
            toast.error(message);
        } finally {
            setClosingId(null);
        }
    };

    // Extract fetch logic for manual refresh
    const fetchPositions = useCallback(async () => {
        try {
            const [positionsRes, balanceRes] = await Promise.all([
                fetch("/api/trade/positions"),
                fetch("/api/user/balance")
            ]);

            if (positionsRes.ok) {
                const data = await positionsRes.json();
                setPositions(data.positions || []);

                if (balanceRes.ok) {
                    const balanceData = await balanceRes.json();
                    setSummary({
                        cash: balanceData.balance ?? 0,
                        positionValue: balanceData.positionValue ?? 0,
                        equity: balanceData.equity ?? 0,
                    });
                }
            }
        } catch (e) {
            console.error("Failed to fetch positions", e);
        }
    }, []);

    // Manual refresh handler with loading state
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchPositions();
        setIsRefreshing(false);
    }, [fetchPositions]);

    useEffect(() => {
        fetchPositions();

        // Refresh on balance-updated event (after trades)
        const handleBalanceUpdate = () => fetchPositions();
        window.addEventListener('balance-updated', handleBalanceUpdate);

        // Background polling at reduced frequency (30s)
        const interval = setInterval(fetchPositions, 30000);

        return () => {
            clearInterval(interval);
            window.removeEventListener('balance-updated', handleBalanceUpdate);
        };
    }, [fetchPositions]);

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
                className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white transition-colors relative shrink-0"
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
                            className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-primary text-[10px] font-bold text-white rounded-full ring-2 ring-zinc-900"
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
                                    <Briefcase className="w-5 h-5 text-primary" />
                                    <h2 className="text-lg font-bold text-white">Portfolio</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleRefresh}
                                        disabled={isRefreshing}
                                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                                        title="Refresh positions"
                                    >
                                        <RefreshCw className={cn(
                                            "w-4 h-4 text-zinc-400",
                                            isRefreshing && "animate-spin"
                                        )} />
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-zinc-400" />
                                    </button>
                                </div>
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
                                    {totalPnL >= 0 ? "+$" : "-$"}{Math.abs(totalPnL).toFixed(2)}
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

                                            const entryCost = pos.shares * pos.avgPrice;
                                            const pnlPercent = entryCost > 0
                                                ? (pos.unrealizedPnL / entryCost) * 100
                                                : 0;

                                            const isUp = pos.unrealizedPnL >= 0;

                                            return (
                                                <div
                                                    key={pos.id}
                                                    className="p-4 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                                                    onClick={() => handleNavigateToMarket(pos.marketId)}
                                                >
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
                                                                {isUp ? "+$" : "-$"}{Math.abs(pos.unrealizedPnL).toFixed(2)}
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

                                                    {/* Close Position Button */}
                                                    <button
                                                        onClick={(e) => handleClosePosition(e, pos.id)}
                                                        disabled={closingId === pos.id}
                                                        className={cn(
                                                            "mt-3 w-full py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                                                            "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
                                                            closingId === pos.id && "opacity-50 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {closingId === pos.id ? (
                                                            <><Loader2 className="w-3 h-3 animate-spin" /> Closing...</>
                                                        ) : (
                                                            `Close ${pos.direction} Position`
                                                        )}
                                                    </button>
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
                                    Hide Portfolio
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
