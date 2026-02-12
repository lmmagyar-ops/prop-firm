"use client";

import { createChart, ColorType, ISeriesApi, AreaSeries } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';

interface ChartWidgetProps {
    data: { time: number; value: number }[];
    dataNo?: { time: number; value: number }[]; // Secondary / Comparison Data
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
        secondaryLineColor?: string;
        secondaryTopColor?: string;
    };
}

export const ChartWidget = (props: ChartWidgetProps) => {
    const {
        data,
        dataNo, // Extract dataNo from props
        colors: {
            backgroundColor = 'transparent',
            lineColor = '#22c55e', // Green-500
            textColor = '#52525b', // Zinc-600
            areaTopColor = 'rgba(34, 197, 94, 0.3)', // More visible top
            areaBottomColor = 'rgba(34, 197, 94, 0.0)', // Fade to transparent
            secondaryLineColor = '#ef4444', // Default Red
            secondaryTopColor = 'rgba(239, 68, 68, 0.1)',
        } = {},
    } = props;

    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartContainerRef.current) {
                // chart.applyOptions({ width: chartContainerRef.current.clientWidth });
                // v5 might handle this differently or instance needs to be accessible.
                // For React effect safety, we'll recreate or just ignore resize for MVP simplicity
                // or use a ResizeObserver in a real app.
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            localization: {
                priceFormatter: (p: number) => `${(p * 100).toFixed(1)}%`,
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { color: "#18181b", style: 1 },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: true,
            },
        });

        chart.timeScale().fitContent();

        // v5 API: addSeries(AreaSeries, options)
        const mainSeries = chart.addSeries(AreaSeries, {
            lineColor,
            topColor: areaTopColor,
            bottomColor: areaBottomColor,
            lineWidth: 2,
            priceFormat: {
                type: 'custom',
                formatter: (price: number) => `${(price * 100).toFixed(1)}%`,
            },
        });

        mainSeries.setData(data as unknown as import('lightweight-charts').AreaData[]);

        // --- BINARY MIRROR / COMPARISON LOGIC (Phase 3) ---
        if (dataNo) {
            const noSeries = chart.addSeries(AreaSeries, {
                lineColor: secondaryLineColor,
                topColor: secondaryTopColor,
                bottomColor: 'rgba(0, 0, 0, 0)',
                lineWidth: 2,
                priceFormat: {
                    type: 'custom',
                    formatter: (price: number) => `${(price * 100).toFixed(1)}%`,
                },
            });
            noSeries.setData(dataNo as unknown as import('lightweight-charts').AreaData[]);
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, dataNo, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor, secondaryLineColor, secondaryTopColor]);

    return (
        <div
            ref={chartContainerRef}
            className="w-full relative"
        />
    );
};
