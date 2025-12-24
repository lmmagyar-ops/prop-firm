"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function PayoutForecast() {
    // Payout forecast data
    const data = [
        { week: "W1", actual: 12000, forecast: null },
        { week: "W2", actual: 15000, forecast: null },
        { week: "W3", actual: 18000, forecast: null },
        { week: "W4", actual: 22000, forecast: null },
        { week: "W5", actual: null, forecast: 26000 },
        { week: "W6", actual: null, forecast: 30000 },
        { week: "W7", actual: null, forecast: 34000 },
        { week: "W8", actual: null, forecast: 38000 },
    ];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const value = data.actual || data.forecast;
            const isActual = data.actual !== null;

            return (
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl">
                    <p className="text-xs text-zinc-400 mb-1">{data.week}</p>
                    <p className="text-lg font-bold text-white">
                        ${value.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500">
                        {isActual ? "Actual" : "Forecast"}
                    </p>
                </div>
            );
        }
        return null;
    };

    const totalForecast = data.filter(d => d.forecast).reduce((sum, d) => sum + (d.forecast || 0), 0);

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-medium text-zinc-200">Payout Forecast</CardTitle>
                        <CardDescription className="text-zinc-500">Projected payouts for next 4 weeks</CardDescription>
                    </div>
                    <div>
                        <StatusBadge status="Reserve: $128k" variant="warning" />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis
                                dataKey="week"
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                                tickFormatter={(value) => `$${value / 1000}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine
                                x="W4"
                                stroke="#71717a"
                                strokeDasharray="3 3"
                                label={{ value: "Today", position: "top", fill: "#71717a", fontSize: 10 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="actual"
                                stroke="#22c55e"
                                strokeWidth={3}
                                dot={{ fill: "#22c55e", r: 4 }}
                                activeDot={{ r: 6 }}
                                connectNulls={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="forecast"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                dot={{ fill: "#3b82f6", r: 4 }}
                                activeDot={{ r: 6 }}
                                connectNulls={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Summary Stats */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="p-3 bg-zinc-800/30 border border-white/5 rounded-lg">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider">Last Week</div>
                        <div className="text-lg font-bold text-white">$22k</div>
                    </div>
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="text-xs text-blue-400/70 uppercase tracking-wider">4-Week Forecast</div>
                        <div className="text-lg font-bold text-blue-400">${(totalForecast / 1000).toFixed(0)}k</div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <div className="text-xs text-emerald-400/70 uppercase tracking-wider flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Growth
                        </div>
                        <div className="text-lg font-bold text-emerald-400">+73%</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
