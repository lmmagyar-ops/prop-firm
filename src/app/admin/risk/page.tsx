"use client";

import { useEffect, useState } from "react";
import { MarketFilterDashboard } from "@/components/admin/risk/MarketFilterDashboard";
import { TraderRiskDistribution } from "@/components/admin/risk/TraderRiskDistribution";
import { DrawdownWaterfall } from "@/components/admin/risk/DrawdownWaterfall";
import { KillSwitchControls } from "@/components/admin/risk/KillSwitchControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Activity, TrendingDown, Scale, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RiskData {
    totalLiability: number;
    valueAtRisk: number;
    exposureUtilization: number;
    exposureCap: number;
    hedgedAmount: number;
    riskStatus: "low" | "medium" | "high" | "critical";
    breakdown: {
        funded: number;
        verification: number;
        challenge: number;
    };
    activeChallengeCount: number;
}

export default function RiskDeskPage() {
    const [data, setData] = useState<RiskData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRiskData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/risk/exposure");
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error("Failed to fetch risk data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRiskData();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Derive status from utilization
    const getUtilizationStatus = (util: number) => {
        if (util > 90) return "critical";
        if (util > 75) return "warning";
        if (util > 50) return "neutral";
        return "good";
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white/90">Risk Desk</h1>
                    <p className="text-zinc-500">War Room - Monitor firm-wide exposure, trader risk, and emergency controls</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchRiskData}
                    disabled={loading}
                    className="gap-2"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                </Button>
            </div>

            {/* Risk KPIs */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <RiskMetricCard
                    title="Total Liability"
                    value={data ? formatCurrency(data.totalLiability) : "—"}
                    icon={ShieldAlert}
                    status={data?.riskStatus || "neutral"}
                    sub={data ? `${data.activeChallengeCount} active challenges` : "Loading..."}
                    loading={loading}
                />
                <RiskMetricCard
                    title="Value at Risk (VaR)"
                    value={data ? formatCurrency(data.valueAtRisk) : "—"}
                    icon={TrendingDown}
                    status="neutral"
                    sub="5% of exposure"
                    loading={loading}
                />
                <RiskMetricCard
                    title="Exposure Utilization"
                    value={data ? `${data.exposureUtilization}%` : "—"}
                    icon={Activity}
                    status={data ? getUtilizationStatus(data.exposureUtilization) : "neutral"}
                    sub={data ? `Cap: ${formatCurrency(data.exposureCap)}` : "Loading..."}
                    loading={loading}
                />
                <RiskMetricCard
                    title="Hedged Positions"
                    value={data ? formatCurrency(data.hedgedAmount) : "—"}
                    icon={Scale}
                    status="good"
                    sub="From challenge fees"
                    loading={loading}
                />
            </div>

            {/* Exposure Breakdown */}
            {data && (
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-lg text-zinc-200">Exposure Breakdown by Phase</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                                <div className="text-xs text-primary uppercase tracking-wider mb-1">Challenge Phase</div>
                                <div className="text-2xl font-bold text-primary font-mono">{formatCurrency(data.breakdown.challenge)}</div>
                            </div>
                            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                <div className="text-xs text-purple-400 uppercase tracking-wider mb-1">Verification Phase</div>
                                <div className="text-2xl font-bold text-purple-400 font-mono">{formatCurrency(data.breakdown.verification)}</div>
                            </div>
                            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                <div className="text-xs text-green-400 uppercase tracking-wider mb-1">Funded Accounts</div>
                                <div className="text-2xl font-bold text-green-400 font-mono">{formatCurrency(data.breakdown.funded)}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Market Filter Pipeline Dashboard - Full Width */}
            <MarketFilterDashboard />

            {/* Risk Analysis Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TraderRiskDistribution />
                <DrawdownWaterfall />
            </div>

            {/* Kill Switch Controls - Full Width */}
            <KillSwitchControls />
        </div>
    );
}

function RiskMetricCard({ title, value, icon: Icon, status, sub, loading }: { title: string; value: string | number; icon: React.ElementType; status: string; sub: string; loading?: boolean }) {
    const statusColors = {
        critical: "text-red-500",
        high: "text-red-500",
        warning: "text-orange-500",
        good: "text-green-500",
        low: "text-green-500",
        medium: "text-yellow-500",
        neutral: "text-primary"
    };

    return (
        <Card className={`bg-black/40 border-white/5 backdrop-blur-xl relative overflow-hidden group hover:border-white/10 transition-all duration-300`}>
            <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
                    {loading ? (
                        <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
                    ) : (
                        <Icon className={`h-4 w-4 ${statusColors[status as keyof typeof statusColors] || statusColors.neutral}`} />
                    )}
                </div>
                <div className="space-y-1">
                    <div className="text-2xl font-bold text-white tracking-tight tabular-nums">{value}</div>
                    <p className="text-xs text-zinc-500 font-mono">{sub}</p>
                </div>
            </div>
        </Card>
    );
}
