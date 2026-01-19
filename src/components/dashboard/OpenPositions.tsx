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
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

    // Sync with parent when initialPositions change
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
                body: JSON.stringify({ positionId }),
            });

            console.log("[ClosePosition] Response status:", response.status);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to close position');
            }

            const result = await response.json();
            toast.success(`Position closed for $${result.proceeds?.toFixed(2) || '0.00'}`);

            // Remove from local state immediately for instant UI feedback
            setPositions(prev => prev.filter(p => p.id !== positionId));

            // Force server refresh to ensure data consistency
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
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                    Open Positions
                </h3>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-xs text-zinc-500 uppercase">Market</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase text-center">Side</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase text-right">Size</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase text-right">Entry</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase text-right">Current</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase text-right">P&L</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {positions.map((pos) => (
                            <TableRow key={pos.id} className="border-white/5 hover:bg-white/5 h-12">
                                <TableCell className="text-sm font-medium text-white max-w-[200px] truncate">
                                    {pos.marketTitle}
                                </TableCell>
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
                                <TableCell className="text-right font-mono text-sm text-zinc-300">
                                    {pos.shares}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-zinc-400">
                                    {(pos.entryPrice * 100).toFixed(2)}¢
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-white">
                                    {(pos.currentPrice * 100).toFixed(2)}¢
                                </TableCell>
                                <TableCell className={`text-right font-mono text-sm font-bold ${pos.unrealizedPnL >= 0 ? "text-green-500" : "text-red-500"
                                    }`}>
                                    {pos.unrealizedPnL >= 0 ? "+" : ""}${pos.unrealizedPnL.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleClosePosition(pos.id)}
                                        disabled={closingId === pos.id}
                                        className="h-7 w-7 p-0 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                                    >
                                        {closingId === pos.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <X className="w-4 h-4" />
                                        )}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
