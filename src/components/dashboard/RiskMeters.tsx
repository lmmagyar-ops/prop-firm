"use client";

import CountUp from "@/components/reactbits/CountUp";
import SpotlightCard from "@/components/reactbits/SpotlightCard";

interface RiskMetersProps {
    drawdownUsage: number;
    dailyDrawdownUsage: number;
    startOfDayBalance: number;
    startingBalance: number;
    maxDrawdownPercent?: number;
    dailyDrawdownPercent?: number;
}

export function RiskMeters({
    drawdownUsage,
    dailyDrawdownUsage,
    startOfDayBalance,
    startingBalance,
    maxDrawdownPercent = 10,
    dailyDrawdownPercent = 5
}: RiskMetersProps) {
    // Round to 2dp to prevent CountUp from rendering 16+ floating-point decimals
    const drawdownRounded = Math.round(drawdownUsage * 100) / 100;
    const dailyDrawdownRounded = Math.round(dailyDrawdownUsage * 100) / 100;
    const maxDrawdownFloor = Math.round(startingBalance * (1 - maxDrawdownPercent / 100) * 100) / 100;
    const dailyLossFloor = Math.round(startOfDayBalance * (1 - dailyDrawdownPercent / 100) * 100) / 100;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Max Drawdown */}
            <SpotlightCard
                className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6"
                spotlightColor={drawdownRounded > 80 ? "rgba(239, 68, 68, 0.12)" : "rgba(0, 255, 178, 0.08)"}
                spotlightSize={350}
            >
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Max Drawdown</span>
                    <span className={`text-sm font-mono font-bold ${drawdownRounded > 80 ? 'text-red-500' : 'text-zinc-400'}`}>
                        <CountUp to={drawdownRounded} from={0} duration={1.5} suffix="%" />
                    </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div
                        className={`h-full transition-all duration-500 ${drawdownRounded > 80 ? 'bg-red-500' : 'bg-primary/50'}`}
                        style={{ width: `${Math.min(100, drawdownRounded)}%` }}
                    />
                </div>
                <div className="text-xs text-zinc-500 mt-1 font-mono">
                    Equity Floor: ${maxDrawdownFloor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </SpotlightCard>

            {/* Daily Drawdown */}
            <SpotlightCard
                className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6"
                spotlightColor={dailyDrawdownRounded > 80 ? "rgba(239, 68, 68, 0.12)" : "rgba(168, 85, 247, 0.1)"}
                spotlightSize={350}
            >
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Daily Loss Limit</span>
                    <span className={`text-sm font-mono font-bold ${dailyDrawdownRounded > 80 ? 'text-red-500' : 'text-zinc-400'}`}>
                        <CountUp to={dailyDrawdownRounded} from={0} duration={1.5} suffix="%" />
                    </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div
                        className={`h-full transition-all duration-500 ${dailyDrawdownRounded > 80 ? 'bg-red-500' : 'bg-purple-500'}`}
                        style={{ width: `${Math.min(100, dailyDrawdownRounded)}%` }}
                    />
                </div>
                <div className="text-xs text-zinc-500 mt-1 font-mono">
                    Today&apos;s Floor: ${dailyLossFloor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </SpotlightCard>
        </div>
    );
}
