import { MarketExposureHeatmap } from "@/components/admin/risk/MarketExposureHeatmap";
import { TraderRiskDistribution } from "@/components/admin/risk/TraderRiskDistribution";
import { DrawdownWaterfall } from "@/components/admin/risk/DrawdownWaterfall";
import { KillSwitchControls } from "@/components/admin/risk/KillSwitchControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Activity, TrendingDown, Scale } from "lucide-react";

export default function RiskDeskPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white/90">Risk Desk</h1>
                <p className="text-zinc-500">War Room - Monitor firm-wide exposure, trader risk, and emergency controls</p>
            </div>

            {/* Risk KPIs */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <RiskMetricCard
                    title="Total Liability"
                    value="$1,240,000"
                    icon={ShieldAlert}
                    status="critical"
                    sub="+12% vs Cap"
                />
                <RiskMetricCard
                    title="Value at Risk (VaR)"
                    value="$450,200"
                    icon={TrendingDown}
                    status="neutral"
                    sub="95% Confidence"
                />
                <RiskMetricCard
                    title="Exposure Utilization"
                    value="78%"
                    icon={Activity}
                    status="warning"
                    sub="High Load"
                />
                <RiskMetricCard
                    title="Hedged Positions"
                    value="$890,000"
                    icon={Scale}
                    status="good"
                    sub="Re-insurance Active"
                />
            </div>

            {/* Market Exposure Heatmap - Full Width */}
            <MarketExposureHeatmap />

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

function RiskMetricCard({ title, value, icon: Icon, status, sub }: any) {
    const statusColors = {
        critical: "text-red-500",
        warning: "text-orange-500",
        good: "text-green-500",
        neutral: "text-blue-500"
    };

    const bgColors = {
        critical: "bg-red-500/10 border-red-500/20",
        warning: "bg-orange-500/10 border-orange-500/20",
        good: "bg-green-500/10 border-green-500/20",
        neutral: "bg-blue-500/10 border-blue-500/20"
    };

    return (
        <Card className={`bg-black/40 border-white/5 backdrop-blur-xl relative overflow-hidden group hover:border-white/10 transition-all duration-300`}>
            <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
                    <Icon className={`h-4 w-4 ${(statusColors as any)[status]}`} />
                </div>
                <div className="space-y-1">
                    <div className="text-2xl font-bold text-white tracking-tight tabular-nums">{value}</div>
                    <p className="text-xs text-zinc-500 font-mono">{sub}</p>
                </div>
            </div>
        </Card>
    );
}
