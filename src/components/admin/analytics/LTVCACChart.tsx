"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function LTVCACChart() {
    // LTV vs CAC data over time
    const data = [
        { month: "Sep", ltv: 320, cac: 180 },
        { month: "Oct", ltv: 380, cac: 190 },
        { month: "Nov", ltv: 420, cac: 185 },
        { month: "Dec", ltv: 450, cac: 175 },
        { month: "Jan", ltv: 480, cac: 170 },
        { month: "Feb", ltv: 510, cac: 165 },
    ];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl">
                    <p className="text-xs text-zinc-400 mb-2">{payload[0].payload.month}</p>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-emerald-400">LTV:</span>
                            <span className="text-sm font-bold text-emerald-400">
                                ${payload[0].value}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-red-400">CAC:</span>
                            <span className="text-sm font-bold text-red-400">
                                ${payload[1].value}
                            </span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-white/10">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-zinc-400">Ratio:</span>
                                <span className="text-sm font-bold text-white">
                                    {(payload[0].value / payload[1].value).toFixed(2)}x
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const latestLTV = data[data.length - 1].ltv;
    const latestCAC = data[data.length - 1].cac;
    const ratio = (latestLTV / latestCAC).toFixed(2);

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-medium text-zinc-200">LTV / CAC Analysis</CardTitle>
                        <CardDescription className="text-zinc-500">Customer economics over time</CardDescription>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-white">{ratio}x</div>
                        <div className="flex items-center justify-end">
                            <StatusBadge status="Healthy Ratio" variant="success" />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorLTV" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCAC" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis
                                dataKey="month"
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="ltv"
                                stroke="#22c55e"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorLTV)"
                                name="LTV"
                            />
                            <Area
                                type="monotone"
                                dataKey="cac"
                                stroke="#ef4444"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorCAC)"
                                name="CAC"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Key Metrics */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <div className="text-xs text-emerald-400/70 uppercase tracking-wider">Current LTV</div>
                        <div className="text-xl font-bold text-emerald-400">${latestLTV}</div>
                    </div>
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="text-xs text-red-400/70 uppercase tracking-wider">Current CAC</div>
                        <div className="text-xl font-bold text-red-400">${latestCAC}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
