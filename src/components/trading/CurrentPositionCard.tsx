"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, DollarSign, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CurrentPositionCardProps {
    position: {
        id: string;
        shares: number;
        avgPrice: number;
        invested: number;
        currentPnl: number;
        roi: number;
        side: "YES" | "NO";
    };
    currentPrice: number;
    onClose?: () => void;
}

export function CurrentPositionCard({ position, currentPrice, onClose }: CurrentPositionCardProps) {
    // Calculate live P&L based on current market price
    const liveCurrentValue = position.shares * currentPrice;
    const livePnl = liveCurrentValue - position.invested;
    const liveRoi = position.invested > 0 ? (livePnl / position.invested) * 100 : 0;
    const isProfitable = livePnl >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "w-full rounded-lg overflow-hidden mb-6 relative group border transition-all",
                "bg-zinc-900/40 border-white/5 hover:border-white/10"
            )}
        >
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                isProfitable
                    ? "bg-gradient-to-r from-emerald-500/5 to-transparent"
                    : "bg-gradient-to-r from-red-500/5 to-transparent"
            )} />

            <div className="p-4 relative z-10">
                {/* Header Row */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-black tracking-wider border",
                            position.side === "YES"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                            {position.side}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                            {position.shares.toFixed(2)} Shares
                        </span>
                    </div>

                    {/* Sell Button - Shown on hover or always visible? Let's make it always visible but subtle */}
                    <div className="flex items-center gap-2">
                        {/* <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Open</span> */}
                    </div>
                </div>

                {/* Main P&L Display */}
                <div className="flex items-baseline justify-between mb-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Unrealized P&L</span>
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-2xl font-mono font-bold tracking-tight flex items-center gap-1",
                                isProfitable ? "text-emerald-500" : "text-red-500"
                            )}>
                                {isProfitable ? "+" : "-"}${Math.abs(livePnl).toFixed(2)}
                            </span>
                            <span className={cn(
                                "text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5",
                                isProfitable ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-400"
                            )}>
                                {isProfitable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(liveRoi).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats Footer */}
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-3">
                    <div>
                        <div className="text-zinc-500 text-[10px] uppercase font-bold">Avg Entry</div>
                        <div className="text-zinc-300 font-mono">{(position.avgPrice * 100).toFixed(1)}¢</div>
                    </div>
                    <div className="text-right">
                        <div className="text-zinc-500 text-[10px] uppercase font-bold">Market Value</div>
                        <div className="text-zinc-300 font-mono">${(position.shares * currentPrice).toFixed(2)}</div>
                    </div>
                </div>

                {onClose && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="w-full mt-3 h-8 bg-white/5 hover:bg-white/10 text-xs text-zinc-400 hover:text-white border border-white/5 hover:border-white/10"
                    >
                        Close Position
                    </Button>
                )}
            </div>
        </motion.div>
    );
}
