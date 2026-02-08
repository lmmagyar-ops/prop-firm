"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, TrendingUp, TrendingDown, DollarSign, Clock } from "lucide-react";

interface SessionEvent {
    time: string;
    type: "trade" | "profit" | "loss" | "login" | "logout";
    description: string;
    amount?: number;
}

export function SessionReplayTimeline() {
    const sessionEvents: SessionEvent[] = [
        { time: "09:00 AM", type: "login", description: "Session started" },
        { time: "09:15 AM", type: "trade", description: "Opened EUR/USD long position", amount: 5000 },
        { time: "09:42 AM", type: "profit", description: "Closed EUR/USD +$120", amount: 120 },
        { time: "10:05 AM", type: "trade", description: "Opened BTC/USD short position", amount: 8000 },
        { time: "10:38 AM", type: "loss", description: "Closed BTC/USD -$85", amount: -85 },
        { time: "11:12 AM", type: "trade", description: "Opened Gold long position", amount: 12000 },
        { time: "11:45 AM", type: "profit", description: "Closed Gold +$240", amount: 240 },
        { time: "12:30 PM", type: "trade", description: "Opened S&P 500 long position", amount: 15000 },
        { time: "01:15 PM", type: "loss", description: "Closed S&P 500 -$180", amount: -180 },
        { time: "02:00 PM", type: "logout", description: "Session ended" },
    ];

    const getEventIcon = (type: string) => {
        switch (type) {
            case "login":
                return <Play className="h-4 w-4 text-primary" />;
            case "logout":
                return <Clock className="h-4 w-4 text-zinc-500" />;
            case "trade":
                return <DollarSign className="h-4 w-4 text-amber-400" />;
            case "profit":
                return <TrendingUp className="h-4 w-4 text-emerald-400" />;
            case "loss":
                return <TrendingDown className="h-4 w-4 text-red-400" />;
            default:
                return null;
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case "login":
                return "border-primary/20 bg-primary/10";
            case "logout":
                return "border-zinc-500/20 bg-zinc-500/10";
            case "trade":
                return "border-amber-500/20 bg-amber-500/10";
            case "profit":
                return "border-emerald-500/20 bg-emerald-500/10";
            case "loss":
                return "border-red-500/20 bg-red-500/10";
            default:
                return "border-white/5 bg-zinc-800/30";
        }
    };

    const totalProfit = sessionEvents
        .filter(e => e.amount)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-medium text-zinc-200">Session Replay</CardTitle>
                        <CardDescription className="text-zinc-500">Chronological trading activity timeline</CardDescription>
                    </div>
                    <div className="text-right">
                        <div className={`text-xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {totalProfit >= 0 ? '+' : ''}${totalProfit}
                        </div>
                        <div className="text-xs text-zinc-500">Session P&L</div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-zinc-700 to-zinc-500" />

                    {/* Events */}
                    <div className="space-y-4">
                        {sessionEvents.map((event, idx) => (
                            <div key={idx} className="relative flex items-start gap-4">
                                {/* Timeline dot */}
                                <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full border-2 ${getEventColor(event.type)} flex items-center justify-center`}>
                                    {getEventIcon(event.type)}
                                </div>

                                {/* Event content */}
                                <div className="flex-1 pt-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-mono text-zinc-500">{event.time}</span>
                                        {event.amount && (
                                            <span className={`text-sm font-bold ${event.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {event.amount >= 0 ? '+' : ''}${Math.abs(event.amount)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-white">{event.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Session Summary */}
                <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-3 gap-3">
                    <div className="p-3 bg-zinc-800/30 border border-white/5 rounded-lg">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider">Duration</div>
                        <div className="text-lg font-bold text-white">5h</div>
                    </div>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="text-xs text-amber-400/70 uppercase tracking-wider">Trades</div>
                        <div className="text-lg font-bold text-amber-400">
                            {sessionEvents.filter(e => e.type === 'trade').length}
                        </div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <div className="text-xs text-emerald-400/70 uppercase tracking-wider">Win Rate</div>
                        <div className="text-lg font-bold text-emerald-400">50%</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
