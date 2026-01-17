"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface LtvCacData {
    month: string;
    ltv: number;
    cac: number;
}

interface AnalyticsData {
    ltvCac: LtvCacData[];
    summary: {
        averageLTV: number;
        totalRevenue: number;
    };
}

export function LTVCACChart() {
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
            console.error("Failed to fetch LTV/CAC data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length >= 2) {
            const ltv = payload[0]?.value || 0;
            const cac = payload[1]?.value || 1;
            return (
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl">
                    <p className="text-xs text-zinc-400 mb-2">{payload[0]?.payload?.month}</p>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-emerald-400">LTV:</span>
                            <span className="text-sm font-bold text-emerald-400">
                                ${ltv}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-red-400">CAC:</span>
                            <span className="text-sm font-bold text-red-400">
                                ${cac}
                            </span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-white/10">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-zinc-400">Ratio:</span>
                                <span className="text-sm font-bold text-white">
                                    {(ltv / cac).toFixed(2)}x
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Use real data or fallback
    const chartData = data?.ltvCac.length ? data.ltvCac : [
        { month: "Jan", ltv: 0, cac: 100 },
    ];

    const latestData = chartData[chartData.length - 1];
    const latestLTV = latestData?.ltv || 0;
    const latestCAC = latestData?.cac || 1;
    const ratio = latestCAC > 0 ? (latestLTV / latestCAC).toFixed(2) : "0.00";

    const getRatioStatus = (r: number) => {
        if (r >= 3) return { label: "Healthy Ratio", variant: "success" as const };
        if (r >= 2) return { label: "Moderate", variant: "warning" as const };
        return { label: "Needs Attention", variant: "error" as const };
    };

    const ratioNum = parseFloat(ratio);
    const status = getRatioStatus(ratioNum);

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-medium text-zinc-200">LTV / CAC Analysis</CardTitle>
                        <CardDescription className="text-zinc-500">
                            {data?.summary ? (
                                <>Total Revenue: ${data.summary.totalRevenue.toLocaleString()}</>
                            ) : (
                                "Customer economics over time"
                            )}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <div className="text-2xl font-bold text-white">{ratio}x</div>
                            <StatusBadge status={status.label} variant={status.variant} />
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
                </div>
            </CardHeader>
            <CardContent>
                {loading && !data ? (
                    <div className="flex items-center justify-center h-[300px]">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                    </div>
                ) : (
                    <>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorLTV" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCAC" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#71717a"
                                        fontSize={12}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#71717a"
                                        fontSize={12}
                                        tickLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="ltv"
                                        stroke="#22c55e"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorLTV)"
                                        name="LTV"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="cac"
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorCAC)"
                                        name="CAC"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Key Metrics */}
                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                <div className="text-xs text-emerald-400/70 uppercase tracking-wider">Current LTV</div>
                                <div className="text-xl font-bold text-emerald-400">${latestLTV}</div>
                            </div>
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <div className="text-xs text-red-400/70 uppercase tracking-wider">Estimated CAC</div>
                                <div className="text-xl font-bold text-red-400">${latestCAC}</div>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
