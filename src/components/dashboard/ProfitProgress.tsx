"use client";

import CountUp from "@/components/reactbits/CountUp";

interface ProfitProgressProps {
    totalPnL: number;
    profitTarget: number;
    profitProgress: number;
    startingBalance: number;
}

export function ProfitProgress({ totalPnL, profitTarget, profitProgress, startingBalance }: ProfitProgressProps) {
    const clampedProgress = Math.max(0, profitProgress);

    return (
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 h-full flex flex-col justify-center">
            <div className="flex justify-between mb-4 items-end">
                <div>
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider block mb-1">Your Profit</span>
                    <span className="text-2xl font-mono text-white font-bold">
                        $<CountUp
                            to={Math.max(0, totalPnL)}
                            from={0}
                            duration={1.8}
                            className="text-2xl font-mono text-white font-bold"
                        />
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-xs text-zinc-500 block mb-0.5">Target</span>
                    <span className="text-sm font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">${(startingBalance + profitTarget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </div>

            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden mb-2 border border-white/5 relative">
                <div
                    className="h-full bg-gradient-to-r from-primary to-cyan-500 transition-all duration-1000 ease-out relative"
                    style={{ width: `${clampedProgress}%` }}
                >
                    {/* Pulsing glow overlay */}
                    {clampedProgress > 0 && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                    )}
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="text-xs text-zinc-500 font-mono">
                    <CountUp
                        to={clampedProgress}
                        from={0}
                        duration={1.8}
                        suffix="%"
                        className="text-xs text-zinc-500 font-mono"
                    />{" "}
                    Complete
                </div>
                {profitProgress >= 100 && (
                    <span className="text-xs font-bold text-green-500 px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">TARGET REACHED</span>
                )}
            </div>
        </div>
    );
}
