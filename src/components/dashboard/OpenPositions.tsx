"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface OpenPositionsProps {
    positions: Array<{
        id: string;
        marketTitle: string;
        direction: 'YES' | 'NO';
        entryPrice: number;
        currentPrice: number;
        shares: number;
        unrealizedPnL: number;
    }>;
    onClosePosition: (positionId: string) => void;
}

export function OpenPositions({ positions, onClosePosition }: OpenPositionsProps) {
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
                                        onClick={() => onClosePosition(pos.id)}
                                        className="h-7 w-7 p-0 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                                    >
                                        <X className="w-4 h-4" />
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
