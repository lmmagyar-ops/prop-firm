"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import SpotlightCard from "@/components/reactbits/SpotlightCard";

interface OpenPositionsProps {
    positions: Array<{
        id: string;
        marketId?: string;
        marketTitle: string;
        direction: 'YES' | 'NO';
        entryPrice: number;
        currentPrice: number;
        shares: number;
        unrealizedPnL: number;
    }>;
}

export function OpenPositions({ positions: initialPositions }: OpenPositionsProps) {
    const router = useRouter();
    const [positions, setPositions] = useState(initialPositions);
    const [closingId, setClosingId] = useState<string | null>(null);

    useEffect(() => {
        setPositions(initialPositions);
    }, [initialPositions]);

    const handleClosePosition = async (positionId: string) => {
        console.log("[ClosePosition] Starting close for:", positionId);
        setClosingId(positionId);
        try {
            const response = await fetch(`/api/trade/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ positionId, idempotencyKey: crypto.randomUUID() }),
            });

            console.log("[ClosePosition] Response status:", response.status);

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
            window.dispatchEvent(new Event("balance-updated"));
            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to close position';
            toast.error(message);
        } finally {
            setClosingId(null);
        }
    };

    if (!positions || positions.length === 0) {
        return (
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-12 text-center">
                <div className="text-zinc-500 mb-4">No active positions</div>
                <div className="text-sm text-zinc-600">Open a position to see it here</div>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={300}>
            <SpotlightCard
                className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden"
                spotlightColor="rgba(0, 255, 178, 0.06)"
                spotlightSize={600}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                        Open Positions
                    </h3>
                </div>

                <div className="overflow-x-auto relative">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-xs text-zinc-500 uppercase">Market</TableHead>
                                <TableHead className="text-xs text-zinc-500 uppercase text-center">Side</TableHead>
                                <TableHead className="text-xs text-zinc-500 uppercase text-right">Shares</TableHead>
                                <TableHead className="text-xs text-zinc-500 uppercase text-right">Entry</TableHead>
                                <TableHead className="text-xs text-zinc-500 uppercase text-right">Current</TableHead>
                                <TableHead className="text-xs text-zinc-500 uppercase text-right">Est. P&L</TableHead>
                                <TableHead className="text-xs text-zinc-500 uppercase text-right sticky right-0 bg-zinc-900/95 backdrop-blur-sm z-10 border-l border-white/5">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {positions.map((pos) => {
                                const cost = pos.shares * pos.entryPrice;
                                const currentValue = pos.shares * pos.currentPrice;
                                const returnPct = cost > 0 ? (pos.unrealizedPnL / cost) * 100 : 0;
                                const isPositive = pos.unrealizedPnL >= 0;

                                return (
                                    <TableRow key={pos.id} className="border-white/5 hover:bg-white/5 h-12">
                                        {/* Market — with tooltip for full title */}
                                        <TableCell className="text-sm font-medium text-white max-w-[200px]">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="truncate block cursor-default">
                                                        {pos.marketTitle}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs">
                                                    <p>{pos.marketTitle}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>

                                        {/* Side */}
                                        <TableCell>
                                            <div className="flex justify-center">
                                                <div className={`
                                                    flex items-center justify-center w-10 h-5 rounded text-[10px] font-black tracking-wider border
                                                    ${pos.direction === "YES"
                                                        ? "bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                                                        : "bg-red-500/20 text-red-500 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]"}
                                                `}>
                                                    {pos.direction}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Shares — consistent 2dp */}
                                        <TableCell className="text-right font-mono text-sm text-zinc-300">
                                            {pos.shares.toFixed(2)}
                                        </TableCell>

                                        {/* Entry */}
                                        <TableCell className="text-right font-mono text-sm text-zinc-400">
                                            {(pos.entryPrice * 100).toFixed(1)}¢
                                        </TableCell>

                                        {/* Current */}
                                        <TableCell className="text-right font-mono text-sm text-white">
                                            {(pos.currentPrice * 100).toFixed(1)}¢
                                        </TableCell>

                                        {/* P&L — combined value + return */}
                                        <TableCell className="text-right">
                                            <div className={`flex items-center justify-end gap-1 font-mono text-sm font-bold`}>
                                                {isPositive ? (
                                                    <TrendingUp className="w-3 h-3 text-green-400 flex-shrink-0" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3 text-red-400 flex-shrink-0" />
                                                )}
                                                <span
                                                    className={isPositive
                                                        ? "bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent"
                                                        : "bg-gradient-to-r from-red-400 to-rose-300 bg-clip-text text-transparent"
                                                    }
                                                >
                                                    {isPositive ? "+$" : "-$"}{Math.abs(pos.unrealizedPnL).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className={`font-mono text-[10px] ${isPositive ? 'text-green-500/60' : 'text-red-500/60'}`}>
                                                    {isPositive ? "+" : ""}{returnPct.toFixed(1)}%
                                                </span>
                                                <span className="font-mono text-[10px] text-zinc-600">•</span>
                                                <span className="font-mono text-[10px] text-zinc-500">${currentValue.toFixed(2)}</span>
                                            </div>
                                        </TableCell>

                                        {/* Sell Button — sticky right so always visible */}
                                        <TableCell className="text-right sticky right-0 bg-zinc-900/95 backdrop-blur-sm z-10 border-l border-white/5">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleClosePosition(pos.id)}
                                                disabled={closingId === pos.id}
                                                className="h-7 px-3 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold"
                                            >
                                                {closingId === pos.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    "Sell"
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </SpotlightCard>
        </TooltipProvider>
    );
}

