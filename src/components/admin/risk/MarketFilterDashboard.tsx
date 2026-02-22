"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Filter, TrendingDown, Clock } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

interface FilterReport {
    total: number;
    closed: number;
    endDate: number;
    spam: number;
    volume: number;
    survived: number;
    // Featured-only
    noPrices?: number;
    placeholder?: number;
    archPrefix?: number;
    noTokens?: number;
    duplicate?: number;
    priceBounds?: number;
    // Binary-only
    multiOutcome?: number;
    stalePrice?: number;
    placeholderPrice?: number;
    nearResolved?: number;
    // Metadata
    updatedAt?: string;
    volumeDistribution?: {
        under50k: number;
        '50k_100k': number;
        '100k_500k': number;
        '500k_1m': number;
        over1m: number;
    };
}

interface MarketHealthData {
    featured: FilterReport | null;
    binary: FilterReport | null;
    threshold: number;
    workerTimestamp: number | null;
}

// ─── Filter bar item ────────────────────────────────────────────────

interface FilterBar {
    label: string;
    count: number;
    color: string;
}

function buildFilterBars(report: FilterReport, pipeline: 'featured' | 'binary'): FilterBar[] {
    const bars: FilterBar[] = [];

    if (report.closed > 0) bars.push({ label: "Closed", count: report.closed, color: "#6b7280" });
    if (report.endDate > 0) bars.push({ label: "Expired", count: report.endDate, color: "#6b7280" });
    if (report.spam > 0) bars.push({ label: "Spam", count: report.spam, color: "#ef4444" });
    if (report.volume > 0) bars.push({ label: "Low Volume", count: report.volume, color: "#f59e0b" });

    if (pipeline === 'featured') {
        if ((report.noPrices ?? 0) > 0) bars.push({ label: "No Prices", count: report.noPrices!, color: "#6b7280" });
        if ((report.placeholder ?? 0) > 0) bars.push({ label: "Placeholder", count: report.placeholder!, color: "#6b7280" });
        if ((report.priceBounds ?? 0) > 0) bars.push({ label: "Price Bounds", count: report.priceBounds!, color: "#8b5cf6" });
        if ((report.duplicate ?? 0) > 0) bars.push({ label: "Duplicate", count: report.duplicate!, color: "#6b7280" });
    }

    if (pipeline === 'binary') {
        if ((report.nearResolved ?? 0) > 0) bars.push({ label: "Near-Resolved", count: report.nearResolved!, color: "#8b5cf6" });
        if ((report.multiOutcome ?? 0) > 0) bars.push({ label: "Multi-Outcome", count: report.multiOutcome!, color: "#6b7280" });
        if ((report.stalePrice ?? 0) > 0) bars.push({ label: "Stale Price", count: report.stalePrice!, color: "#6b7280" });
        if ((report.placeholderPrice ?? 0) > 0) bars.push({ label: "Placeholder", count: report.placeholderPrice!, color: "#6b7280" });
    }

    // Sort by count descending
    bars.sort((a, b) => b.count - a.count);
    return bars;
}

// ─── Volume Distribution Labels ─────────────────────────────────────

const VOLUME_LABELS: { key: keyof NonNullable<FilterReport['volumeDistribution']>; label: string; color: string }[] = [
    { key: 'under50k', label: '<$50K', color: '#ef4444' },
    { key: '50k_100k', label: '$50K-$100K', color: '#f59e0b' },
    { key: '100k_500k', label: '$100K-$500K', color: '#22c55e' },
    { key: '500k_1m', label: '$500K-$1M', color: '#3b82f6' },
    { key: 'over1m', label: '$1M+', color: '#8b5cf6' },
];

// ─── Component ──────────────────────────────────────────────────────

