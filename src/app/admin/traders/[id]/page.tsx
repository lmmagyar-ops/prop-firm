"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Target, Clock, Wallet, Download } from "lucide-react";
import { ChallengeTimeline } from "@/components/admin/ChallengeTimeline";
import { toast } from "sonner";
import { format } from "date-fns";
import { generateTraderReport } from "@/lib/generate-report";

interface TraderDetailData {
    challenge: {
        userName: string;
        email: string;
        status: string;
        phase: string;
        startDate: string;
        currentBalance: string | number;
        rulesConfig?: Record<string, string | number>;
    };
    stats: { totalTrades: number; winRate: number | null };
    timeline: Array<{ balance: number; date: string }>;
    trades: Array<{
        id: string;
        createdAt: string;
        type: string;
        side: string;
        marketId: string;
        pnl: string | number;
    }>;
}

export default function TraderDeepDivePage() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState<TraderDetailData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/admin/traders/${id}`);
                if (!res.ok) throw new Error("Failed to load trader data");
                const json = await res.json();
                setData(json);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load trader profile");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-black text-zinc-500"><Loader2 className="animate-spin mr-2" /> Loading profile...</div>;
    if (!data) return <div className="flex h-screen items-center justify-center bg-black text-white">Trader not found</div>;

    const { challenge, stats, trades, timeline } = data;
    const rules = challenge.rulesConfig || {};
    const startingBalance = Number(rules.startingBalance || 10000);
    const pnl = Number(challenge.currentBalance) - startingBalance;

    return (
        <div className="min-h-screen bg-black text-white p-8 space-y-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{challenge.userName}</h1>
                        <p className="text-zinc-400 flex items-center gap-2">
                            {challenge.email}
                            <span className="text-zinc-600">•</span>
                            Started {format(new Date(challenge.startDate), 'MMM d, yyyy')}
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        <Badge variant={challenge.status === 'passed' ? 'default' : challenge.status === 'failed' ? 'destructive' : 'outline'} className="text-base px-3 py-1 capitalize">
                            {challenge.status}
                        </Badge>
                        <Badge variant="secondary" className="text-base px-3 py-1">
                            Phase {challenge.phase}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => generateTraderReport(data)}>
                            <Download className="h-4 w-4 mr-2" />
                            Report
                        </Button>
                    </div>
                </div>

                {/* Top Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                            <Wallet className="h-4 w-4 text-zinc-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${Number(challenge.currentBalance).toFixed(2)}</div>
                            <p className={`text-xs ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({((pnl / startingBalance) * 100).toFixed(2)}%)
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                            <Target className="h-4 w-4 text-zinc-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.winRate !== null ? `${stats.winRate.toFixed(1)}%` : '—'}</div>
                            <p className="text-xs text-zinc-400">
                                {stats.totalTrades} Total Trades
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Equity Peak</CardTitle>
                            <TrendingUp className="h-4 w-4 text-zinc-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${Math.max(...timeline.map((t) => t.balance)).toFixed(2)}</div>
                            <p className="text-xs text-zinc-400">High Water Mark</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Last Active</CardTitle>
                            <Clock className="h-4 w-4 text-zinc-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {trades.length > 0
                                    ? format(new Date(trades[0].createdAt), 'MMM d')
                                    : 'Never'}
                            </div>
                            <p className="text-xs text-zinc-400">
                                {trades.length > 0 ? format(new Date(trades[0].createdAt), 'h:mm a') : '-'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Timeline and History */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chart Section */}
                    <div className="lg:col-span-3">
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle>Equity Curve</CardTitle>
                                <CardDescription>Performance over time since challenge start</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChallengeTimeline data={timeline} startingBalance={startingBalance} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Trade History */}
                    <div className="lg:col-span-3">
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle>Trade History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1">
                                    {trades.map((trade) => (
                                        <div key={trade.id} className="grid grid-cols-5 gap-4 p-3 hover:bg-zinc-800/50 rounded text-sm items-center border-b border-zinc-800/50 last:border-0">
                                            <div className="text-zinc-400">
                                                {format(new Date(trade.createdAt), 'MMM d, h:mm a')}
                                            </div>
                                            <div className="col-span-2 truncate font-medium flex items-center gap-2">
                                                <Badge variant={trade.type === 'BUY' ? 'outline' : 'destructive'} className="text-[10px] h-5 px-1.5">
                                                    {trade.type}
                                                </Badge>
                                                <span className={trade.side === 'YES' ? 'text-green-500' : 'text-red-500'}>
                                                    {trade.side}
                                                </span>
                                                <span className="text-zinc-500 text-xs truncate max-w-[100px]">{trade.marketId}</span>
                                            </div>
                                            <div>
                                                {/* Empty col for alignment */}
                                            </div>
                                            <div className={`text-right font-mono ${Number(trade.pnl) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {Number(trade.pnl) >= 0 ? '+' : ''}{Number(trade.pnl).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                    {trades.length === 0 && <div className="text-center py-8 text-zinc-500">No trades yet.</div>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

            </div>
        </div>
    );
}
