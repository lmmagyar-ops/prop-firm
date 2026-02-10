"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { TrendingUp, DollarSign } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function RevenueWaterfall() {
    // Waterfall data showing revenue composition
    const data = [
        { name: "Evaluation Fees", value: 8500, cumulative: 8500, fill: "#22c55e" },
        { name: "Reset Fees", value: 3200, cumulative: 11700, fill: "#3b82f6" },
        { name: "Subscription", value: 1800, cumulative: 13500, fill: "#a78bfa" },
        { name: "Total Revenue", value: 13500, cumulative: 13500, fill: "#eab308", isTotal: true },
    ];

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload?: Record<string, unknown>; value?: number }> }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as Record<string, number | string | boolean | null> | undefined;
            if (!data) return null;
            return (
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl">
                    <p className="text-sm font-medium text-white">{String(data.name)}</p>
                    <p className="text-lg font-bold text-emerald-400">
                        ${Number(data.value).toLocaleString()}
                    </p>
                    {!data.isTotal && (
                        <p className="text-xs text-zinc-500">
                            Cumulative: ${Number(data.cumulative).toLocaleString()}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-emerald-400" />
                            Revenue Composition
                        </CardTitle>
                        <CardDescription className="text-zinc-500">Waterfall breakdown by source</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status="+18% MoM" variant="success" />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis
                                dataKey="name"
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
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                                <LabelList
                                    dataKey="value"
                                    position="top"
                                    formatter={(value: number | string | boolean | null | undefined) => `$${Number(value ?? 0).toLocaleString()}`}
                                    style={{ fill: '#fff', fontSize: 12, fontWeight: 600 }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 justify-center">
                    {data.filter(d => !d.isTotal).map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                            <div
                                className="h-3 w-3 rounded-sm"
                                style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-xs text-zinc-400">{item.name}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
