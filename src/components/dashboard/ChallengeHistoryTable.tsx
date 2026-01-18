"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ChallengeHistoryTableProps {
    challenges: Array<{
        id: string;
        accountNumber: string;
        challengeType: string;
        phase: string;
        status: 'active' | 'passed' | 'failed';
        finalPnL: number | null;
        startedAt: Date;
        completedAt?: Date | null;
        platform?: "polymarket" | "kalshi";
    }>;
}

// Platform icon helper
const getPlatformIcon = (platform?: string) => {
    if (platform === "kalshi") return "🇺🇸";
    return "🌐";
};

export function ChallengeHistoryTable({ challenges }: ChallengeHistoryTableProps) {
    const [filter, setFilter] = useState<'all' | 'active' | 'passed' | 'failed'>('all');

    const filteredChallenges = challenges.filter(c => {
        if (filter === 'all') return true;
        return c.status === filter;
    });

    return (
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                    Challenge History
                </h3>

                {/* Status Filters */}
                <div className="flex gap-2">
                    {['all', 'active', 'passed', 'failed'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-3 py-1 text-xs rounded uppercase font-medium transition-colors ${filter === f
                                ? f === 'passed' ? 'bg-green-500 text-white'
                                    : f === 'failed' ? 'bg-red-500 text-white'
                                        : 'bg-blue-500 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-xs text-zinc-500 uppercase">Date</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase">Account #</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase">Platform</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase">Type</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase">Phase</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase">Status</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase text-right">Final P&L</TableHead>
                            <TableHead className="text-xs text-zinc-500 uppercase text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredChallenges.map(challenge => (
                            <TableRow key={challenge.id} className="border-white/5 hover:bg-white/5">
                                <TableCell className="text-sm text-zinc-400">
                                    {new Date(challenge.startedAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-sm font-mono text-white">
                                    {challenge.accountNumber}
                                </TableCell>
                                <TableCell className="text-sm">
                                    <span className="flex items-center gap-1.5">
                                        <span>{getPlatformIcon(challenge.platform)}</span>
                                        <span className="text-zinc-400 capitalize">{challenge.platform || "polymarket"}</span>
                                    </span>
                                </TableCell>
                                <TableCell className="text-sm text-zinc-300">
                                    {challenge.challengeType}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-xs capitalize border-white/10 text-zinc-400">
                                        {challenge.phase}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        className={`text-xs capitalize ${challenge.status === 'passed' ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' :
                                            challenge.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' :
                                                'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20'
                                            }`}
                                    >
                                        {challenge.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-mono text-sm ${challenge.finalPnL !== null && challenge.finalPnL >= 0 ? 'text-green-500' : challenge.finalPnL !== null ? 'text-red-500' : 'text-zinc-500'
                                    }`}>
                                    {challenge.finalPnL !== null
                                        ? `${challenge.finalPnL >= 0 ? '+' : ''}$${challenge.finalPnL.toFixed(2)}`
                                        : '—'
                                    }
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 h-7"
                                    >
                                        View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {filteredChallenges.length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                    No evaluations found
                </div>
            )}
        </div>
    );
}
