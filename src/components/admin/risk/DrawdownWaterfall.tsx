"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { TrendingDown } from "lucide-react";

export function DrawdownWaterfall() {
    // Drawdown waterfall showing cumulative losses
    const data = [
        { name: "Starting Balance", value: 100000, cumulative: 100000, isStart: true },
        { name: "Week 1 Loss", value: -3500, cumulative: 96500 },
        { name: "Week 2 Loss", value: -2200, cumulative: 94300 },
        { name: "Week 3 Recovery", value: 1800, cumulative: 96100 },
        { name: "Week 4 Loss", value: -4100, cumulative: 92000 },
        { name: "Current Balance", value: 92000, cumulative: 92000, isEnd: true },
    ];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl">
                    <p className="text-sm font-medium text-white">{data.name}</p>
                    {!data.isStart && !data.isEnd && (
                        <p className={`text-lg font-bold ${data.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {data.value >= 0 ? '+' : ''}${data.value.toLocaleString()}
                        </p>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">
                        Balance: ${data.cumulative.toLocaleString()}
                    </p>
                </div>
            );
        }
        return null;
    };

    const getColor = (item: any) => {
        if (item.isStart || item.isEnd) return "#3b82f6"; // Blue
        return item.value >= 0 ? "#22c55e" : "#ef4444"; // Green or Red
    };

    const totalDrawdown = 100000 - 92000;
    const drawdownPercent = ((totalDrawdown / 100000) * 100).toFixed(1);

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-red-400" />
                            Drawdown Waterfall
                        </CardTitle>
                        <CardDescription className="text-zinc-500">Weekly P&L breakdown</CardDescription>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-red-400">-{drawdownPercent}%</div>
                        <div className="text-xs text-zinc-500">Total Drawdown</div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis
                                dataKey="name"
                                stroke="#71717a"
                                fontSize={10}
                                tickLine={false}
                                angle={-15}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                                tickFormatter={(value) => `$${value / 1000}k`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                            <ReferenceLine y={100000} stroke="#71717a" strokeDasharray="3 3" />
                            <Bar dataKey="cumulative" radius={[8, 8, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getColor(entry)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Summary Stats */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="text-xs text-blue-400/70 uppercase tracking-wider">Starting</div>
                        <div className="text-lg font-bold text-blue-400">$100k</div>
                    </div>
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="text-xs text-red-400/70 uppercase tracking-wider">Total Loss</div>
                        <div className="text-lg font-bold text-red-400">-$8k</div>
                    </div>
                    <div className="p-3 bg-zinc-800/30 border border-white/5 rounded-lg">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider">Current</div>
                        <div className="text-lg font-bold text-white">$92k</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
