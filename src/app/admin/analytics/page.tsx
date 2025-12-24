import { RepurchaseVelocity } from "@/components/admin/analytics/RepurchaseVelocity";
import { RetentionCohort } from "@/components/admin/analytics/RetentionCohort";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, UserMinus, RefreshCcw } from "lucide-react";

export default function AnalyticsPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white/90">Analytics Desk</h1>
                <p className="text-zinc-500">Revenue intelligence, LTV cohorts, and user lifecycle behavior.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <StatsCard
                    title="Average LTV"
                    value="$450.00"
                    sub="+12% from last month"
                    icon={DollarSign}
                    trend="up"
                    gradient="from-emerald-500/10 to-transparent"
                    text="text-emerald-500"
                />
                <StatsCard
                    title="Churn Rate"
                    value="12.5%"
                    sub="Stable at optimal levels"
                    icon={UserMinus}
                    trend="neutral"
                    gradient="from-blue-500/10 to-transparent"
                    text="text-blue-500"
                />
                <StatsCard
                    title="Re-Purchase Rate"
                    value="65.2%"
                    sub="Top Tier (Ind. Avg 45%)"
                    icon={RefreshCcw}
                    trend="up"
                    gradient="from-amber-500/10 to-transparent"
                    text="text-amber-500"
                />
            </div>

            {/* Deep Dive Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RepurchaseVelocity />
                <RetentionCohort />
            </div>
        </div>
    );
}

function StatsCard({ title, value, sub, icon: Icon, trend, gradient, text }: any) {
    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-xl relative overflow-hidden group">
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
                <div className={`p-2 rounded-lg bg-white/5 border border-white/5 ${text}`}>
                    <Icon className="h-4 w-4" />
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
