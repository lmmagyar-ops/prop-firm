"use client";

import { InfluencerLeaderboard } from "@/components/admin/growth/InfluencerLeaderboard";
import { MarketHooks } from "@/components/admin/growth/MarketHooks";
import { DiscountElasticity } from "@/components/admin/growth/DiscountElasticity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Share2 } from "lucide-react";

export default function GrowthPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white/90">Growth Desk</h1>
                <p className="text-zinc-500">Acquisition channels, affiliate ROI, and marketing intelligence.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <StatsCard
                    title="CAC / LTV Ratio"
                    value="3.8x"
                    sub="Healthy (Target > 3.0x)"
                    icon={TrendingUp}
                    color="text-green-500"
                />
                <StatsCard
                    title="New Whales"
                    value="142"
                    sub="+12% vs last week"
                    icon={Users}
                    color="text-blue-500"
                />
                <StatsCard
                    title="Viral K-Factor"
                    value="1.2"
                    sub="Exponential Growth Area"
                    icon={Share2}
                    color="text-purple-500"
                />
            </div>

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
                <DiscountElasticity />
            </div>
        </div>
    );
}

function StatsCard({ title, value, sub, icon: Icon, color }: any) {
    return (
        <Card className="bg-zinc-900 border-zinc-800 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{value}</div>
                <p className="text-xs text-zinc-500">{sub}</p>
            </CardContent>
        </Card>
    );
}
