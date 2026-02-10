"use client";

import { ArbitrageScanner } from "@/components/admin/security/ArbitrageScanner";
import { ShieldCheck, UserX, AlertOctagon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SecurityPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white/90">Security Desk</h1>
                <p className="text-zinc-500">Latency arbitrage detection and toxic flow monitoring.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <StatsCard
                    title="Toxic Flow Prevented"
                    value="$4,250"
                    sub="Reclaimed from L-Arb bots today"
                    icon={AlertOctagon}
                    color="text-red-500"
                    gradient="from-red-500/10 to-transparent"
                />
                <StatsCard
                    title="Banned Scanners"
                    value="12"
                    sub="+3 detected in last hour"
                    icon={UserX}
                    color="text-orange-500"
                    gradient="from-orange-500/10 to-transparent"
                />
                <StatsCard
                    title="Risk Engine Status"
                    value="ACTIVE"
                    sub="Latency Offset: 0ms (Nominal)"
                    icon={ShieldCheck}
                    color="text-green-500"
                    gradient="from-green-500/10 to-transparent"
                />
            </div>

            {/* Main Scanner */}
            <div className="grid grid-cols-1">
                <ArbitrageScanner />
            </div>
        </div>
    );
}

function StatsCard({ title, value, sub, icon: Icon, color, gradient }: { title: string; value: string | number; sub: string; icon: React.ElementType; color: string; gradient: string }) {
    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-xl relative overflow-hidden group">
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
                <div className={`p-2 rounded-lg bg-white/5 border border-white/5 ${color}`}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
                <p className="text-xs text-zinc-500 mt-1">{sub}</p>
            </CardContent>
        </Card>
    );
}
