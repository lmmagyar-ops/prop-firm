
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, IChartApi, LineSeries } from 'lightweight-charts';
import { getPriceHistory, type PriceHistoryPoint } from "@/app/actions/price-history";
import { cn } from "@/lib/utils";

interface ProbabilityChartProps {
    tokenId?: string;
    currentPrice: number;
    outcome: "YES" | "NO";
}

type TimeRange = '1W' | '1M' | '3M' | 'ALL';

/**
 * ProbabilityChart — Displays REAL price history from Polymarket CLOB.
 *
 * Uses the prices-history endpoint (daily granularity) and filters
 * the data based on the selected time range. Falls back to a flat
 * line at currentPrice if no historical data is available.
 */
export function ProbabilityChart({ tokenId, currentPrice, outcome }: ProbabilityChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>('1M');
    const [allHistory, setAllHistory] = useState<PriceHistoryPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch price history once on mount (daily data, cached 5min server-side)
    useEffect(() => {
        // No token ID = no real data to fetch (e.g. dashboard mini-chart)
        if (!tokenId) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function fetchHistory() {
            setLoading(true);
            setError(null);

            try {
                const result = await getPriceHistory(tokenId!);
                if (cancelled) return;

                if (result.error && result.history.length === 0) {
                    setError(result.error);
                }
                setAllHistory(result.history);
            } catch {
                if (!cancelled) setError("Failed to load chart data");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchHistory();
        return () => { cancelled = true; };
    }, [tokenId]);

    // Filter history by time range
    const getFilteredData = useCallback(() => {
        if (allHistory.length === 0) {
            // No history — create a flat line at currentPrice over the last 30 days
            const now = Math.floor(Date.now() / 1000);
            const points = [];
            for (let i = 30; i >= 0; i--) {
                points.push({ time: now - i * 86400, value: currentPrice });
            }
            return points;
        }

        const now = Math.floor(Date.now() / 1000);
        let cutoffTime: number;

        switch (timeRange) {
            case '1W':
                cutoffTime = now - 7 * 86400;
                break;
            case '1M':
                cutoffTime = now - 30 * 86400;
                break;
            case '3M':
                cutoffTime = now - 90 * 86400;
                break;
            case 'ALL':
            default:
                cutoffTime = 0;
                break;
        }

        const filtered = allHistory
            .filter(point => point.t >= cutoffTime)
            .map(point => ({ time: point.t, value: point.p }));

        // If filtering left too few points, show all data
        if (filtered.length < 2) {
            return allHistory.map(point => ({ time: point.t, value: point.p }));
        }

        return filtered;
    }, [allHistory, timeRange, currentPrice]);

    // Render chart
    useEffect(() => {
        if (!chartContainerRef.current || loading) return;

        // Cleanup previous chart
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const data = getFilteredData();
        if (data.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#71717a',
                fontFamily: "Inter, sans-serif",
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderVisible: false,
            },
            rightPriceScale: {
                visible: true,
                borderVisible: false,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            localization: {
                priceFormatter: (price: number) => `${(price * 100).toFixed(1)}%`,
            },
            crosshair: {
                vertLine: {
                    labelBackgroundColor: '#27272a',
                },
                horzLine: {
                    labelBackgroundColor: '#27272a',
                }
            }
        });

        chartRef.current = chart;

        const lineColor = outcome === 'YES' ? '#22c55e' : '#ef4444';
        const lineSeries = chart.addSeries(LineSeries, {
            color: lineColor,
            lineWidth: 2,
            crosshairMarkerVisible: true,
            lastValueVisible: true,
            priceLineVisible: true,
        });

        // Cast time to satisfy lightweight-charts Time type
        lineSeries.setData(data.map(d => ({
            ...d,
            time: d.time as any
        })));
        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [loading, getFilteredData, outcome]);

    return (
        <div className="space-y-4">
            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
                {(['1W', '1M', '3M', 'ALL'] as const).map((range) => (
                    <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={cn(
                            "px-3 py-1 text-xs font-bold rounded-lg transition-colors",
                            timeRange === range
                                ? "bg-zinc-800 text-white"
                                : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
                        )}
                    >
                        {range}
                    </button>
                ))}

                {/* Live indicator */}
                {!loading && !error && allHistory.length > 0 && (
                    <span className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE DATA
                    </span>
                )}
            </div>

            {/* Chart container */}
            <div className="relative">
                {loading && (
                    <div className="flex items-center justify-center h-[300px] text-zinc-500 text-sm">
                        <div className="animate-spin w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full mr-2" />
                        Loading chart…
                    </div>
                )}

                {error && allHistory.length === 0 && !loading && (
                    <div className="flex items-center justify-center h-[300px] text-zinc-500 text-xs">
                        No price history available for this market
                    </div>
                )}

                <div
                    ref={chartContainerRef}
                    className={cn(
                        "rounded-lg overflow-hidden w-full h-[300px]",
                        loading && "hidden"
                    )}
                />
            </div>
        </div>
    );
}
