"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Filter } from "lucide-react";

// Mock Cohort Data (SaaS Style)
const cohorts = [
    { month: "Aug '24", users: 154, retention: [100, 45, 30, 25, 20] },
    { month: "Sep '24", users: 230, retention: [100, 48, 35, 28] },
    { month: "Oct '24", users: 412, retention: [100, 42, 38] },
    { month: "Nov '24", users: 580, retention: [100, 52] },
    { month: "Dec '24", users: 890, retention: [100] },
];

export function RetentionCohort() {
    // Helper to get color intensity (Deep Space Blue Theme)
    const getBgColor = (percent: number) => {
        if (percent >= 90) return "bg-indigo-500/90 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-400/50";
        if (percent >= 60) return "bg-indigo-500/60 text-white border border-indigo-500/20";
        if (percent >= 40) return "bg-indigo-500/40 text-indigo-100 border border-indigo-500/10";
        if (percent >= 20) return "bg-indigo-500/20 text-indigo-300 border border-indigo-500/5";
        return "bg-zinc-800/20 text-zinc-500";
    };

    return (
        <Card className="bg-zinc-900/40 border-white/5 shadow-2xl backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

            <CardHeader className="border-b border-white/5 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-zinc-100">
                            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                <Users className="h-5 w-5 text-indigo-400" />
                            </div>
                            Retention Matrix
                        </CardTitle>
                        <CardDescription className="mt-1 text-zinc-500">
                            Monthly cohort analysis. Darker cells = <span className="text-indigo-400 font-medium">Higher Retention</span>.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="overflow-x-auto">
                    <div className="min-w-[600px] text-sm">
                        {/* Header */}
                        <div className="flex mb-3 text-zinc-500 font-mono text-xs tracking-wider">
                            <div className="w-24 shrink-0 flex items-center">COHORT</div>
                            <div className="w-24 shrink-0 flex items-center justify-center">USERS</div>
                            <div className="flex-1 grid grid-cols-6 gap-2 text-center">
                                <div>M+0</div>
                                <div>M+1</div>
                                <div>M+2</div>
                                <div>M+3</div>
                                <div>M+4</div>
                                <div>M+5</div>
                            </div>
                        </div>

                        {/* Rows */}
                        <div className="space-y-2">
                            {cohorts.map((cohort, i) => (
                                <div key={i} className="flex items-center h-10 group hover:bg-white/5 rounded-lg transition-colors px-2 -mx-2">
                                    <div className="w-24 shrink-0 font-medium text-zinc-300 flex items-center gap-2">
                                        {cohort.month}
                                    </div>
                                    <div className="w-24 shrink-0 text-zinc-400 text-center font-mono text-xs bg-zinc-950/30 rounded py-1 mx-2 border border-white/5">
                                        {cohort.users}
                                    </div>
                                    <div className="flex-1 grid grid-cols-6 gap-2 h-full items-center">
                                        {cohort.retention.map((val, j) => (
                                            <div
                                                key={j}
                                                className={`h-8 flex items-center justify-center rounded-md font-mono text-xs transition-all duration-300 hover:scale-105 cursor-default ${getBgColor(val)}`}
                                                title={`Month ${j}: ${val}% Retention`}
                                            >
                                                {val}%
                                            </div>
                                        ))}
                                        {/* Empty slots */}
                                        {Array.from({ length: 5 - (cohort.retention.length - 1) }).map((_, k) => (
                                            <div key={`empty-${k}`} className="h-8 bg-zinc-800/10 rounded-md border border-white/5 opacity-50" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-4 text-xs text-zinc-500">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-indigo-500/90 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                <span>&gt;90%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-indigo-500/60"></div>
                                <span>60-90%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-indigo-500/20"></div>
                                <span>&lt;20%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
