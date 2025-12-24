"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ReferenceLine, ReferenceArea, Cell } from "recharts";
import { Siren, Zap, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

// Mock Data: 
// 12:00:00.000 -> News Event
// Trades happening around it.
const timeBase = new Date().setHours(12, 0, 0, 0);

const trades = [
    { id: 1, time: timeBase - 500, price: 0.45, type: "Clean", trader: "User_A" },
    { id: 2, time: timeBase - 200, price: 0.46, type: "Clean", trader: "User_B" },
    // News Drop at 0
    { id: 3, time: timeBase + 50, price: 0.46, type: "Toxic", trader: "Bot_X" },   // 50ms latency (L-Arb)
    { id: 4, time: timeBase + 120, price: 0.46, type: "Toxic", trader: "Bot_Y" },  // 120ms latency
    { id: 5, time: timeBase + 800, price: 0.55, type: "Clean", trader: "User_C" }, // 800ms - price corrected
    { id: 6, time: timeBase + 1500, price: 0.58, type: "Clean", trader: "User_D" },
];

export function ArbitrageScanner() {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const diff = data.time - timeBase;
            return (
                <div className="bg-zinc-950/90 border border-zinc-800 p-3 rounded-lg text-xs shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
                    <p className="font-bold text-white mb-1">{data.trader}</p>
                    <div className="flex justify-between gap-4 text-zinc-400">
                        <span>Offset</span>
                        <span className="font-mono text-white">{diff > 0 ? `+${diff}ms` : `${diff}ms`}</span>
                    </div>
                    <div className="flex justify-between gap-4 mt-1">
                        <span>Status</span>
                        <span className={`font-bold ${data.type === "Toxic" ? "text-red-500" : "text-green-500"}`}>
                            {data.type}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="bg-zinc-900/40 border-white/5 shadow-2xl backdrop-blur-md overflow-hidden relative group">
            {/* Red Kill Zone Glow */}
            <div className="absolute top-0 left-[33%] w-1/3 h-full bg-red-500/5 blur-3xl -z-10 pointer-events-none" />

            <CardHeader className="border-b border-white/5 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-zinc-100">
                            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                                <Siren className="h-5 w-5 text-red-500 animate-pulse" />
                            </div>
                            Latency Arbitrage Scanner
                        </CardTitle>
                        <CardDescription className="mt-1 text-zinc-500">
                            Detecting <span className="text-red-400 font-medium">Toxic Flow</span> execution &lt;500ms post-news.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                            <Zap className="h-3 w-3" /> KILL ZONE ACTIVE
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="h-[500px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                            <XAxis
                                type="number"
                                dataKey="time"
                                name="Time"
                                domain={[timeBase - 800, timeBase + 1200]} // Zoomed in window
                                tickFormatter={(unixTime) => format(unixTime, "ss.SSS")}
                                stroke="#52525b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                type="number"
                                dataKey="price"
                                name="Price"
                                domain={[0.4, 0.6]}
                                stroke="#52525b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                                tickFormatter={(val) => `$${val.toFixed(2)}`}
                            />
                            <ZAxis type="number" range={[60, 400]} />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />

                            {/* The News Event Line */}
                            <ReferenceLine x={timeBase} stroke="#fff" strokeWidth={2} label={{ value: "NEWS EVENT (T-0)", fill: "#fff", position: 'insideTopLeft', fontSize: 10, fillOpacity: 0.5 }} />

                            {/* Kill Zone (0 to 500ms) */}
                            <ReferenceArea x1={timeBase} x2={timeBase + 500} fill="url(#killZoneGradient)" fillOpacity={0.15} />

                            <defs>
                                <linearGradient id="killZoneGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>

                            <Scatter name="Trades" data={trades} shape="circle">
                                {trades.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.type === "Toxic" ? "#ef4444" : "#22c55e"}
                                        stroke={entry.type === "Toxic" ? "#7f1d1d" : "#14532d"}
                                        strokeWidth={1}
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
