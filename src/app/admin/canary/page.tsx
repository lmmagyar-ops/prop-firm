"use client";

import { useEffect, useState, useCallback } from "react";

type CheckStatus = "GREEN" | "YELLOW" | "RED";

interface CanaryCheck {
    id: string;
    label: string;
    status: CheckStatus;
    detail: string;
    checkedAt: string;
}

interface CanaryData {
    overall: CheckStatus;
    checks: CanaryCheck[];
    checkedAt: string;
}

const STATUS_COLORS: Record<CheckStatus, { bg: string; border: string; dot: string; text: string }> = {
    GREEN: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        dot: "bg-emerald-400",
        text: "text-emerald-400",
    },
    YELLOW: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        dot: "bg-amber-400",
        text: "text-amber-400",
    },
    RED: {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        dot: "bg-red-400",
        text: "text-red-400",
    },
};

const STATUS_ICONS: Record<string, string> = {
    heartbeat: "💓",
    prices: "💰",
    reset: "🔄",
    orderbooks: "📊",
    worker: "⚙️",
};

const OVERALL_LABELS: Record<CheckStatus, string> = {
    GREEN: "All Systems Operational",
    YELLOW: "Degraded Performance",
    RED: "Critical — Capital at Risk",
};

export default function CanaryPage() {
    const [data, setData] = useState<CanaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchCanary = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/canary", { cache: "no-store" });
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const json = await res.json();
            setData(json);
            setError(null);
            setLastRefresh(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCanary();
        const interval = setInterval(fetchCanary, 30_000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, [fetchCanary]);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-zinc-500 text-lg">Running canary checks…</div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-400">
                    <h2 className="text-lg font-semibold mb-2">Canary Error</h2>
                    <p className="text-sm font-mono">{error}</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const overallColors = STATUS_COLORS[data.overall];

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Production Canary</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Infrastructure health — auto-refreshes every 30s
                </p>
            </div>

            {/* Overall Status Banner */}
            <div className={`${overallColors.bg} border ${overallColors.border} rounded-2xl p-6 transition-all duration-500`}>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className={`w-5 h-5 rounded-full ${overallColors.dot}`} />
                        <div className={`absolute inset-0 w-5 h-5 rounded-full ${overallColors.dot} animate-ping opacity-30`} />
                    </div>
                    <div>
                        <h2 className={`text-xl font-bold ${overallColors.text}`}>
                            {OVERALL_LABELS[data.overall]}
                        </h2>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Last checked: {lastRefresh.toLocaleTimeString()} · {data.checks.filter(c => c.status === "GREEN").length}/{data.checks.length} passing
                        </p>
                    </div>
                </div>
            </div>

            {/* Check Cards */}
            <div className="space-y-3">
                {data.checks.map(check => {
                    const colors = STATUS_COLORS[check.status];
                    const icon = STATUS_ICONS[check.id] || "🔍";

                    return (
                        <div
                            key={check.id}
                            className={`${colors.bg} border ${colors.border} rounded-xl p-4 transition-all duration-300 hover:scale-[1.01]`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-xl mt-0.5">{icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-white">{check.label}</h3>
                                        <div className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0`} />
                                    </div>
                                    <p className={`text-xs mt-1 ${check.status === "GREEN" ? "text-zinc-400" : colors.text} font-mono`}>
                                        {check.detail}
                                    </p>
                                </div>
                                <span className={`text-xs font-bold ${colors.text} flex-shrink-0`}>
                                    {check.status}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-zinc-600">
                Built after the Mar 4, 2026 incident — heartbeat was green but risk monitor had zero prices.
                <br />
                This canary checks the plumbing, not just the pulse.
            </p>
        </div>
    );
}
