"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from "recharts";
import { Percent, Trophy, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DiscountPerformance {
    date: string;
    revenue: number;
    discountRate: number;
    redemptions: number;
}

interface DiscountLeaderboardItem {
    code: string;
    name: string;
    type: string;
    value: number;
    redemptions: number;
    revenue: number;
    savings: number;
    active: boolean;
}

interface DiscountElasticityProps {
    data?: DiscountPerformance[];
    leaderboard?: DiscountLeaderboardItem[];
}

// Fallback mock data
const mockData = [
    { date: "Dec 1", revenue: 0, discountRate: 0, redemptions: 0 },
];

export function DiscountElasticity({ data, leaderboard }: DiscountElasticityProps) {
    const chartData = data?.length ? data : mockData;
    const hasData = data && data.some(d => d.revenue > 0 || d.redemptions > 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart - 2 columns */}
            <Card className="bg-zinc-900 border-zinc-800 shadow-lg lg:col-span-2">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Percent className="h-5 w-5 text-purple-500" /> Discount War Room
                            </CardTitle>
                            <CardDescription>
                                Daily revenue vs. discount impact (last 14 days)
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!hasData ? (
                        <div className="h-[350px] flex items-center justify-center text-zinc-500">
                            <div className="text-center">
                                <Percent className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>No discount activity yet</p>
                                <p className="text-xs text-zinc-600">Create and share discount codes to see performance</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <defs>
                                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" stroke="#52525b" fontSize={12} />
                                    <YAxis yAxisId="left" stroke="#22c55e" fontSize={12} tickFormatter={(val) => `$${val}`} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={12} tickFormatter={(val) => `${val}%`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }}
                                    />
                                    <Legend />
                                    <Area yAxisId="left" type="monotone" dataKey="revenue" fill="url(#revenueGradient)" stroke="#22c55e" name="Revenue" />
                                    <Line yAxisId="right" type="step" dataKey="discountRate" stroke="#a855f7" strokeWidth={2} name="Discount %" dot={{ fill: '#a855f7' }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Leaderboard - 1 column */}
            <Card className="bg-zinc-900 border-zinc-800 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Trophy className="h-5 w-5 text-amber-500" /> Top Discount Codes
                    </CardTitle>
                    <CardDescription>Ranked by redemptions</CardDescription>
                </CardHeader>
                <CardContent>
                    {!leaderboard?.length ? (
                        <div className="text-center py-8 text-zinc-500">
                            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No discount codes yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {leaderboard.slice(0, 5).map((item, idx) => (
                                <div
                                    key={item.code}
                                    className={`p-3 rounded-lg border transition-all ${idx === 0
                                        ? 'bg-amber-500/10 border-amber-500/30'
                                        : 'bg-zinc-800/50 border-zinc-700/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold ${idx === 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                                                #{idx + 1}
                                            </span>
                                            <code className="font-mono text-sm font-bold text-white">{item.code}</code>
                                        </div>
                                        <Badge variant={item.active ? "default" : "secondary"} className="text-xs">
                                            {item.type === 'percentage' ? `${item.value}%` : `$${item.value}`}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <span className="text-zinc-500">Uses</span>
                                            <div className="text-white font-mono">{item.redemptions}</div>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500">Revenue</span>
                                            <div className="text-emerald-400 font-mono">${item.revenue}</div>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500">Saved</span>
                                            <div className="text-purple-400 font-mono">${item.savings}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
