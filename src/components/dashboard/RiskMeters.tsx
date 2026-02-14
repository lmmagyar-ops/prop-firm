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
    // New: absolute dollar context
    maxDrawdownDollars: number;
    dailyDrawdownDollars: number;
    // Raw dollar amounts used (avoids back-calculation rounding)
    drawdownUsedDollars?: number;
    dailyDrawdownUsedDollars?: number;
    equity: number;
}

/** 3-zone color: green (0-50), amber (50-80), red (80+) */
function getZone(usage: number) {
    if (usage >= 80) return { bar: "bg-red-500", text: "text-red-400", glow: "rgba(239, 68, 68, 0.12)", label: "DANGER" };
    if (usage >= 50) return { bar: "bg-amber-500", text: "text-amber-400", glow: "rgba(245, 158, 11, 0.10)", label: "CAUTION" };
    return { bar: "bg-emerald-500", text: "text-emerald-400", glow: "rgba(16, 185, 129, 0.08)", label: "SAFE" };
}

function fmt(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function RiskMeters({
    drawdownUsage,
    dailyDrawdownUsage,
    startOfDayBalance,
    startingBalance,
    maxDrawdownPercent = 10,
    dailyDrawdownPercent = 5,
    maxDrawdownDollars,
    dailyDrawdownDollars,
    drawdownUsedDollars: rawDdUsed,
    dailyDrawdownUsedDollars: rawDailyUsed,
    equity,
}: RiskMetersProps) {
    const drawdownRounded = Math.round(drawdownUsage * 100) / 100;
    const dailyDrawdownRounded = Math.round(dailyDrawdownUsage * 100) / 100;
    const maxDrawdownFloor = Math.round(startingBalance * (1 - maxDrawdownPercent / 100) * 100) / 100;
    const dailyLossFloor = Math.round(startOfDayBalance * (1 - dailyDrawdownPercent / 100) * 100) / 100;

    // Absolute dollars used — prefer raw values over back-calculated
    const ddUsedDollars = rawDdUsed != null ? rawDdUsed : Math.max(0, (drawdownRounded / 100) * maxDrawdownDollars);
    const dailyUsedDollars = rawDailyUsed != null ? rawDailyUsed : Math.max(0, (dailyDrawdownRounded / 100) * dailyDrawdownDollars);

    const ddZone = getZone(drawdownRounded);
    const dailyZone = getZone(dailyDrawdownRounded);

    return (
        <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Risk Monitor</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Max Drawdown */}
                <SpotlightCard
                    className="bg-zinc-900/50 border border-white/10 rounded-2xl p-5"
                    spotlightColor={ddZone.glow}
                    spotlightSize={350}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Max Drawdown</span>
                            <div className={`text-xs mt-0.5 font-semibold ${ddZone.text}`}>{ddZone.label}</div>
                        </div>
                        <span className={`text-lg font-mono font-bold ${ddZone.text}`}>
                            <CountUp to={drawdownRounded} from={0} duration={1.5} suffix="%" />
                        </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                        <div
                            className={`h-full transition-all duration-700 rounded-full ${ddZone.bar}`}
                            style={{ width: `${Math.min(100, drawdownRounded)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500 font-mono">
                        <span>${fmt(ddUsedDollars)} / ${fmt(maxDrawdownDollars)}</span>
                    </div>
                    <div className="text-xs text-zinc-600 mt-1 font-mono">
                        Floor: ${fmt(maxDrawdownFloor)}
                    </div>
                </SpotlightCard>

                {/* Daily Loss */}
                <SpotlightCard
                    className="bg-zinc-900/50 border border-white/10 rounded-2xl p-5"
                    spotlightColor={dailyZone.glow}
                    spotlightSize={350}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Daily Loss</span>
                            <div className={`text-xs mt-0.5 font-semibold ${dailyZone.text}`}>{dailyZone.label}</div>
                        </div>
                        <span className={`text-lg font-mono font-bold ${dailyZone.text}`}>
                            <CountUp to={dailyDrawdownRounded} from={0} duration={1.5} suffix="%" />
                        </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                        <div
                            className={`h-full transition-all duration-700 rounded-full ${dailyZone.bar}`}
                            style={{ width: `${Math.min(100, dailyDrawdownRounded)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500 font-mono">
                        <span>${fmt(dailyUsedDollars)} / ${fmt(dailyDrawdownDollars)}</span>
                    </div>
                    <div className="text-xs text-zinc-600 mt-1 font-mono">
                        Today&apos;s Floor: ${fmt(dailyLossFloor)}
                    </div>
                </SpotlightCard>
            </div>
        </div>
    );
}

