"use client";

import { useEquityPolling } from "@/hooks/useEquityPolling";
import { BigNumberDisplay } from "@/components/BigNumberDisplay";

interface LiveEquityDisplayProps {
    initialBalance: number;
    initialDailyPnL: number;
}

/**
 * LiveEquityDisplay - Self-updating equity display with 30s polling.
 * 
 * Wraps the equity display with live data from /api/user/balance.
 * Shows a subtle "LIVE" indicator when polling is active.
 * Falls back to initial server-rendered values on errors.
 */
export function LiveEquityDisplay({ initialBalance, initialDailyPnL }: LiveEquityDisplayProps) {
    const { equity, lastUpdated } = useEquityPolling(initialBalance);

    return (
        <div className="text-center p-8 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 rounded-2xl border border-white/5 h-full flex flex-col justify-center items-center relative">
            {/* Live indicator */}
            {lastUpdated && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-emerald-500/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                </div>
            )}

            <div className="text-sm text-zinc-400 mb-2 uppercase tracking-wider font-bold">Current Equity</div>
            <BigNumberDisplay value={equity} suffix="USD" className="text-5xl md:text-6xl font-black text-white" />
            <div className={`text-lg font-mono mt-4 font-bold ${initialDailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {initialDailyPnL >= 0 ? '+' : ''}${initialDailyPnL.toFixed(2)} Today
            </div>
        </div>
    );
}