export function MarketFilterDashboard() {
    const [data, setData] = useState<MarketHealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/market-health");
            if (!res.ok) throw new Error(`${res.status}`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
            setError("Failed to load filter report");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60_000); // Auto-refresh every 60s
        return () => clearInterval(interval);
    }, [fetchData]);

    // Time ago helper
    const timeAgo = (iso: string | undefined | null): string => {
        if (!iso) return "—";
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60_000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
    };

    // Survival rate
    const survivalRate = (r: FilterReport | null) => {
        if (!r || r.total === 0) return 0;
        return Math.round((r.survived / r.total) * 100);
    };

    const binary = data?.binary ?? null;
    const featured = data?.featured ?? null;

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                            <Filter className="h-5 w-5 text-primary" />
                            Market Filter Pipeline
                        </CardTitle>
                        <CardDescription className="text-zinc-500">
                            Live filtering statistics from the ingestion worker
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        {data?.threshold && (
                            <Badge variant="outline" className="text-amber-400 border-amber-400/30 font-mono text-xs">
                                Threshold: ${(data.threshold / 1000).toFixed(0)}K
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={fetchData}
                            disabled={loading}
                            className="h-8 w-8"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {error ? (
                    <div className="text-red-400 text-sm py-4">{error}</div>
                ) : !data || (!binary && !featured) ? (
                    <div className="text-zinc-500 text-sm py-4 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Waiting for first ingestion cycle…
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* ── Funnel Headlines ──────────────────── */}
                        <div className="grid grid-cols-2 gap-4">
                            {binary && (
                                <FunnelCard
                                    title="Binary Markets"
                                    total={binary.total}
                                    survived={binary.survived}
                                    rate={survivalRate(binary)}
                                    updatedAt={timeAgo(binary.updatedAt)}
                                />
                            )}
                            {featured && (
                                <FunnelCard
                                    title="Featured Events"
                                    total={featured.total}
                                    survived={featured.survived}
                                    rate={survivalRate(featured)}
                                    updatedAt={timeAgo(featured.updatedAt)}
                                />
                            )}
                        </div>

                        {/* ── Binary Filter Breakdown ──────────── */}
                        {binary && binary.total > 0 && (
                            <FilterBreakdown
                                title="Binary Market Filters"
                                report={binary}
                                pipeline="binary"
                            />
                        )}

                        {/* ── Featured Filter Breakdown ────────── */}
                        {featured && featured.total > 0 && (
                            <FilterBreakdown
                                title="Featured Event Filters"
                                report={featured}
                                pipeline="featured"
                            />
                        )}

                        {/* ── Volume Distribution ──────────────── */}
                        {binary?.volumeDistribution && (
                            <VolumeDistribution dist={binary.volumeDistribution} />
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Sub-components ─────────────────────────────────────────────────

function FunnelCard({ title, total, survived, rate, updatedAt }: {
    title: string;
    total: number;
    survived: number;
    rate: number;
    updatedAt: string;
}) {
    const rateColor = rate >= 30 ? "text-green-400" : rate >= 15 ? "text-amber-400" : "text-red-400";

    return (
        <div className="p-4 rounded-lg bg-black/30 border border-white/5">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{title}</div>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white font-mono">{total}</span>
                <TrendingDown className="h-4 w-4 text-zinc-600" />
                <span className="text-2xl font-bold text-primary font-mono">{survived}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
                <span className={`text-sm font-mono font-medium ${rateColor}`}>
                    {rate}% survival
                </span>
                <span className="text-xs text-zinc-600">{updatedAt}</span>
            </div>
        </div>
    );
}

function FilterBreakdown({ title, report, pipeline }: {
    title: string;
    report: FilterReport;
    pipeline: 'featured' | 'binary';
}) {
    const bars = buildFilterBars(report, pipeline);
    if (bars.length === 0) return null;
    const maxCount = Math.max(...bars.map(b => b.count));

    return (
        <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">{title}</div>
            <div className="space-y-2">
                {bars.map((bar) => (
                    <div key={bar.label} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-zinc-400 text-right shrink-0">{bar.label}</div>
                        <div className="flex-1 h-5 bg-white/5 rounded-sm overflow-hidden">
                            <div
                                className="h-full rounded-sm transition-all duration-500"
                                style={{
                                    width: `${Math.max((bar.count / maxCount) * 100, 2)}%`,
                                    backgroundColor: bar.color,
                                    opacity: 0.7,
                                }}
                            />
                        </div>
                        <div className="w-10 text-xs text-zinc-400 font-mono text-right">{bar.count}</div>
                    </div>
                ))}
                {/* Survived row */}
                <div className="flex items-center gap-3 pt-1 border-t border-white/5">
                    <div className="w-24 text-xs text-green-400 text-right shrink-0 font-medium">Survived</div>
                    <div className="flex-1 h-5 bg-white/5 rounded-sm overflow-hidden">
                        <div
                            className="h-full rounded-sm transition-all duration-500"
                            style={{
                                width: `${Math.max((report.survived / maxCount) * 100, 2)}%`,
                                backgroundColor: '#22c55e',
                                opacity: 0.7,
                            }}
                        />
                    </div>
                    <div className="w-10 text-xs text-green-400 font-mono text-right font-medium">{report.survived}</div>
                </div>
            </div>
        </div>
    );
}

function VolumeDistribution({ dist }: { dist: NonNullable<FilterReport['volumeDistribution']> }) {
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    return (
        <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Volume Distribution (Surviving)</div>
            <div className="flex gap-1 h-8 rounded-md overflow-hidden">
                {VOLUME_LABELS.map(({ key, label, color }) => {
                    const count = dist[key];
                    if (count === 0) return null;
                    const pct = (count / total) * 100;
                    return (
                        <div
                            key={key}
                            className="relative group transition-all duration-300 hover:opacity-100 opacity-80"
                            style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: color }}
                            title={`${label}: ${count} markets (${pct.toFixed(0)}%)`}
                        >
                            {pct > 12 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-white drop-shadow-sm">{count}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                {VOLUME_LABELS.map(({ key, label, color }) => {
                    const count = dist[key];
                    if (count === 0) return null;
                    return (
                        <div key={key} className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                            <span className="text-[11px] text-zinc-400">{label}: {count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
