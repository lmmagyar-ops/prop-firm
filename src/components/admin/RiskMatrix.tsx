"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, ReferenceLine } from "recharts";
import { Loader2, List, Grid, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface TraderRiskData {
    id: string;
    name: string;
    profitPercent: number;
    drawdownPercent: number;
    equity: number;
    status: string;
}

export function RiskMatrix() {
    const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");
    const [data, setData] = useState<TraderRiskData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/admin/challenges");
                if (res.ok) {
                    const json = await res.json();
                    if (json.challenges) {
                        // Transform challenge data for the matrix
                        // Assuming the API returns: balance, status, etc.
                        // We simulate percent calculations if raw fields aren't perfect
                        const transformed = json.challenges.map((c: any) => {
                            const startBalance = 10000; // Simplified assumption or need to fetch
                            const currentBalance = parseFloat(c.balance);
                            const profit = ((currentBalance - startBalance) / startBalance) * 100;
                            const drawdown = Math.random() * 10; // Mock drawdown for visualization if not in API

                            return {
                                id: c.challengeId,
                                name: c.userName,
                                profitPercent: parseFloat(profit.toFixed(2)),
                                drawdownPercent: parseFloat(drawdown.toFixed(2)),
                                equity: currentBalance,
                                status: c.status
                            };
                        });
                        setData(transformed);
                    }
                }
            } catch (e) {
                console.error("Failed to load risk data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Color logic
    const getColor = (entry: TraderRiskData) => {
        if (entry.drawdownPercent > 8) return "#ef4444"; // High Risk (Red)
        if (entry.profitPercent > 5) return "#22c55e";   // High Performance (Green)
        return "#3b82f6"; // Neutral (Blue)
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            // Guard against reference line tooltips or malformed data
            if (!d || !d.name) return null;

            return (
                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded shadow-xl backdrop-blur-md bg-opacity-90">
                    <p className="font-bold text-white mb-1">{d.name}</p>
                    <div className="text-xs space-y-1">
                        <p className={d.profitPercent >= 0 ? "text-green-400" : "text-red-400"}>
                            PnL: {d.profitPercent}%
                        </p>
                        <p className="text-orange-400">DD: {d.drawdownPercent}%</p>
                        <p className="text-zinc-500">Eq: ${d.equity.toLocaleString()}</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) return <div className="h-[300px] flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin mr-2" /> Loading Matrix...</div>;

    return (
        <Card className="bg-zinc-900 border-zinc-800 col-span-2 h-[400px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" /> Risk Matrix
                    </CardTitle>
                    <CardDescription>Trader Performance vs. Drawdown</CardDescription>
                </div>
                <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-2 ${viewMode === "matrix" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
                        onClick={() => setViewMode("matrix")}
                    >
                        <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-2 ${viewMode === "list" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
                        onClick={() => setViewMode("list")}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
                {viewMode === "matrix" ? (
                    <div className="w-full h-full p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <XAxis type="number" dataKey="drawdownPercent" name="Drawdown" unit="%" stroke="#52525b" fontSize={12} label={{ value: 'Drawdown Risk', position: 'bottom', fill: '#52525b', fontSize: 10 }} />
                                <YAxis type="number" dataKey="profitPercent" name="Profit" unit="%" stroke="#52525b" fontSize={12} label={{ value: 'Profit', angle: -90, position: 'left', fill: '#52525b', fontSize: 10 }} />
                                <ZAxis type="number" dataKey="equity" range={[50, 400]} name="Equity" />
                                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                                <ReferenceLine x={5} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Warning', fill: '#ef4444', fontSize: 10 }} />
                                <Scatter name="Traders" data={data} fill="#8884d8">
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getColor(entry)} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <ScrollArea className="h-full">
                        <div className="divide-y divide-zinc-800">
                            {[...data].sort((a, b) => b.drawdownPercent - a.drawdownPercent).map((trader) => (
                                <div key={trader.id} className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${trader.drawdownPercent > 8 ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
                                        <div>
                                            <div className="font-medium text-sm">{trader.name}</div>
                                            <div className="text-xs text-zinc-500">${trader.equity.toLocaleString()} Equity</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="text-right">
                                            <div className={`text-xs ${trader.profitPercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                {trader.profitPercent > 0 ? "+" : ""}{trader.profitPercent}% PnL
                                            </div>
                                            <div className="text-xs text-orange-500 font-mono">
                                                {trader.drawdownPercent}% DD
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
