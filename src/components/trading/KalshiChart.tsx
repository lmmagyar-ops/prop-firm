"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, Time, AreaSeriesPartialOptions, AreaSeries } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ChartDataPoint {
    time: string; // YYYY-MM-DD
    value: number; // 0.0 to 1.0
}

interface KalshiChartProps {
    data?: ChartDataPoint[];
    color?: string; // Hex color for the line (optional, defaults to green)
    height?: number;
    currentPrice?: number; // Optional: Sync chart end point to this price
}

export function KalshiChart({ data: initialData, color, height = 150, currentPrice }: KalshiChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [tooltipParams, setTooltipParams] = useState<{
        date: string;
        price: number;
        change: number;
    } | null>(null);

    // Mock data generator if no data provided
    // If currentPrice is provided, we force the LAST point to be currentPrice
    const chartData = initialData || (() => {
        const data: ChartDataPoint[] = [];
        let price = currentPrice !== undefined ? currentPrice : 0.50;

        // Generate backwards from currentPrice
        const now = new Date();
        const points = 30;

        // Create temporary array to unshift
        const tempPoints: number[] = [price]; // Start with current price at the END (which is index 0 of reverse generation)

        for (let i = 0; i < points; i++) {
            // Random walk backwards
            const change = (Math.random() - 0.5) * 0.10; // slightly less volatile
            price -= change;
            price = Math.max(0.01, Math.min(0.99, price));
            tempPoints.unshift(price);
        }

        // Force exact match on the last point (latest time)
        if (currentPrice !== undefined) {
            tempPoints[tempPoints.length - 1] = currentPrice;
        }

        tempPoints.forEach((val, i) => {
            const date = new Date(now);
            date.setDate(date.getDate() - (points - i));
            data.push({
                time: date.toISOString().split('T')[0],
                value: val
            });
        });

        return data;
    })();

    const startPrice = chartData[0]?.value || 0;
    const endPrice = chartData[chartData.length - 1]?.value || 0;
    const isPositive = endPrice >= startPrice;

    // Kalshi Colors
    const positiveColor = "#00C896"; // Green
    const negativeColor = "#E63E5D"; // Red/Pink
    const lineColor = color || (isPositive ? positiveColor : negativeColor);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#64748b', // Slate-500
            },
            width: chartContainerRef.current.clientWidth,
            height: height,
            grid: {
                vertLines: { visible: false },
                horzLines: { visible: false }, // Clean look
            },
            rightPriceScale: {
                visible: false, // Hide Y axis for clean look
                borderVisible: false,
            },
            timeScale: {
                visible: true,
                borderVisible: false,
                timeVisible: true,
            },
            crosshair: {
                vertLine: {
                    visible: true,
                    labelVisible: false,
                    style: 0, // Solid
                    width: 1,
                    color: '#94a3b8', // Slate-400
                },
                horzLine: {
                    visible: false,
                    labelVisible: false,
                },
            },
            handleScale: false, // Disable zoom for simple view
            handleScroll: false,
        });

        try {
            // lightweight-charts v5 API: use addSeries(SeriesType, options)
            const areaSeries = chart.addSeries(AreaSeries, {
                lineColor: lineColor,
                topColor: lineColor, // Solid at top
                bottomColor: 'rgba(255, 255, 255, 0)', // Transparent at bottom
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 4,
                crosshairMarkerBorderColor: '#ffffff',
                crosshairMarkerBackgroundColor: lineColor,
            });

            areaSeries.setData(chartData as any);
            chart.timeScale().fitContent();

            // Tooltip interaction
            chart.subscribeCrosshairMove((param) => {
                if (
                    param.point === undefined ||
                    !param.time ||
                    param.point.x < 0 ||
                    param.point.x > chartContainerRef.current!.clientWidth ||
                    param.point.y < 0 ||
                    param.point.y > height
                ) {
                    setTooltipParams(null);
                } else {
                    const dataPoint = param.seriesData.get(areaSeries) as { value: number; time: string };
                    if (dataPoint) {
                        const price = dataPoint.value;
                        const change = ((price - startPrice) / startPrice) * 100; // Change since start
                        setTooltipParams({
                            date: dataPoint.time.toString(), // Simplified date
                            price: price,
                            change: change
                        });
                    }
                }
            });

            chartRef.current = chart;



            const resizeObserver = new ResizeObserver((entries) => {
                if (entries.length === 0 || entries[0].target !== chartContainerRef.current) { return; }
                const newRect = entries[0].contentRect;
                chart.applyOptions({ width: newRect.width, height: newRect.height });
                chart.timeScale().fitContent();
            });

            resizeObserver.observe(chartContainerRef.current);

            return () => {
                resizeObserver.disconnect();
                chart.remove();
            };
        } catch (e) {
            console.error("KalshiChart: Error initializing chart", e);
        }
    }, [chartData, height, lineColor, startPrice]);

    // Derived display values (Tooltip or Current)
    const displayPrice = tooltipParams ? tooltipParams.price : endPrice;
    const displayChange = tooltipParams ? tooltipParams.change : ((endPrice - startPrice) / startPrice) * 100;
    const isChangePositive = displayChange >= 0;
    const displayDate = tooltipParams ? tooltipParams.date : "1D"; // Default to 1D view

    return (
        <div className="relative group">
            {/* Header Info Overlay */}
            <div className="absolute top-0 left-4 z-10 flex flex-col pointer-events-none">
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tabular-nums text-slate-900">
                        {Math.round(displayPrice * 100)}%
                    </span>
                    <span className={cn(
                        "text-sm font-semibold flex items-center",
                        isChangePositive ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {isChangePositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {Math.abs(displayChange).toFixed(1)}%
                    </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {displayDate}
                </div>
            </div>

            {/* Chart Container */}
            <div ref={chartContainerRef} className="w-full" style={{ height: height }} />
        </div>
    );
}
