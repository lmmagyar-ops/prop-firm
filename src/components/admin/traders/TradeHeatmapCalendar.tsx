"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export function TradeHeatmapCalendar() {
    // Generate calendar data for the last 12 weeks (84 days)
    const generateCalendarData = () => {
        const data = [];
        const today = new Date();

        for (let i = 83; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            // Simulate trade count (0-20 trades per day)
            const tradeCount = Math.floor(Math.random() * 21);

            data.push({
                date: date.toISOString().split('T')[0],
                count: tradeCount,
                day: date.getDay(),
                week: Math.floor(i / 7),
            });
        }

        return data;
    };

    const calendarData = generateCalendarData();

    const getColor = (count: number) => {
        if (count === 0) return "bg-zinc-800/30";
        if (count <= 5) return "bg-emerald-500/20";
        if (count <= 10) return "bg-emerald-500/40";
        if (count <= 15) return "bg-emerald-500/60";
        return "bg-emerald-500/80";
    };

    const getIntensityLabel = (count: number) => {
        if (count === 0) return "No trades";
        if (count <= 5) return "Low activity";
        if (count <= 10) return "Moderate";
        if (count <= 15) return "High activity";
        return "Very high";
    };

    // Group by weeks
    const weeks = [];
    for (let i = 0; i < 12; i++) {
        weeks.push(calendarData.filter(d => d.week === i));
    }

    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-emerald-400" />
                    Trade Activity Heatmap
                </CardTitle>
                <CardDescription className="text-zinc-500">Last 12 weeks of trading activity</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Calendar Grid */}
                    <div className="overflow-x-auto">
                        <div className="flex gap-1">
                            {/* Day labels */}
                            <div className="flex flex-col gap-1 mr-2">
                                <div className="h-3" /> {/* Spacer for alignment */}
                                {dayLabels.map((day, idx) => (
                                    <div key={day} className="h-3 text-[10px] text-zinc-500 flex items-center">
                                        {idx % 2 === 1 ? day : ''}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar cells */}
                            {weeks.map((week, weekIdx) => (
                                <div key={weekIdx} className="flex flex-col gap-1">
                                    {week.map((day) => (
                                        <div
                                            key={day.date}
                                            className={`h-3 w-3 rounded-sm ${getColor(day.count)} hover:ring-1 hover:ring-white/50 transition-all cursor-pointer group relative`}
                                            title={`${day.date}: ${day.count} trades - ${getIntensityLabel(day.count)}`}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="text-xs text-zinc-500">Less</div>
                        <div className="flex items-center gap-1">
                            <div className="h-3 w-3 rounded-sm bg-zinc-800/30" />
                            <div className="h-3 w-3 rounded-sm bg-emerald-500/20" />
                            <div className="h-3 w-3 rounded-sm bg-emerald-500/40" />
                            <div className="h-3 w-3 rounded-sm bg-emerald-500/60" />
                            <div className="h-3 w-3 rounded-sm bg-emerald-500/80" />
                        </div>
                        <div className="text-xs text-zinc-500">More</div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="p-3 bg-zinc-800/30 border border-white/5 rounded-lg">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider">Total Days</div>
                            <div className="text-lg font-bold text-white">84</div>
                        </div>
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <div className="text-xs text-emerald-400/70 uppercase tracking-wider">Active Days</div>
                            <div className="text-lg font-bold text-emerald-400">
                                {calendarData.filter(d => d.count > 0).length}
                            </div>
                        </div>
                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                            <div className="text-xs text-primary/70 uppercase tracking-wider">Avg/Day</div>
                            <div className="text-lg font-bold text-primary">
                                {(calendarData.reduce((sum, d) => sum + d.count, 0) / 84).toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
