"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, XCircle, AlertCircle, TrendingUp, Skull, User } from "lucide-react";

export interface Trader {
    id: string;
    name: string;
    pnl: number;
    winRate: number;
    style: "SNIPER" | "GAMBLER" | "AVERAGE";
    riskAction: "A-BOOK" | "B-BOOK" | "WAIT";
}

const traders: Trader[] = [
    { id: "t1", name: "Alice V.", pnl: 4500, winRate: 85, style: "SNIPER", riskAction: "A-BOOK" },
    { id: "t2", name: "Bob 'Yolo'", pnl: -1200, winRate: 45, style: "GAMBLER", riskAction: "B-BOOK" },
    { id: "t3", name: "Charlie D.", pnl: 200, winRate: 52, style: "AVERAGE", riskAction: "WAIT" },
    { id: "t4", name: "DegenDave", pnl: -5000, winRate: 30, style: "GAMBLER", riskAction: "B-BOOK" },
    { id: "t5", name: "ProQuant", pnl: 12000, winRate: 78, style: "SNIPER", riskAction: "A-BOOK" },
    { id: "t6", name: "Newbie123", pnl: -50, winRate: 50, style: "AVERAGE", riskAction: "WAIT" },
    { id: "t7", name: "WhaleWatcher", pnl: 25000, winRate: 92, style: "SNIPER", riskAction: "A-BOOK" },
    { id: "t8", name: "RektKing", pnl: -15000, winRate: 15, style: "GAMBLER", riskAction: "B-BOOK" },
];

interface TraderListProps {
    onSelect: (trader: Trader) => void;
    selectedId: string | null;
}

export function TraderList({ onSelect, selectedId }: TraderListProps) {
    return (
        <div className="rounded-xl border border-white/5 bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-2xl h-full flex flex-col">
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <h3 className="font-medium text-zinc-200">Active Traders</h3>
                <span className="text-xs text-zinc-500 font-mono">{traders.length} Online</span>
            </div>
            <ScrollArea className="flex-1">
                <Table>
                    <TableHeader className="bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-xl">
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-zinc-500 font-medium h-10">Trader</TableHead>
                            <TableHead className="text-zinc-500 font-medium text-right h-10">PnL</TableHead>
                            <TableHead className="text-zinc-500 font-medium text-center h-10">Style</TableHead>
                            <TableHead className="text-zinc-500 font-medium text-right h-10">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {traders.map((trader) => (
                            <TableRow
                                key={trader.id}
                                className={`cursor-pointer transition-all duration-200 border-white/5 ${selectedId === trader.id
                                        ? "bg-indigo-500/10 hover:bg-indigo-500/20 border-l-2 border-l-indigo-500"
                                        : "hover:bg-white/5 border-l-2 border-l-transparent"
                                    }`}
                                onClick={() => onSelect(trader)}
                            >
                                <TableCell className="py-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${trader.style === 'SNIPER' ? 'bg-green-500/20 text-green-400' :
                                                trader.style === 'GAMBLER' ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'
                                            }`}>
                                            {trader.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-zinc-200">{trader.name}</div>
                                            <div className="text-[10px] text-zinc-500 font-mono">ID: {trader.id}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className={`text-right font-mono ${trader.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    ${trader.pnl.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        {trader.style === "SNIPER" && (
                                            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] gap-1 px-2">
                                                <TrendingUp className="h-3 w-3" /> SNIPER
                                            </Badge>
                                        )}
                                        {trader.style === "GAMBLER" && (
                                            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] gap-1 px-2">
                                                <Skull className="h-3 w-3" /> GAMBLER
                                            </Badge>
                                        )}
                                        {trader.style === "AVERAGE" && (
                                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1 px-2">
                                                <User className="h-3 w-3" /> AVERAGE
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {trader.riskAction === "A-BOOK" && <span className="text-[10px] font-bold text-green-500 flex items-center gap-1 bg-green-500/5 px-2 py-1 rounded border border-green-500/10"><Copy className="h-3 w-3" /> COPY</span>}
                                        {trader.riskAction === "B-BOOK" && <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-500/5 px-2 py-1 rounded border border-red-500/10"><XCircle className="h-3 w-3" /> FADE</span>}
                                        {trader.riskAction === "WAIT" && <span className="text-[10px] text-zinc-500 flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700/50"><AlertCircle className="h-3 w-3" /> WAIT</span>}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
}
