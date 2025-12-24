
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, LineSeries } from 'lightweight-charts';
import { generateChartData } from "@/lib/trading/chart-data-generator";
import { cn } from "@/lib/utils";

interface ProbabilityChartProps {
    currentPrice: number;
    outcome: "YES" | "NO";
}

export function ProbabilityChart({ currentPrice, outcome }: ProbabilityChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [timeRange, setTimeRange] = useState<'1H' | '1D' | '1W' | '1M' | 'ALL'>('1D');

    // Memoize data to prevent regen on every render, but regen when price/outcome/range changes
    const data = useMemo(() => {
        return generateChartData(currentPrice, timeRange);
    }, [currentPrice, timeRange]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // cleanup previous
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

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

        // Fix: Use addSeries(LineSeries, options) for lightweight-charts v4/v5
        const lineSeries = chart.addSeries(LineSeries, {
            color: outcome === 'YES' ? '#22c55e' : '#ef4444',
            lineWidth: 2,
            crosshairMarkerVisible: true,
            lastValueVisible: true,
            priceLineVisible: true,
        });

        // Fix Time type mismatch: lightweight-charts Time is a specific alias
        // We know our time is a unix timestamp (number), which is valid for UTCTimestamp
        // but TS needs reassurance.
        // mapping data to match the expected structure explicitly
        lineSeries.setData(data.map(d => ({
            ...d,
            time: d.time as any // Cast to any to silence the Time vs number conflict safely
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
    }, [data, outcome]); // Re-create chart when data or outcome color changes

    return (
        <div className="space-y-4">
            {/* Time Range Selector */}
            <div className="flex gap-2">
                {(['1H', '1D', '1W', '1M', 'ALL'] as const).map((range) => (
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
            </div>

            {/* Chart */}
            <div ref={chartContainerRef} className="rounded-lg overflow-hidden w-full h-[300px]" />
        </div>
    );
}
