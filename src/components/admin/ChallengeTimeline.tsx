"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { format } from "date-fns";

interface TimelinePoint {
    date: string;
    balance: number;
}

export function ChallengeTimeline({ data, startingBalance }: { data: TimelinePoint[], startingBalance: number }) {
    if (!data || data.length === 0) return <div className="text-zinc-500 text-center py-10">No timeline data available</div>;

    const minBalance = Math.min(...data.map(d => d.balance), startingBalance) * 0.95;
    const maxBalance = Math.max(...data.map(d => d.balance), startingBalance) * 1.05;

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#71717a"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(str) => format(new Date(str), 'MMM d')}
                    />
                    <YAxis
                        domain={[minBalance, maxBalance]}
                        stroke="#71717a"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, "Equity"]}
                        labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                    />
                    <ReferenceLine y={startingBalance} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Start", fill: "#ef4444", fontSize: 10, position: 'insideRight' }} />
                    <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
