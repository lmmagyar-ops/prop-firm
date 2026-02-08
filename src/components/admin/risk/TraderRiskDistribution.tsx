"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell } from "recharts";
import { Users } from "lucide-react";

export function TraderRiskDistribution() {
    // Trader risk data: drawdown vs position size
    const data = [
        { name: "Trader A", drawdown: 5, positionSize: 12000, riskScore: 3 },
        { name: "Trader B", drawdown: 15, positionSize: 8500, riskScore: 5 },
        { name: "Trader C", drawdown: 8, positionSize: 15000, riskScore: 4 },
        { name: "Trader D", drawdown: 22, positionSize: 18000, riskScore: 8 },
        { name: "Trader E", drawdown: 3, positionSize: 9000, riskScore: 2 },
        { name: "Trader F", drawdown: 12, positionSize: 22000, riskScore: 6 },
        { name: "Trader G", drawdown: 18, positionSize: 16000, riskScore: 7 },
        { name: "Trader H", drawdown: 6, positionSize: 11000, riskScore: 3 },
        { name: "Trader I", drawdown: 25, positionSize: 14000, riskScore: 9 },
        { name: "Trader J", drawdown: 9, positionSize: 13000, riskScore: 4 },
        { name: "Trader K", drawdown: 4, positionSize: 7500, riskScore: 2 },
        { name: "Trader L", drawdown: 20, positionSize: 19000, riskScore: 8 },
    ];

    const getColor = (riskScore: number) => {
        if (riskScore >= 8) return "#ef4444"; // Red
        if (riskScore >= 6) return "#f59e0b"; // Amber
        if (riskScore >= 4) return "#eab308"; // Yellow
        return "#22c55e"; // Green
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl">
                    <p className="text-sm font-medium text-white mb-2">{data.name}</p>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-zinc-400">Drawdown:</span>
                            <span className="text-sm font-bold text-red-400">{data.drawdown}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-zinc-400">Position Size:</span>
                            <span className="text-sm font-bold text-primary">${data.positionSize.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-zinc-400">Risk Score:</span>
                            <span className="text-sm font-bold text-amber-400">{data.riskScore}/10</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Trader Risk Distribution
                </CardTitle>
                <CardDescription className="text-zinc-500">Drawdown vs Position Size scatter plot</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis
                                type="number"
                                dataKey="drawdown"
                                name="Drawdown"
                                unit="%"
                                stroke="#71717a"
                                fontSize={12}
                                label={{ value: 'Drawdown (%)', position: 'insideBottom', offset: -10, fill: '#71717a' }}
                            />
                            <YAxis
                                type="number"
                                dataKey="positionSize"
                                name="Position Size"
                                stroke="#71717a"
                                fontSize={12}
                                tickFormatter={(value) => `$${value / 1000}k`}
                                label={{ value: 'Position Size', angle: -90, position: 'insideLeft', fill: '#71717a' }}
                            />
                            <ZAxis type="number" dataKey="riskScore" range={[50, 400]} />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Traders" data={data} fill="#8884d8">
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getColor(entry.riskScore)} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* Risk Zones */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <div className="text-xs text-emerald-400/70 uppercase tracking-wider">Safe Zone</div>
                        <div className="text-lg font-bold text-emerald-400">8 traders</div>
                    </div>
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="text-xs text-red-400/70 uppercase tracking-wider">High Risk</div>
                        <div className="text-lg font-bold text-red-400">4 traders</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
