"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Gift, Copy, Check, TrendingUp, Users, DollarSign,
    MousePointerClick, Loader2, ArrowUpRight, ExternalLink, Crown,
    Link2, ChevronRight, ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

// ReactBits premium components
import Aurora from "@/components/reactbits/Aurora";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import CountUp from "@/components/reactbits/CountUp";
import ShinyText from "@/components/reactbits/ShinyText";
import ScrollReveal from "@/components/reactbits/ScrollReveal";
import ClickSpark from "@/components/reactbits/ClickSpark";

interface AffiliateData {
    id: string;
    tier: number;
    status: string;
    commissionRate: number;
    referralCode: string;
    referralLink: string;
    monthlyEarningCap: number | null;
}

interface AffiliateStats {
    totalClicks: number;
    totalSignups: number;
    totalPurchases: number;
    conversionRate: string;
    totalCommission: number;
    pendingCommission: number;
    paidCommission: number;
    currentMonthEarnings: number;
}

interface ReferralRecord {
    id: string;
    status: "clicked" | "signed_up" | "converted";
    clickedAt: string | null;
    purchasedAt: string | null;
    purchaseAmount: number | null;
    commissionEarned: number | null;
    paid: boolean;
}

export default function AffiliateDashboard() {
    const [loading, setLoading] = useState(true);
    const [isAffiliate, setIsAffiliate] = useState(false);
    const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
    const [stats, setStats] = useState<AffiliateStats | null>(null);
    const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
    const [copied, setCopied] = useState(false);
    const [signingUp, setSigningUp] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch("/api/affiliate/stats");
            const data = await res.json();

            if (data.isAffiliate) {
                setIsAffiliate(true);
                setAffiliate(data.affiliate);
                setStats(data.stats);
                setReferrals(data.recentReferrals || []);
            } else {
                setIsAffiliate(false);
            }
        } catch {
            toast.error("Failed to load affiliate data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleSignup = async () => {
        setSigningUp(true);
        try {
            const res = await fetch("/api/affiliate/signup", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                toast.success("You're now an affiliate! Share your link to start earning.");
                await fetchStats();
            } else {
                toast.error(data.error || "Failed to sign up");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSigningUp(false);
        }
    };

    const copyLink = async () => {
        if (!affiliate) return;
        await navigator.clipboard.writeText(affiliate.referralLink);
        setCopied(true);
        toast.success("Referral link copied!");
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Not yet an affiliate — show signup CTA
    if (!isAffiliate) {
        return (
            <div className="max-w-2xl mx-auto space-y-8 py-8">
                <ScrollReveal>
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                            <Gift className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold">
                            <ShinyText text="Refer & Earn" speed={3} color="#ffffff" shineColor="#29af73" className="text-3xl font-bold" />
                        </h1>
                        <p className="text-zinc-400 max-w-md mx-auto">
                            Share your unique referral link with friends and earn commission on every evaluation purchase they make.
                        </p>
                    </div>
                </ScrollReveal>

                <ScrollReveal delay={0.15}>
                    <Card className="bg-[#0f1926] border-primary/20 overflow-hidden relative">
                        <div className="absolute inset-0 pointer-events-none opacity-30">
                            <Aurora colorStops={['#29af73', '#14F195', '#29af73']} amplitude={0.6} blend={0.7} speed={0.3} />
                        </div>
                        <CardContent className="p-8 space-y-6 relative z-10">
                            {/* 3-step funnel */}
                            <div className="grid grid-cols-5 gap-2 items-center">
                                <div className="col-span-1 flex flex-col items-center gap-2 text-center">
                                    <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                        <Link2 className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="text-xs font-semibold text-white">Share Link</div>
                                    <div className="text-[11px] text-zinc-500 leading-tight">30-day cookie</div>
                                </div>
                                <div className="col-span-1 flex items-center justify-center">
                                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                                </div>
                                <div className="col-span-1 flex flex-col items-center gap-2 text-center">
                                    <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                        <ShoppingCart className="w-5 h-5 text-zinc-300" />
                                    </div>
                                    <div className="text-xs font-semibold text-white">They Buy</div>
                                    <div className="text-[11px] text-zinc-500 leading-tight">Instant tracking</div>
                                </div>
                                <div className="col-span-1 flex items-center justify-center">
                                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                                </div>
                                <div className="col-span-1 flex flex-col items-center gap-2 text-center">
                                    <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="text-xs font-semibold text-primary">You Earn 10%</div>
                                    <div className="text-[11px] text-zinc-500 leading-tight">Per purchase</div>
                                </div>
                            </div>

                            <Button
                                onClick={handleSignup}
                                disabled={signingUp}
                                className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 rounded-xl shadow-[0_0_30px_rgba(41,175,115,0.3)]"
                            >
                                {signingUp ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Become an Affiliate <ArrowUpRight className="w-5 h-5" />
                                    </span>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </ScrollReveal>
            </div>
        );
    }

    // Active affiliate dashboard
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        <ShinyText text="Refer & Earn" speed={4} color="#ffffff" shineColor="#29af73" className="text-2xl font-bold" />
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Share your link and earn {affiliate?.commissionRate}% on every purchase
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className={
                            affiliate?.tier === 1
                                ? "border-zinc-600 text-zinc-400"
                                : affiliate?.tier === 2
                                    ? "border-primary text-primary"
                                    : "border-amber-500 text-amber-400"
                        }
                    >
                        <Crown className="w-3 h-3 mr-1" />
                        Tier {affiliate?.tier}
                    </Badge>
                </div>
            </div>

            {/* Referral Link Card */}
            <ScrollReveal>
                <Card className="bg-[#0f1926] border-primary/30 overflow-hidden relative shadow-[0_0_40px_rgba(41,175,115,0.08)]">
                    <div className="absolute inset-0 pointer-events-none opacity-60">
                        <Aurora colorStops={['#29af73', '#14F195', '#29af73']} amplitude={1.2} blend={0.6} speed={0.4} />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <Gift className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Your Referral Link</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-[#162231] rounded-lg px-4 py-3 font-mono text-sm text-zinc-300 truncate border border-white/5">
                                {affiliate?.referralLink}
                            </div>
                            <ClickSpark sparkColor="#29af73" sparkCount={6} sparkRadius={25}>
                                <Button
                                    onClick={copyLink}
                                    className={`min-w-[120px] transition-all ${copied
                                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                        : "bg-primary hover:bg-primary/90"
                                        }`}
                                >
                                    {copied ? (
                                        <span className="flex items-center gap-2">
                                            <Check className="w-4 h-4" /> Copied
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Copy className="w-4 h-4" /> Copy Link
                                        </span>
                                    )}
                                </Button>
                            </ClickSpark>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                            <span>Code: <span className="font-mono text-zinc-400">{affiliate?.referralCode}</span></span>
                            <span>•</span>
                            <span>30-day attribution window</span>
                        </div>
                    </CardContent>
                </Card>
            </ScrollReveal>

            {/* Stats Grid */}
            <ScrollReveal delay={0.1}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SpotlightCard className="rounded-xl" spotlightColor="rgba(41, 175, 115, 0.2)" spotlightSize={500}>
                        <StatCard
                            icon={MousePointerClick}
                            label="Total Clicks"
                            value={<CountUp to={stats?.totalClicks || 0} separator="," duration={1.5} delay={0} />}
                        />
                    </SpotlightCard>
                    <SpotlightCard className="rounded-xl" spotlightColor="rgba(41, 175, 115, 0.2)" spotlightSize={500}>
                        <StatCard
                            icon={Users}
                            label="Conversions"
                            value={<CountUp to={stats?.totalPurchases || 0} separator="," duration={1.5} delay={0.15} />}
                            subtitle={`${stats?.conversionRate || "0.0"}% rate`}
                        />
                    </SpotlightCard>
                    <SpotlightCard className="rounded-xl" spotlightColor="rgba(41, 175, 115, 0.25)" spotlightSize={500}>
                        <StatCard
                            icon={DollarSign}
                            label="Total Earned"
                            value={<CountUp to={stats?.totalCommission || 0} prefix="$" duration={2} delay={0.3} />}
                            highlight
                        />
                    </SpotlightCard>
                    <SpotlightCard className="rounded-xl" spotlightColor="rgba(41, 175, 115, 0.2)" spotlightSize={500}>
                        <StatCard
                            icon={TrendingUp}
                            label="Pending"
                            value={<CountUp to={stats?.pendingCommission || 0} prefix="$" duration={2} delay={0.45} />}
                        />
                    </SpotlightCard>
                </div>
            </ScrollReveal>

            {/* Monthly Cap Progress (Tier 1 only) */}
            {affiliate?.monthlyEarningCap && stats && (
                <Card className="bg-[#0f1926] border-white/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-zinc-400">Monthly Earnings</span>
                            <span className="text-xs text-zinc-500">
                                ${stats.currentMonthEarnings.toFixed(2)} / ${affiliate.monthlyEarningCap.toFixed(2)}
                            </span>
                        </div>
                        <div className="h-4 bg-[#162231] rounded-full overflow-hidden mb-2 border border-white/5 relative">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-1000 ease-out relative"
                                style={{
                                    width: `${Math.min(100, (stats.currentMonthEarnings / affiliate.monthlyEarningCap) * 100)}%`,
                                }}
                            >
                                {stats.currentMonthEarnings > 0 && (
                                    <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                                )}
                            </div>
                        </div>
                        {affiliate.tier === 1 && (
                            <p className="text-xs text-zinc-500 mt-3">
                                Tier 1 affiliates have a ${affiliate.monthlyEarningCap}/mo cap.{" "}
                                <a href="/api/affiliate/apply" className="text-primary hover:underline">
                                    Apply for Tier 2 <ExternalLink className="w-3 h-3 inline" />
                                </a>{" "}
                                for uncapped earnings.
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Recent Referrals */}
            <ScrollReveal delay={0.2}>
                <Card className="bg-[#0f1926] border-white/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recent Referrals</CardTitle>
                            {referrals.length > 0 && (
                                <span className="text-xs font-mono text-zinc-600">({referrals.length})</span>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {referrals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/5 rounded-xl text-zinc-600">
                                <MousePointerClick className="w-7 h-7 mb-3 opacity-25" />
                                <p className="text-sm font-medium">No referrals yet</p>
                                <p className="text-xs mt-1 opacity-70">Share your link above to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {referrals.map((ref) => (
                                    <div
                                        key={ref.id}
                                        className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors
                                            ${ref.status === "converted"
                                                ? "bg-green-500/5 border-green-500/10 hover:bg-green-500/10"
                                                : "bg-[#162231] border-white/5 hover:bg-white/5"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    ref.status === "converted"
                                                        ? "border-green-500/40 text-green-400 bg-green-500/10"
                                                        : ref.status === "signed_up"
                                                            ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
                                                            : "border-zinc-700 text-zinc-500"
                                                }
                                            >
                                                {ref.status === "converted"
                                                    ? "Converted"
                                                    : ref.status === "signed_up"
                                                        ? "Signed Up"
                                                        : "Clicked"}
                                            </Badge>
                                            <span className="text-xs text-zinc-500">
                                                {ref.purchasedAt
                                                    ? new Date(ref.purchasedAt).toLocaleDateString()
                                                    : ref.clickedAt
                                                        ? new Date(ref.clickedAt).toLocaleDateString()
                                                        : "—"}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            {ref.commissionEarned !== null ? (
                                                <span className="font-mono text-sm font-semibold text-green-400">
                                                    +${ref.commissionEarned.toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-zinc-700">—</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </ScrollReveal>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    subtitle,
    highlight,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: React.ReactNode;
    subtitle?: string;
    highlight?: boolean;
}) {
    return (
        <Card className="bg-[#0f1926] border-white/5 h-full">
            <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${highlight ? "bg-primary/10" : "bg-white/5"}`}>
                        <Icon className={`w-3.5 h-3.5 ${highlight ? "text-primary" : "text-zinc-400"}`} />
                    </div>
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
                </div>
                <div className={`text-3xl font-bold font-mono leading-none ${highlight ? "text-primary" : "text-white"}`}>
                    {value}
                </div>
                {subtitle && (
                    <div className="text-xs text-zinc-500">{subtitle}</div>
                )}
            </CardContent>
        </Card>
    );
}
