
"use client";

import { useState, useEffect, useRef } from "react";
import { generateRecentActivity, type SimulatedTrade } from "@/lib/trading/activity-simulator";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export function RecentActivityFeed() {
    const [trades, setTrades] = useState<SimulatedTrade[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Initial load
        setTrades(generateRecentActivity(5));

        // Refresh every 15-30 seconds with a random delay to feel natural
        const scheduleNext = () => {
            const delay = 15000 + Math.random() * 15000;
            return setTimeout(() => {
                const newTrade = generateRecentActivity(1)[0];
                // Update timestamp to now to make it fresh
                newTrade.timestamp = new Date();

                setTrades(prev => [newTrade, ...prev].slice(0, 8)); // Keep last 8
                timerRef.current = scheduleNext();
            }, delay);
        };

        timerRef.current = scheduleNext();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return (
        <div className="bg-zinc-900/30 rounded-lg overflow-hidden border border-zinc-900/50">
            <div className="p-3 border-b border-zinc-800">
                <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Recent Trades</h3>
            </div>

            <div className="divide-y divide-zinc-800 max-h-[300px] overflow-y-auto">
                {trades.map((trade) => (
                    <div key={trade.id} className="p-3 hover:bg-white/[0.02] transition-colors animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    trade.outcome === 'YES' ? 'bg-green-500' : 'bg-red-500'
                                )} />
                                <span className="text-zinc-400 font-medium">{trade.username}</span>
                                <span className="text-zinc-600">{trade.action}</span>
                                <span className={cn(
                                    "font-bold",
                                    trade.outcome === 'YES' ? 'text-green-400' : 'text-red-400'
                                )}>
                                    {trade.outcome}
                                </span>
                            </div>
                            <span className="text-xs text-zinc-600 whitespace-nowrap ml-2">
                                {formatDistanceToNow(trade.timestamp, { addSuffix: true }).replace("less than a minute", "just now")}
                            </span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1 pl-4 flex justify-between items-center">
                            <span>{trade.shares.toLocaleString()} shares</span>
                            {trade.shares > 1000 && <span className="text-orange-500/50 text-[10px] font-bold uppercase tracking-wider">Whale</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
