"use client";

import { useEffect, useState } from "react";
import { RevenueWaterfall } from "@/components/admin/analytics/RevenueWaterfall";
import { CohortRetention } from "@/components/admin/analytics/CohortRetention";
import { LTVCACChart } from "@/components/admin/analytics/LTVCACChart";
import { PayoutForecast } from "@/components/admin/analytics/PayoutForecast";
import { RepurchaseVelocity } from "@/components/admin/analytics/RepurchaseVelocity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, UserMinus, RefreshCcw, Loader2 } from "lucide-react";

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

export default function AnalyticsPage() {
    const [kpis, setKpis] = useState<GrowthKPIs | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/growth/metrics")
            .then(r => r.json())
            .then(data => setKpis(data.kpis))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Compute churn as: failed challenges / total ended challenges
    // FUTURE(v2): pull from a real churn API (user lifecycle events)
    const ltvDisplay = loading ? "—" : kpis ? `$${kpis.ltv.toLocaleString()}` : "$0";
    const ltvSub = loading ? "Loading..." : kpis
        ? `${kpis.totalCustomers} paying customers`
        : "No data";

    const ratioDisplay = loading ? "—" : kpis ? `${kpis.ltvCacRatio}x` : "0.0x";
    const r = parseFloat(kpis?.ltvCacRatio || "0");
    const ratioSub = loading ? "Loading..." : r >= 3
        ? "Healthy unit economics"
        : r >= 2 ? "Moderate — target >3x" : "Below threshold — target >3x";

    const whalesDisplay = loading ? "—" : String(kpis?.whales || 0);
    const whalesSub = loading ? "Loading..." : kpis
        ? `${kpis.whales} users with 2+ challenges`
        : "No data";

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white/90">Analytics Desk</h1>
                <p className="text-zinc-500">CFO Office — Deep financial intelligence and customer economics</p>
            </div>

            {/* KPI Cards — wired to real growth metrics API */}
            <div className="grid gap-6 md:grid-cols-3">
                <StatsCard
                    title="Average LTV"
                    value={ltvDisplay}
                    sub={ltvSub}
                    icon={DollarSign}
                    trend="up"
                    gradient="from-emerald-500/10 to-transparent"
                    text="text-emerald-500"
                    loading={loading}
                />
                <StatsCard
                    title="LTV / CAC Ratio"
                    value={ratioDisplay}
                    sub={ratioSub}
                    icon={RefreshCcw}
                    trend={r >= 3 ? "up" : "neutral"}
                    gradient="from-amber-500/10 to-transparent"
                    text="text-amber-500"
                    loading={loading}
                />
                <StatsCard
                    title="Repeat Buyers (Whales)"
                    value={whalesDisplay}
                    sub={whalesSub}
                    icon={UserMinus}
                    trend="neutral"
                    gradient="from-primary/10 to-transparent"
                    text="text-primary"
                    loading={loading}
                />
            </div>

            {/* Revenue Waterfall - Full Width */}
            <RevenueWaterfall />

            {/* Deep Dive Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CohortRetention />
                <LTVCACChart />
            </div>

            {/* Repurchase Velocity + Payout Forecast */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RepurchaseVelocity />
                <PayoutForecast />
            </div>
        </div>
    );
}

function StatsCard({
    title, value, sub, icon: Icon, trend, gradient, text, loading
}: {
    title: string;
    value: string | number;
    sub: string;
    icon: React.ElementType;
    trend?: string;
    gradient: string;
    text: string;
    loading?: boolean;
}) {
    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-xl relative overflow-hidden group">
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
                <div className={`p-2 rounded-lg bg-white/5 border border-white/5 ${text}`}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
                <p className={`text-xs mt-1 ${trend === 'up' ? 'text-green-400' : 'text-zinc-500'}`}>
                    {sub}
                </p>
            </CardContent>
        </Card>
    );
}
