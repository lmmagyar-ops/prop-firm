"use client";

import { useEquityPolling } from "@/hooks/useEquityPolling";
import { BigNumberDisplay } from "@/components/BigNumberDisplay";
import SpotlightCard from "@/components/reactbits/SpotlightCard";

interface LiveEquityDisplayProps {
    initialBalance: number;
    initialDailyPnL: number | null;
}

/**
 * LiveEquityDisplay - Self-updating equity display with 30s polling.
 * Enhanced with SpotlightCard for premium cursor-following glow.
 * Anti-flicker: renders SSR value immediately, smooth-transitions on updates.
 */
export function LiveEquityDisplay({ initialBalance, initialDailyPnL }: LiveEquityDisplayProps) {
    const { equity, lastUpdated } = useEquityPolling(initialBalance);

    return (
        <SpotlightCard
            className="text-center p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-white/5 h-full flex flex-col justify-center items-center relative"
            spotlightColor="rgba(0, 255, 178, 0.12)"
            spotlightSize={500}
        >
            {/* Live indicator */}
            {lastUpdated && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-emerald-500/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                </div>
            )}

            <div className="text-sm text-zinc-400 mb-2 uppercase tracking-wider font-bold">Current Equity</div>
            <div className="transition-opacity duration-300">
                <BigNumberDisplay value={equity} className="text-5xl md:text-6xl font-medium text-white" />
            </div>
            <div className={`text-lg font-mono mt-4 font-bold transition-opacity duration-300 ${initialDailyPnL === null ? 'text-zinc-500' : initialDailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {initialDailyPnL === null
                    ? '— Today'
                    : `${initialDailyPnL >= 0 ? '+' : ''}$${initialDailyPnL.toFixed(2)} Today`
                }
            </div>
        </SpotlightCard>
    );
}

