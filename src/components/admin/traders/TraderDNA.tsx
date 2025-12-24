"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { Fingerprint, ScanEye, Activity } from "lucide-react";

interface DNAProps {
    profileType: "SNIPER" | "GAMBLER" | "AVERAGE";
}

// Mock DNA Profiles
const profiles = {
    SNIPER: [
        { subject: 'Win Rate', A: 85, fullMark: 100 },
        { subject: 'Risk/Reward', A: 80, fullMark: 100 },
        { subject: 'News Speed', A: 95, fullMark: 100 },
        { subject: 'Hold Time', A: 20, fullMark: 100 }, // Low hold time (quick)
        { subject: 'Leverage', A: 40, fullMark: 100 },
    ],
    GAMBLER: [
        { subject: 'Win Rate', A: 45, fullMark: 100 },
        { subject: 'Risk/Reward', A: 30, fullMark: 100 },
        { subject: 'News Speed', A: 20, fullMark: 100 },
        { subject: 'Hold Time', A: 10, fullMark: 100 },
        { subject: 'Leverage', A: 98, fullMark: 100 }, // Max leverage
    ],
    AVERAGE: [
        { subject: 'Win Rate', A: 52, fullMark: 100 },
        { subject: 'Risk/Reward', A: 50, fullMark: 100 },
        { subject: 'News Speed', A: 50, fullMark: 100 },
        { subject: 'Hold Time', A: 50, fullMark: 100 },
        { subject: 'Leverage', A: 50, fullMark: 100 },
    ]

};

export function TraderDNA({ profileType }: DNAProps) {
    const data = profiles[profileType] || profiles.AVERAGE;
    const color = profileType === "SNIPER" ? "#22c55e" : (profileType === "GAMBLER" ? "#ef4444" : "#3b82f6");
    const glowColor = profileType === "SNIPER" ? "rgba(34, 197, 94, 0.2)" : (profileType === "GAMBLER" ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)");

    return (
        <Card className="bg-zinc-900/40 border-white/5 shadow-2xl backdrop-blur-md h-full relative overflow-hidden group">
            {/* Ambient Background Glow based on Profile */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 pointer-events-none" />
            <div className="absolute top-0 right-0 p-32 rounded-full blur-3xl -z-10 transition-colors duration-1000 opacity-20"
                style={{ background: color }} />

            <CardHeader className="border-b border-white/5 pb-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-zinc-100">
                            <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                <ScanEye className="h-5 w-5" style={{ color: color }} />
                            </div>
                            Biometric DNA Analysis
                        </CardTitle>
                        <CardDescription className="mt-1 text-zinc-500">
                            Pattern Recognition: <span className="font-bold font-mono tracking-wider ml-1" style={{ color: color }}>{profileType}</span>
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-zinc-400 font-mono bg-zinc-950/50 px-2 py-1 rounded border border-white/5">
                            <Activity className="h-3 w-3 animate-pulse text-indigo-400" />
                            LIVE SCAN
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-8 relative z-10">
                <div className="h-[350px] w-full relative">
                    {/* Grid Overlay Effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
                            />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar
                                name={profileType}
                                dataKey="A"
                                stroke={color}
                                strokeWidth={2}
                                fill={color}
                                fillOpacity={0.3}
                                isAnimationActive={true}
                            />
                        </RadarChart>
                    </ResponsiveContainer>

                    {/* Central Holographic Dot */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                        style={{ backgroundColor: color }} />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-zinc-950/30 rounded-lg p-3 border border-white/5">
                        <div className="text-xs text-zinc-500 mb-1">Consistency Score</div>
                        <div className="text-xl font-mono font-bold text-zinc-200">94.2<span className="text-zinc-600 text-sm">%</span></div>
                    </div>
                    <div className="bg-zinc-950/30 rounded-lg p-3 border border-white/5">
                        <div className="text-xs text-zinc-500 mb-1">Risk Appetite</div>
                        <div className="text-xl font-mono font-bold" style={{ color: color }}>
                            {profileType === 'GAMBLER' ? 'EXTREME' : profileType === 'SNIPER' ? 'CALCULATED' : 'MODERATE'}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
