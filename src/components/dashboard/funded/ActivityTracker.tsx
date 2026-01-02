"use client";

import { Calendar, Activity, Clock, Zap } from "lucide-react";

interface ActivityTrackerProps {
    tradingDays: number;
    requiredDays: number;
    lastActivityAt: Date | null;
    payoutCycleStart: Date | null;
    platform: "polymarket" | "kalshi";
}

export function ActivityTracker({
    tradingDays,
    requiredDays,
    lastActivityAt,
    payoutCycleStart,
    platform,
}: ActivityTrackerProps) {
    const progressPercent = Math.min(100, (tradingDays / requiredDays) * 100);

    // Calculate days since last activity
    const daysSinceActivity = lastActivityAt
        ? Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    // Calculate cycle day
    const cycleDay = payoutCycleStart
        ? Math.floor((Date.now() - new Date(payoutCycleStart).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1;

    // Inactivity warning (30 day limit)
    const inactivityWarning = daysSinceActivity >= 20;
    const inactivityDanger = daysSinceActivity >= 25;

    const platformColors = platform === "polymarket"
        ? { primary: "amber", fill: "fill-amber-500", text: "text-amber-500", bg: "bg-amber-500" }
        : { primary: "violet", fill: "fill-violet-500", text: "text-violet-500", bg: "bg-violet-500" };

    // Generate last 14 days for mini calendar
    const last14Days = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (13 - i));
        return date;
    });

    return (
        <div className="bg-[#1A232E]/80 backdrop-blur-sm border border-[#2E3A52] rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${platformColors.bg}/10 flex items-center justify-center border border-${platformColors.primary}-500/30`}>
                        <Activity className={`w-5 h-5 ${platformColors.text}`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Activity Tracker</h3>
                        <p className="text-xs text-zinc-500">Cycle Day {cycleDay}</p>
                    </div>
                </div>

                {/* Trading Days Counter */}
                <div className="text-right">
                    <div className={`text-3xl font-mono font-bold ${platformColors.text}`}>
                        {tradingDays}<span className="text-zinc-500 text-xl">/{requiredDays}</span>
                    </div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider">Trading Days</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${platformColors.bg} rounded-full transition-all duration-500`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-zinc-500">
                    <span>Cycle Start</span>
                    <span className={progressPercent >= 100 ? 'text-green-500 font-semibold' : ''}>
                        {progressPercent >= 100 ? '✓ Requirement Met' : `${requiredDays - tradingDays} more days needed`}
                    </span>
                </div>
            </div>

            {/* Mini Calendar Heat Map */}
            <div className="mb-6">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Last 14 Days
                </div>
                <div className="flex gap-1">
                    {last14Days.map((date, i) => {
                        // Simulate activity (in reality, this would come from actual data)
                        const hasActivity = Math.random() > 0.6;
                        const isToday = i === 13;

                        return (
                            <div
                                key={i}
                                className={`flex-1 aspect-square rounded-sm transition-colors
                                    ${hasActivity
                                        ? `${platformColors.bg}`
                                        : 'bg-zinc-800'
                                    }
                                    ${isToday ? 'ring-2 ring-white/30' : ''}
                                `}
                                title={date.toLocaleDateString()}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-zinc-600">
                    <span>{last14Days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span>Today</span>
                </div>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-2 gap-4">
                {/* Last Activity */}
                <div className={`p-4 rounded-xl border ${inactivityDanger
                        ? 'bg-red-500/10 border-red-500/30'
                        : inactivityWarning
                            ? 'bg-yellow-500/10 border-yellow-500/30'
                            : 'bg-zinc-900/50 border-white/5'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                        <Clock className={`w-4 h-4 ${inactivityDanger ? 'text-red-500' :
                                inactivityWarning ? 'text-yellow-500' :
                                    'text-zinc-500'
                            }`} />
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">Last Activity</span>
                    </div>
                    <div className={`text-lg font-bold ${inactivityDanger ? 'text-red-500' :
                            inactivityWarning ? 'text-yellow-500' :
                                'text-white'
                        }`}>
                        {lastActivityAt
                            ? daysSinceActivity === 0
                                ? 'Today'
                                : `${daysSinceActivity}d ago`
                            : 'No trades yet'
                        }
                    </div>
                    {inactivityWarning && (
                        <div className="text-[10px] text-yellow-500 mt-1">
                            ⚠️ {30 - daysSinceActivity} days until termination
                        </div>
                    )}
                </div>

                {/* Session Status */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className={`w-4 h-4 ${platformColors.text}`} />
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">Session</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                        Active
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                        No time limit on funded
                    </div>
                </div>
            </div>
        </div>
    );
}
