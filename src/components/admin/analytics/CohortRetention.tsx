"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";

export function CohortRetention() {
    // Cohort retention data (weeks 0-4)
    const cohorts = [
        { month: "Nov", w0: 100, w1: 85, w2: 72, w3: 65, w4: 58 },
        { month: "Dec", w0: 100, w1: 88, w2: 78, w3: 70, w4: null },
        { month: "Jan", w0: 100, w1: 92, w2: 82, w3: null, w4: null },
        { month: "Feb", w0: 100, w1: 90, w2: null, w3: null, w4: null },
        { month: "Mar", w0: 100, w1: null, w2: null, w3: null, w4: null },
    ];

    const getColor = (value: number | null) => {
        if (value === null) return "bg-zinc-800/30";
        if (value >= 90) return "bg-emerald-500";
        if (value >= 80) return "bg-emerald-400";
        if (value >= 70) return "bg-amber-400";
        if (value >= 60) return "bg-orange-400";
        return "bg-red-400";
    };

    const getTextColor = (value: number | null) => {
        if (value === null) return "text-zinc-600";
        if (value >= 70) return "text-white";
        return "text-zinc-900";
    };

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    Cohort Retention Analysis
                </CardTitle>
                <CardDescription className="text-zinc-500">User retention by signup cohort (weekly)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left text-xs font-medium text-zinc-400 pb-3 pr-4">Cohort</th>
                                <th className="text-center text-xs font-medium text-zinc-400 pb-3 px-2">Week 0</th>
                                <th className="text-center text-xs font-medium text-zinc-400 pb-3 px-2">Week 1</th>
                                <th className="text-center text-xs font-medium text-zinc-400 pb-3 px-2">Week 2</th>
                                <th className="text-center text-xs font-medium text-zinc-400 pb-3 px-2">Week 3</th>
                                <th className="text-center text-xs font-medium text-zinc-400 pb-3 px-2">Week 4</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cohorts.map((cohort, idx) => (
                                <tr key={cohort.month}>
                                    <td className="text-sm font-medium text-zinc-300 py-2 pr-4">{cohort.month}</td>
                                    {[cohort.w0, cohort.w1, cohort.w2, cohort.w3, cohort.w4].map((value, cellIdx) => (
                                        <td key={cellIdx} className="px-2 py-2">
                                            <div
                                                className={`
                                                    ${getColor(value)} 
                                                    ${getTextColor(value)}
                                                    rounded-md h-12 flex items-center justify-center
                                                    text-xs font-bold transition-all duration-200
                                                    hover:scale-105 hover:shadow-lg
                                                `}
                                            >
                                                {value !== null ? `${value}%` : "—"}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-emerald-500" />
                        <span className="text-xs text-zinc-400">90%+</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-emerald-400" />
                        <span className="text-xs text-zinc-400">80-89%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-amber-400" />
                        <span className="text-xs text-zinc-400">70-79%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-orange-400" />
                        <span className="text-xs text-zinc-400">60-69%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-red-400" />
                        <span className="text-xs text-zinc-400">&lt;60%</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
