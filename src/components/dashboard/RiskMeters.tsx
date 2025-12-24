"use client";

interface RiskMetersProps {
    drawdownUsage: number;
    dailyDrawdownUsage: number;
    startOfDayBalance: number;
}

export function RiskMeters({ drawdownUsage, dailyDrawdownUsage, startOfDayBalance }: RiskMetersProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Max Drawdown */}
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Max Drawdown</span>
                    <span className={`text-sm font-mono font-bold ${drawdownUsage > 80 ? 'text-red-500' : 'text-zinc-400'}`}>
                        {drawdownUsage.toFixed(1)}%
                    </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div
                        className={`h-full transition-all duration-500 ${drawdownUsage > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, drawdownUsage)}%` }}
                    />
                </div>
                <div className="text-xs text-zinc-500 mt-1 font-mono">
                    Equity Floor: $9,000.00
                </div>
            </div>

            {/* Daily Drawdown */}
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Daily Loss Limit</span>
                    <span className={`text-sm font-mono font-bold ${dailyDrawdownUsage > 80 ? 'text-red-500' : 'text-zinc-400'}`}>
                        {dailyDrawdownUsage.toFixed(1)}%
                    </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div
                        className={`h-full transition-all duration-500 ${dailyDrawdownUsage > 80 ? 'bg-red-500' : 'bg-purple-500'}`}
                        style={{ width: `${Math.min(100, dailyDrawdownUsage)}%` }}
                    />
                </div>
                <div className="text-xs text-zinc-500 mt-1 font-mono">
                    Today's Floor: ${(startOfDayBalance * 0.95).toFixed(2)}
                </div>
            </div>
        </div>
    );
}
