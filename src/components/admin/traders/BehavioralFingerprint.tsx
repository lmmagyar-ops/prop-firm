"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { Fingerprint } from "lucide-react";

export function BehavioralFingerprint() {
    // Behavioral metrics (0-100 scale)
    const data = [
        { metric: "Aggression", value: 75, fullMark: 100 },
        { metric: "Patience", value: 35, fullMark: 100 },
        { metric: "Discipline", value: 58, fullMark: 100 },
        { metric: "Risk Tolerance", value: 82, fullMark: 100 },
        { metric: "Consistency", value: 45, fullMark: 100 },
        { metric: "Adaptability", value: 68, fullMark: 100 },
    ];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl">
                    <p className="text-sm font-medium text-white">{payload[0].payload.metric}</p>
                    <p className="text-lg font-bold text-emerald-400">{payload[0].value}/100</p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                    <Fingerprint className="h-5 w-5 text-purple-400" />
                    Behavioral Fingerprint
                </CardTitle>
                <CardDescription className="text-zinc-500">Psychological trading profile</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={data}>
                            <PolarGrid stroke="#27272a" />
                            <PolarAngleAxis
                                dataKey="metric"
                                stroke="#71717a"
                                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                            />
                            <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                stroke="#71717a"
                                tick={{ fill: '#71717a', fontSize: 10 }}
                            />
                            <Radar
                                name="Trader"
                                dataKey="value"
                                stroke="#a78bfa"
                                fill="#a78bfa"
                                fillOpacity={0.3}
                                strokeWidth={2}
                            />
                            <Tooltip content={<CustomTooltip />} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Metric Breakdown */}
                <div className="mt-4 space-y-2">
                    {data.map((item) => (
                        <div key={item.metric} className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">{item.metric}</span>
                            <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 rounded-full transition-all"
                                        style={{ width: `${item.value}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium text-white w-8 text-right">{item.value}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Profile Summary */}
                <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="text-xs text-purple-400/70 uppercase tracking-wider mb-1">Profile Type</div>
                    <div className="text-sm font-medium text-purple-400">High-Risk Aggressive Trader</div>
                    <div className="text-xs text-zinc-500 mt-1">
                        Characterized by high aggression and risk tolerance with lower patience and consistency scores.
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
