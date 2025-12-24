"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Magnet } from "lucide-react";

const hooks = [
    { market: "Trump Wins 2024", users: 1250, ltvMultiplier: 1.5, category: "Politics" },
    { market: "BTC > 100k", users: 850, ltvMultiplier: 2.1, category: "Crypto" },
    { market: "Fed Cut 50bps", users: 420, ltvMultiplier: 1.2, category: "Finance" },
    { market: "SpaceX Launch", users: 150, ltvMultiplier: 0.8, category: "Tech" },
    { market: "Taylor Swift Breakup", users: 80, ltvMultiplier: 0.5, category: "Pop Culture" },
];

export function MarketHooks() {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs shadow-xl">
                    <p className="font-bold text-white mb-1">{d.market}</p>
                    <p className="text-zinc-400">New Users: <span className="text-white">{d.users}</span></p>
                    <p className="text-zinc-400">LTV Multiplier: <span className="text-green-400">{d.ltvMultiplier}x</span></p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="bg-zinc-900 border-zinc-800 shadow-lg h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Magnet className="h-5 w-5 text-indigo-500" /> Market Hooks
                </CardTitle>
                <CardDescription>
                    Acquisition volume by 'First Bet' market.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={hooks}
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#eab308" />
                                    <stop offset="100%" stopColor="#facc15" />
                                </linearGradient>
                                <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#60a5fa" />
                                </linearGradient>
                            </defs>
                            <XAxis type="number" hide />
                            <YAxis
                                type="category"
                                dataKey="market"
                                stroke="#71717a"
                                fontSize={11}
                                width={100}
                                tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + "..." : val}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Bar dataKey="users" radius={[0, 4, 4, 0]} barSize={30}>
                                {hooks.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={index === 0 ? "url(#goldGradient)" : "url(#blueGradient)"}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
