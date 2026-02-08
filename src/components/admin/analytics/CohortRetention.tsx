"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CohortData {
    month: string;
    label: string;
    w0: number;
    w1: number | null;
    w2: number | null;
    w3: number | null;
    w4: number | null;
}

interface AnalyticsData {
    cohorts: CohortData[];
    summary: {
        totalUsers: number;
        conversionRate: number;
    };
}

export function CohortRetention() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/analytics/metrics");
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error("Failed to fetch cohort data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getColor = (value: number | null) => {
        if (value === null) return "bg-zinc-800/30";
        if (value >= 90) return "bg-emerald-500";
        if (value >= 80) return "bg-emerald-400";
        if (value >= 70) return "bg-amber-400";
        if (value >= 60) return "bg-orange-400";
        if (value > 0) return "bg-red-400";
        return "bg-zinc-700";
    };

    const getTextColor = (value: number | null) => {
        if (value === null) return "text-zinc-600";
        if (value >= 70) return "text-white";
        if (value > 0) return "text-zinc-900";
        return "text-zinc-400";
    };

    // Fallback mock data for when there's no real data yet
    const cohorts = data?.cohorts.length ? data.cohorts : [
        { month: "2026-01", label: "Jan", w0: 100, w1: null, w2: null, w3: null, w4: null },
    ];

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Cohort Retention Analysis
                        </CardTitle>
                        <CardDescription className="text-zinc-500">
                            {data?.summary ? (
                                <>
                                    {data.summary.totalUsers} total users • {data.summary.conversionRate}% conversion
                                </>
                            ) : (
                                "User retention by signup cohort (monthly)"
                            )}
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchData}
                        disabled={loading}
                        className="h-8 w-8 p-0"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading && !data ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="text-left text-xs font-medium text-zinc-400 pb-3 pr-4">Cohort</th>
                                        <th className="text-center text-xs font-medium text-zinc-400 pb-3 px-2">Month 0</th>
                                        <th className="text-center text-xs font-medium text-zinc-400 pb-3 px-2">Month 1</th>
                                        <th className="text-center text-xs font-medium text-zinc-400 pb-3 px-2">Month 2</th>
                                        <th className="text-center text-xs font-medium text-zinc-400 pb-3 px-2">Month 3</th>
                                        <th className="text-center text-xs font-medium text-zinc-400 pb-3 px-2">Month 4</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cohorts.map((cohort) => (
                                        <tr key={cohort.month}>
                                            <td className="text-sm font-medium text-zinc-300 py-2 pr-4">{cohort.label}</td>
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
                    </>
                )}
            </CardContent>
        </Card>
    );
}
