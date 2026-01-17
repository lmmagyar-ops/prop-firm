"use client";

import { useEffect, useState } from "react";
import { InfluencerLeaderboard } from "@/components/admin/growth/InfluencerLeaderboard";
import { MarketHooks } from "@/components/admin/growth/MarketHooks";
import { DiscountElasticity } from "@/components/admin/growth/DiscountElasticity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Share2, Loader2, RefreshCw, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface GrowthKPIs {
    ltvCacRatio: string;
    ltv: number;
    cac: number;
    whales: number;
    kFactor: string;
    totalUsers: number;
    totalCustomers: number;
    totalRevenue: number;
}

interface DiscountPerformance {
    date: string;
    revenue: number;
    discountRate: number;
    redemptions: number;
}

interface GrowthData {
    kpis: GrowthKPIs;
    discountPerformance: DiscountPerformance[];
    discountLeaderboard: any[];
}

export default function GrowthPage() {
    const [data, setData] = useState<GrowthData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/growth/metrics");
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error("Failed to fetch growth data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getRatioStatus = (ratio: string) => {
        const r = parseFloat(ratio);
        if (r >= 3) return { text: "Healthy", color: "text-green-500" };
        if (r >= 2) return { text: "Moderate", color: "text-yellow-500" };
        return { text: "Needs Work", color: "text-red-500" };
    };

    const kpis = data?.kpis;
    const ratioStatus = kpis ? getRatioStatus(kpis.ltvCacRatio) : null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white/90">Growth Desk</h1>
                    <p className="text-zinc-500">Acquisition channels, affiliate ROI, and marketing intelligence.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/discounts">
                        <Button variant="outline" className="gap-2">
                            <Ticket className="h-4 w-4" />
                            Manage Discounts
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchData}
                        disabled={loading}
                        className="h-9 w-9 p-0"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <StatsCard
                    title="LTV / CAC Ratio"
                    value={loading ? "—" : `${kpis?.ltvCacRatio || "0.0"}x`}
                    sub={ratioStatus ? `${ratioStatus.text} (Target > 3.0x)` : "Loading..."}
                    icon={TrendingUp}
                    color={ratioStatus?.color || "text-green-500"}
                    loading={loading}
                    detail={kpis ? `LTV: $${kpis.ltv} / CAC: $${kpis.cac}` : undefined}
                />
                <StatsCard
                    title="Whales (2+ Purchases)"
                    value={loading ? "—" : String(kpis?.whales || 0)}
                    sub={kpis ? `${kpis.totalCustomers} total customers` : "Loading..."}
                    icon={Users}
                    color="text-blue-500"
                    loading={loading}
                />
                <StatsCard
                    title="Viral K-Factor"
                    value={loading ? "—" : kpis?.kFactor || "0.0"}
                    sub={parseFloat(kpis?.kFactor || "0") >= 1 ? "Exponential Growth" : "Below Viral Threshold"}
                    icon={Share2}
                    color={parseFloat(kpis?.kFactor || "0") >= 1 ? "text-purple-500" : "text-zinc-500"}
                    loading={loading}
                />
            </div>

            {/* Revenue Summary */}
            {kpis && (
                <Card className="bg-gradient-to-r from-emerald-500/10 to-transparent border-emerald-500/20">
                    <CardContent className="flex items-center justify-between py-4">
                        <div>
                            <div className="text-sm text-emerald-400/70 uppercase tracking-wider">Total Revenue</div>
                            <div className="text-3xl font-bold text-emerald-400 font-mono">${kpis.totalRevenue.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-zinc-400">{kpis.totalUsers} users / {kpis.totalCustomers} customers</div>
                            <div className="text-xs text-zinc-500">Conversion: {kpis.totalUsers > 0 ? Math.round((kpis.totalCustomers / kpis.totalUsers) * 100) : 0}%</div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Middle Section: Leaderboard + Hooks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                <div className="lg:col-span-2 h-full">
                    <InfluencerLeaderboard />
                </div>
                <div className="lg:col-span-1 h-full">
                    <MarketHooks />
                </div>
            </div>

            {/* Bottom Section: War Room */}
            <div className="grid grid-cols-1">
                <DiscountElasticity data={data?.discountPerformance} leaderboard={data?.discountLeaderboard} />
            </div>
        </div>
    );
}

function StatsCard({ title, value, sub, icon: Icon, color, loading, detail }: any) {
    return (
        <Card className="bg-zinc-900 border-zinc-800 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                ) : (
                    <Icon className={`h-4 w-4 ${color}`} />
                )}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{value}</div>
                <p className="text-xs text-zinc-500">{sub}</p>
                {detail && <p className="text-xs text-zinc-600 mt-1">{detail}</p>}
            </CardContent>
        </Card>
    );
}
