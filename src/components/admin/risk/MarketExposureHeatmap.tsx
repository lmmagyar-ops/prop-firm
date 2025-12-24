"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle } from "lucide-react";

export function MarketExposureHeatmap() {
    // Market exposure data organized hierarchically
    const data = [
        {
            name: "Markets",
            children: [
                {
                    name: "Forex",
                    children: [
                        { name: "EUR/USD", size: 45000, exposure: "high" },
                        { name: "GBP/USD", size: 32000, exposure: "medium" },
                        { name: "USD/JPY", size: 28000, exposure: "medium" },
                    ],
                },
                {
                    name: "Indices",
                    children: [
                        { name: "S&P 500", size: 52000, exposure: "high" },
                        { name: "NASDAQ", size: 38000, exposure: "high" },
                        { name: "DAX", size: 22000, exposure: "low" },
                    ],
                },
                {
                    name: "Commodities",
                    children: [
                        { name: "Gold", size: 35000, exposure: "medium" },
                        { name: "Oil", size: 41000, exposure: "high" },
                        { name: "Silver", size: 18000, exposure: "low" },
                    ],
                },
                {
                    name: "Crypto",
                    children: [
                        { name: "BTC/USD", size: 48000, exposure: "high" },
                        { name: "ETH/USD", size: 29000, exposure: "medium" },
                    ],
                },
            ],
        },
    ];

    const COLORS: Record<string, string> = {
        high: "#ef4444",      // Red
        medium: "#f59e0b",    // Amber
        low: "#22c55e",       // Green
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            if (data.size) {
                return (
                    <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl">
                        <p className="text-sm font-medium text-white">{data.name}</p>
                        <p className="text-lg font-bold text-emerald-400">
                            ${data.size.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: COLORS[data.exposure] }}
                            />
                            <span className="text-xs text-zinc-400 capitalize">
                                {data.exposure} Risk
                            </span>
                        </div>
                    </div>
                );
            }
        }
        return null;
    };

    const CustomContent = (props: any) => {
        const { x, y, width, height, name, size, exposure } = props;

        if (!size) return null;

        const color = COLORS[exposure] || "#71717a";

        return (
            <g>
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                        fill: color,
                        stroke: "#18181b",
                        strokeWidth: 2,
                        opacity: 0.8,
                    }}
                    className="transition-opacity hover:opacity-100"
                />
                {width > 60 && height > 40 && (
                    <>
                        <text
                            x={x + width / 2}
                            y={y + height / 2 - 8}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={12}
                            fontWeight="600"
                        >
                            {name}
                        </text>
                        <text
                            x={x + width / 2}
                            y={y + height / 2 + 8}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={10}
                            opacity={0.8}
                        >
                            ${(size / 1000).toFixed(0)}k
                        </text>
                    </>
                )}
            </g>
        );
    };

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-medium text-zinc-200">Market Exposure</CardTitle>
                        <CardDescription className="text-zinc-500">Real-time exposure by asset class</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-sm font-medium text-red-400">High Concentration</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                            data={data}
                            dataKey="size"
                            stroke="#18181b"
                            fill="#8884d8"
                            content={<CustomContent />}
                        >
                            <Tooltip content={<CustomTooltip />} />
                        </Treemap>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-red-500" />
                        <span className="text-xs text-zinc-400">High Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-amber-500" />
                        <span className="text-xs text-zinc-400">Medium Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                        <span className="text-xs text-zinc-400">Low Risk</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
