"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, TrendingUp, TrendingDown, Users } from "lucide-react";

const influencers = [
    { rank: 1, name: "AlphaGod", code: "ALPHA", traffic: 15420, conversion: 3.2, whales: 45, revenue: 152000, trend: "up" },
    { rank: 2, name: "CryptoWhale", code: "WHALE", traffic: 6200, conversion: 8.5, whales: 78, revenue: 145000, trend: "up" },
    { rank: 3, name: "PropFirmKing", code: "KING", traffic: 22000, conversion: 1.1, whales: 12, revenue: 45000, trend: "down" },
    { rank: 4, name: "DegenPlays", code: "DEGEN", traffic: 54000, conversion: 0.5, whales: 2, revenue: -1200, trend: "down" }, // Negative revenue (toxic)
    { rank: 5, name: "PolymarketBets", code: "BETS", traffic: 4500, conversion: 4.2, whales: 15, revenue: 38000, trend: "neutral" },
];

export function InfluencerLeaderboard() {
    return (
        <Card className="bg-zinc-900 border-zinc-800 shadow-lg h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500" /> Influencer ROI
                        </CardTitle>
                        <CardDescription>
                            Net Revenue Contribution by Affiliate Source.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-zinc-900/50">
                        <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                            <TableHead className="w-[80px] text-zinc-400">Rank</TableHead>
                            <TableHead className="text-zinc-400">Influencer</TableHead>
                            <TableHead className="text-right text-zinc-400">Traffic</TableHead>
                            <TableHead className="text-right text-zinc-400">Conv %</TableHead>
                            <TableHead className="text-right text-zinc-400">Whales</TableHead>
                            <TableHead className="text-right text-zinc-400">Net Rev</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {influencers.map((inf) => (
                            <TableRow key={inf.code} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {inf.rank === 1 && <span className="text-xl">🥇</span>}
                                        {inf.rank === 2 && <span className="text-xl">🥈</span>}
                                        {inf.rank === 3 && <span className="text-xl">🥉</span>}
                                        {inf.rank > 3 && <span className="text-zinc-500 w-6 text-center">#{inf.rank}</span>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-zinc-200 font-semibold">{inf.name}</span>
                                        <span className="text-[10px] text-zinc-500 font-mono">CODE: {inf.code}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-zinc-400">
                                    {inf.traffic.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-mono text-zinc-400">
                                    {inf.conversion}%
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-mono">
                                        {inf.whales}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                    <span className={inf.revenue >= 0 ? "text-green-400" : "text-red-400"}>
                                        ${inf.revenue.toLocaleString()}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
