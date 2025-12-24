"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Percent, TrendingUp } from "lucide-react";

const data = [
    { date: "Dec 1", revenue: 12000, discount: 0 },
    { date: "Dec 2", revenue: 13500, discount: 0 },
    { date: "Dec 3", revenue: 11000, discount: 0 },
    { date: "Dec 4", revenue: 28000, discount: 20 }, // Promo starts
    { date: "Dec 5", revenue: 32000, discount: 20 },
    { date: "Dec 6", revenue: 45000, discount: 30 }, // Deeper discount
    { date: "Dec 7", revenue: 48000, discount: 30 },
    { date: "Dec 8", revenue: 18000, discount: 50 }, // Too deep? Revenue drops (saturation)
    { date: "Dec 9", revenue: 15000, discount: 50 },
];

export function DiscountElasticity() {
    return (
        <Card className="bg-zinc-900 border-zinc-800 shadow-lg col-span-2">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Percent className="h-5 w-5 text-purple-500" /> Discount War Room
                        </CardTitle>
                        <CardDescription>
                            Price Elasticity: Revenue Volume vs. Discount Depth.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" stroke="#52525b" fontSize={12} />
                            <YAxis yAxisId="left" stroke="#22c55e" fontSize={12} tickFormatter={(val) => `$${val / 1000}k`} />
                            <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={12} tickFormatter={(val) => `${val}%`} />
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                            <Legend />
                            <Area yAxisId="left" type="monotone" dataKey="revenue" fill="url(#revenueGradient)" stroke="#22c55e" name="Revenue ($)" />
                            <Line yAxisId="right" type="step" dataKey="discount" stroke="#a855f7" strokeWidth={2} name="Discount %" dot={{ fill: '#a855f7' }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
