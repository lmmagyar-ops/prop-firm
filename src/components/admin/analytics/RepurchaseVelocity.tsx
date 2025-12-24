"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from "recharts";
import { Timer, Zap } from "lucide-react";

// Mock Data: Distribution of time-to-repurchase
const data = [
    { time: "< 1h", count: 145, label: "Immediate (Rage)" },
    { time: "1-4h", count: 85, label: "Same Day" },
    { time: "4-24h", count: 60, label: "Next Day" },
    { time: "1-3d", count: 45, label: "Week" },
    { time: "3-7d", count: 30, label: "Slow" },
];

export function RepurchaseVelocity() {
    return (
        <Card className="bg-zinc-900/40 border-white/5 shadow-2xl backdrop-blur-md overflow-hidden relative group">
            {/* Amber Glow Effect */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-amber-500/5 blur-3xl -z-10 pointer-events-none" />

            <CardHeader className="border-b border-white/5 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-zinc-100">
                            <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                <Zap className="h-5 w-5 text-amber-500 animate-pulse" />
                            </div>
                            Re-Purchase Velocity
                        </CardTitle>
                        <CardDescription className="mt-1 text-zinc-500">
                            Time elapsed between <span className="text-red-400">Challenge Failure</span> and <span className="text-green-400">New Purchase</span>.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <defs>
                                <linearGradient id="velocityBar" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.2} />
                                </linearGradient>
                                <linearGradient id="velocityBarBlue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="time"
                                stroke="#71717a"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#71717a"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-zinc-950/90 border border-zinc-800 p-3 rounded-lg text-xs shadow-xl backdrop-blur-xl ring-1 ring-white/10">
                                                <div className="font-bold text-white mb-1">{label}</div>
                                                <div className="text-zinc-400 flex justify-between gap-4">
                                                    <span>Traders:</span>
                                                    <span className="text-amber-400 font-mono font-bold">{payload[0].value}</span>
                                                </div>
                                                <div className="text-zinc-500 mt-1 italic">
                                                    {data.find(d => d.time === label)?.label}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={index === 0 ? "url(#velocityBar)" : "url(#velocityBarBlue)"}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-3">
                    <Timer className="h-4 w-4 text-amber-500" />
                    <div className="text-xs text-zinc-300">
                        <span className="font-bold text-amber-400">Insight:</span> 63% of failed traders re-purchase within <span className="font-bold text-white">4 hours</span> ("Rage Trading"). Retargeting ads should be immediate.
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
