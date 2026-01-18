"use client";

interface ProfitProgressProps {
    totalPnL: number;
    profitTarget: number;
    profitProgress: number;
}

export function ProfitProgress({ totalPnL, profitTarget, profitProgress }: ProfitProgressProps) {
    return (
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 h-full flex flex-col justify-center">
            <div className="flex justify-between mb-4 items-end">
                <div>
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider block mb-1">Your Profit</span>
                    <span className="text-2xl font-mono text-white font-bold">${Math.max(0, totalPnL).toFixed(2)}</span>
                </div>
                <div className="text-right">
                    <span className="text-xs text-zinc-500 block mb-0.5">Target</span>
                    <span className="text-sm font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">${profitTarget.toFixed(2)}</span>
                </div>
            </div>

            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden mb-2 border border-white/5">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.max(0, profitProgress)}%` }}
                />
            </div>

            <div className="flex justify-between items-center">
                <div className="text-xs text-zinc-500 font-mono">{Math.max(0, profitProgress).toFixed(1)}% Complete</div>
                {profitProgress >= 100 && (
                    <span className="text-xs font-bold text-green-500 px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">TARGET REACHED</span>
                )}
            </div>
        </div>
    );
}
