"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight, ArrowDownRight, Activity, Loader2, Wifi, Zap } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface TradeActivity {
    id: string;
    traderName: string;
    marketId: string;
    side: "YES" | "NO";
    type: "BUY" | "SELL";
    amount: number;
    price: number;
    pnl: string | null; // Comes as decimal string from DB usually
    timestamp: string;
    phase: number;
}

export function LiveTraderFeed() {
    const [trades, setTrades] = useState<TradeActivity[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchActivity = async (isPolling = false) => {
        try {
            const res = await fetch("/api/admin/activity");
            if (!res.ok) throw new Error("Failed to fetch activity");
            const data = await res.json();
            if (data.trades) {
                setTrades(prev => {
                    // Simple dedup check if we wanted to be fancy, but replacing is fine for polling snapshot
                    // Or determining if there are new ones to toast.
                    // For now, just replace list.
                    return data.trades;
                });
            }
        } catch (error) {
            console.error("Feed Error:", error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    useEffect(() => {
        // Initial Fetch
        fetchActivity();

        // Polling Interval (5s)
        const interval = setInterval(() => {
            fetchActivity(true);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    if (loading && trades.length === 0) {
        return (
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md h-[400px]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-zinc-400" /> Live Feed
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px] text-zinc-500">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Initializing feed...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md h-[400px] flex flex-col relative overflow-hidden">
            {/* Wireless Pulse Effect */}
            <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-none z-10">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">LIVE FEED</span>
            </div>

            <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-zinc-100">
                    <div className="p-1.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                        <Wifi className="h-4 w-4 text-emerald-500" />
                    </div>
                    Global Trade Feed
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 relative">
                <ScrollArea className="h-full px-0">
                    <div className="divide-y divide-white/5">
                        {trades.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500">No trading activity yet.</div>
                        ) : (
                            <AnimatePresence initial={false} mode="popLayout">
                                {trades.map((trade) => (
                                    <motion.div
                                        key={trade.id}
                                        initial={{ opacity: 0, x: -20, backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                                        animate={{ opacity: 1, x: 0, backgroundColor: "rgba(0,0,0,0)" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-zinc-200">{trade.traderName}</span>
                                                <div className="flex items-center gap-1">
                                                    {trade.phase === 3 ? (
                                                        <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                            FUNDED
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-zinc-800 text-zinc-500">
                                                            P{trade.phase}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-xs text-zinc-400 flex items-center gap-1.5 font-mono">
                                                <span className={trade.type === 'BUY' ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                                    {trade.type}
                                                </span>
                                                <span className={trade.side === "YES" ? "text-white" : "text-zinc-500"}>
                                                    {trade.side}
                                                </span>
                                                <span className="text-zinc-600">@</span>
                                                <span className="text-zinc-300 max-w-[150px] truncate">{trade.marketId}</span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-sm font-mono font-medium text-white flex items-center justify-end gap-1">
                                                ${Number(trade.amount).toFixed(2)}
                                                <Zap className="h-3 w-3 text-zinc-600 group-hover:text-yellow-500 transition-colors" />
                                            </div>
                                            <div className="text-[10px] text-zinc-600">
                                                {formatDistanceToNow(new Date(trade.timestamp), { addSuffix: true })}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
