"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Radio } from "lucide-react";
import { toast } from "sonner";

interface IngestionHealth {
    status: "healthy" | "degraded" | "down";
    lastPolymarketUpdate: string | null;
    lastKalshiUpdate: string | null;
    polymarketCount: number;
    kalshiCount: number;
    staleMarkets: number;
    workerStatus: "active" | "standby" | "unknown";
    updatedAt: string;
}

export function IngestionHealthCard() {
    const [health, setHealth] = useState<IngestionHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHealth = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/ingestion-health");
            if (!res.ok) throw new Error("Failed to fetch health");
            const data = await res.json();
            setHealth(data);
        } catch (err) {
            console.error(err);
            setError("Failed to load ingestion health");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchHealth, 30_000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "healthy":
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case "degraded":
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case "down":
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Radio className="h-5 w-5 text-zinc-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = {
            healthy: "bg-green-500/10 text-green-400 border-green-500/20",
            degraded: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
            down: "bg-red-500/10 text-red-400 border-red-500/20",
        };
        return variants[status] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    };

    const formatTime = (isoString: string | null) => {
        if (!isoString) return "Never";
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);

        if (diffSec < 60) return `${diffSec}s ago`;
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        return date.toLocaleTimeString();
    };

    if (loading && !health) {
        return (
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md">
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2 text-zinc-500" />
                    <span className="text-zinc-500">Loading ingestion health...</span>
                </CardContent>
            </Card>
        );
    }

    if (error || !health) {
        return (
            <Card className="bg-zinc-900/40 border-red-500/20 backdrop-blur-md">
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-400">
                        <XCircle className="h-5 w-5" />
                        <span>{error || "Unknown error"}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={fetchHealth}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                    {getStatusIcon(health.status)}
                    <CardTitle className="text-lg font-medium text-zinc-200">
                        Ingestion Health
                    </CardTitle>
                    <Badge className={`${getStatusBadge(health.status)} border`}>
                        {health.status.toUpperCase()}
                    </Badge>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={fetchHealth}
                    disabled={loading}
                    className="h-8 w-8 p-0"
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Polymarket */}
                    <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Polymarket</p>
                        <p className="text-xl font-mono font-bold text-white">
                            {health.polymarketCount}
                        </p>
                        <p className="text-xs text-zinc-600">
                            {formatTime(health.lastPolymarketUpdate)}
                        </p>
                    </div>

                    {/* Kalshi */}
                    <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Kalshi</p>
                        <p className="text-xl font-mono font-bold text-white">
                            {health.kalshiCount}
                        </p>
                        <p className="text-xs text-zinc-600">
                            {formatTime(health.lastKalshiUpdate)}
                        </p>
                    </div>

                    {/* Total Markets */}
                    <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Total Markets</p>
                        <p className="text-xl font-mono font-bold text-green-400">
                            {health.polymarketCount + health.kalshiCount}
                        </p>
                    </div>

                    {/* Worker Status */}
                    <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Worker</p>
                        <div className="flex items-center gap-2">
                            <div
                                className={`h-2 w-2 rounded-full ${health.workerStatus === "active"
                                        ? "bg-green-500 animate-pulse"
                                        : health.workerStatus === "standby"
                                            ? "bg-yellow-500"
                                            : "bg-zinc-500"
                                    }`}
                            />
                            <p className="text-sm font-medium text-white capitalize">
                                {health.workerStatus}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Run Audit Button */}
                <div className="mt-4 pt-4 border-t border-zinc-800">
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            toast.info("Run audit from terminal: npx tsx src/scripts/verify-prices.ts");
                        }}
                    >
                        Run Price Audit
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
