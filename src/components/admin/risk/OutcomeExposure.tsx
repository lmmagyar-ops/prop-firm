"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine, Legend } from "recharts";
import { AlertTriangle, TrendingUp, Info } from "lucide-react";

interface ExposureData {
    eventId: string;
    eventName: string;
    outcome: "YES" | "NO";
    liability: number;
    volume: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

// Mock Data Generator
const generateMockExposure = (): ExposureData[] => [
    { eventId: "e1", eventName: "Trump Wins 2024", outcome: "YES", liability: 125000, volume: 450000, riskLevel: "HIGH" },
    { eventId: "e1b", eventName: "Trump Wins 2024", outcome: "NO", liability: 45000, volume: 150000, riskLevel: "LOW" },
    { eventId: "e2", eventName: "Fed Rate Cut (Dec)", outcome: "YES", liability: 85000, volume: 200000, riskLevel: "MEDIUM" },
    { eventId: "e3", eventName: "BTC > 100k", outcome: "YES", liability: 15000, volume: 50000, riskLevel: "LOW" },
    { eventId: "e4", eventName: "SpaceX Launch", outcome: "NO", liability: 5000, volume: 12000, riskLevel: "LOW" },
    { eventId: "e5", eventName: "Taylor Swift Breakup", outcome: "YES", liability: 92000, volume: 120000, riskLevel: "MEDIUM" },
];

export function OutcomeExposure() {
    const [data, setData] = useState<ExposureData[]>([]);
    const [maxLiabilityCap] = useState(100000); // 100k Max Risk per outcome

    useEffect(() => {
        // Simulate fetch
        setData(generateMockExposure());
    }, []);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-zinc-950/90 border border-zinc-800 p-3 rounded-lg shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
                    <p className="font-medium text-white mb-2 text-sm">{d.eventName}</p>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between gap-6 items-center">
                            <span className="text-zinc-400">Position</span>
                            <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${d.outcome === "YES" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                                {d.outcome}
                            </span>
                        </div>
                        <div className="flex justify-between gap-6 items-center">
                            <span className="text-zinc-400">Net Liability</span>
                            <span className="font-mono text-white text-lg tracking-tight font-light">${d.liability.toLocaleString()}</span>
                        </div>
                        <div className="h-px bg-zinc-800 my-1" />
                        <div className="flex justify-between gap-6">
                            <span className="text-zinc-500">Cap Usage</span>
                            <span className={`font-mono ${d.liability > maxLiabilityCap ? "text-red-400" : "text-zinc-400"}`}>
                                {((d.liability / maxLiabilityCap) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="bg-zinc-900/40 border-white/5 shadow-xl backdrop-blur-md overflow-hidden relative group h-[600px]">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 p-32 bg-orange-500/5 rounded-full blur-3xl -z-10 group-hover:bg-orange-500/10 transition-colors duration-1000" />

            <CardHeader className="border-b border-white/5 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-medium flex items-center gap-2 text-zinc-100">
                            <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                <AlertTriangle className="h-4 w-4 text-orange-400" />
                            </div>
                            Liability Exposure Heatmap
                        </CardTitle>
                        <CardDescription className="text-zinc-500 mt-1">
                            Monitoring risk across all active outcome markets.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-zinc-700" />
                            <span className="text-zinc-500">Safe</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-400">Over Exposure ({'>'}$100k)</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={data}
                            margin={{ top: 0, right: 30, left: 20, bottom: 20 }}
                            barSize={24}
                            barGap={2}
                        >
                            <XAxis type="number" hide />
                            <YAxis
                                type="category"
                                dataKey="eventName"
                                stroke="#52525b"
                                fontSize={11}
                                width={120}
                                tickFormatter={(val) => val.length > 20 ? val.substring(0, 20) + "..." : val}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <ReferenceLine x={maxLiabilityCap} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: "MAX CAP", fill: "#ef4444", fontSize: 10, dy: -10 }} />
                            <Bar dataKey="liability" radius={[0, 4, 4, 0]}>
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            entry.liability > maxLiabilityCap
                                                ? "#ef4444"
                                                : entry.outcome === "YES"
                                                    ? "#22c55e"
                                                    : "#3b82f6"
                                        }
                                        fillOpacity={entry.liability > maxLiabilityCap ? 0.9 : 0.6}
                                        stroke={entry.liability > maxLiabilityCap ? "#b91c1c" : "transparent"}
                                        strokeWidth={1}
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
