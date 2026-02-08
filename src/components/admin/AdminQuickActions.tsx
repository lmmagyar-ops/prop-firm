"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    RefreshCw,
    DollarSign,
    AlertTriangle,
    Users,
    TrendingUp,
    Zap,
    Clock,
    CheckCircle,
    XCircle,
    Ticket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QuickStats {
    pendingPayouts: number;
    pendingPayoutAmount: number;
    failedToday: number;
    activeChallenges: number;
    signupsToday: number;
    riskAlerts: number;
    myActiveChallenge: {
        id: string;
        balance: string;
        status: string;
    } | null;
}

export function AdminQuickActions() {
    const [stats, setStats] = useState<QuickStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [resetting, setResetting] = useState(false);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/admin/quick-stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch quick stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleResetMyEvaluation = async () => {
        if (!stats?.myActiveChallenge) {
            toast.error("No active challenge to reset");
            return;
        }

        if (!confirm("Reset your evaluation? This will delete all trades and restore starting balance.")) {
            return;
        }

        setResetting(true);
        try {
            const res = await fetch("/api/admin/reset-challenge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ challengeId: stats.myActiveChallenge.id }),
            });

            if (res.ok) {
                toast.success("Evaluation reset successfully!");
                fetchStats();
                // Refresh the page to update dashboard
                window.location.reload();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to reset");
            }
        } catch (error) {
            toast.error("Failed to reset evaluation");
        } finally {
            setResetting(false);
        }
    };

    const handleClearAllEvaluations = async () => {
        if (!confirm("⚠️ DELETE ALL your evaluations?\n\nThis will permanently remove ALL your challenges, positions, and trades. You'll start completely fresh.\n\nThis action cannot be undone!")) {
            return;
        }

        setClearing(true);
        try {
            const res = await fetch("/api/admin/clear-my-evaluations", {
                method: "DELETE",
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(`Cleared ${data.deleted.challenges} evaluations, ${data.deleted.trades} trades`);
                // Clear localStorage selection
                localStorage.removeItem("selectedChallengeId");
                document.cookie = "selectedChallengeId=; path=/; max-age=0";
                fetchStats();
                window.location.reload();
            } else {
                toast.error(data.error || "Failed to clear");
            }
        } catch (error) {
            toast.error("Failed to clear evaluations");
        } finally {
            setClearing(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 animate-pulse">
                <div className="h-6 w-32 bg-zinc-800 rounded mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-20 bg-zinc-800 rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-zinc-900/80 to-zinc-800/50 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Quick Actions
                </h2>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchStats}
                    className="text-zinc-400 hover:text-white"
                >
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {/* Operational Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {/* Pending Payouts */}
                <Link href="/admin/payouts" className="group">
                    <div className="bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 hover:border-amber-500/30 rounded-lg p-4 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-amber-500" />
                            <span className="text-xs text-zinc-400">Pending Payouts</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {stats?.pendingPayouts || 0}
                        </div>
                        {stats?.pendingPayoutAmount ? (
                            <div className="text-xs text-amber-500/80">
                                ${stats.pendingPayoutAmount.toLocaleString()}
                            </div>
                        ) : null}
                    </div>
                </Link>

                {/* Failed Today */}
                <Link href="/admin/traders?status=failed" className="group">
                    <div className="bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 hover:border-red-500/30 rounded-lg p-4 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-zinc-400">Failed Today</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {stats?.failedToday || 0}
                        </div>
                    </div>
                </Link>

                {/* Active Challenges */}
                <Link href="/admin/traders?status=active" className="group">
                    <div className="bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 hover:border-green-500/30 rounded-lg p-4 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-zinc-400">Active Challenges</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {stats?.activeChallenges || 0}
                        </div>
                    </div>
                </Link>

                {/* Signups Today */}
                <Link href="/admin/users" className="group">
                    <div className="bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 hover:border-primary/30 rounded-lg p-4 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-primary" />
                            <span className="text-xs text-zinc-400">Signups (24h)</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {stats?.signupsToday || 0}
                        </div>
                    </div>
                </Link>

                {/* Risk Alerts */}
                <Link href="/admin/risk" className="group">
                    <div className={`bg-zinc-800/50 hover:bg-zinc-800 border rounded-lg p-4 transition-all ${(stats?.riskAlerts || 0) > 0
                        ? "border-red-500/30 animate-pulse"
                        : "border-white/5 hover:border-zinc-500/30"
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className={`w-4 h-4 ${(stats?.riskAlerts || 0) > 0 ? "text-red-500" : "text-zinc-500"
                                }`} />
                            <span className="text-xs text-zinc-400">Risk Alerts</span>
                        </div>
                        <div className={`text-2xl font-bold ${(stats?.riskAlerts || 0) > 0 ? "text-red-500" : "text-white"
                            }`}>
                            {stats?.riskAlerts || 0}
                        </div>
                    </div>
                </Link>

                {/* Create Discount - Quick Action */}
                <Link href="/admin/discounts" className="group">
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/30 hover:border-purple-500/50 rounded-lg p-4 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <Ticket className="w-4 h-4 text-purple-400" />
                            <span className="text-xs text-purple-300">Create Discount</span>
                        </div>
                        <div className="text-sm font-medium text-purple-200">
                            + New Code
                        </div>
                    </div>
                </Link>
            </div>

            {/* Developer Actions */}
            <div className="border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Clock className="w-4 h-4" />
                        <span>Dev Tools</span>
                        {stats?.myActiveChallenge && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${stats.myActiveChallenge.status === 'funded'
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'bg-green-500/20 text-green-400'
                                }`}>
                                {stats.myActiveChallenge.status.charAt(0).toUpperCase() + stats.myActiveChallenge.status.slice(1)}: ${parseFloat(stats.myActiveChallenge.balance).toLocaleString()}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetMyEvaluation}
                            disabled={resetting || !stats?.myActiveChallenge}
                            className="text-xs border-zinc-700 hover:border-amber-500/50 hover:text-amber-500"
                        >
                            {resetting ? (
                                <>
                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Reset My Evaluation
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearAllEvaluations}
                            disabled={clearing}
                            className="text-xs border-red-900/50 text-red-400 hover:border-red-500 hover:text-red-300 hover:bg-red-500/10"
                        >
                            {clearing ? (
                                <>
                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                    Clearing...
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Clear All
                                </>
                            )}
                        </Button>
                        <Link href="/admin/settings">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-zinc-400 hover:text-white"
                            >
                                More Tools →
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
