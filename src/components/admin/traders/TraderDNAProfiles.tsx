"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Dices, Target, Bot, TrendingUp, Clock, DollarSign } from "lucide-react";

interface TraderProfile {
    id: string;
    name: string;
    email: string;
    dnaType: "gambler" | "sniper" | "bot";
    riskScore: number;
    totalTrades: number;
    winRate: number;
    avgHoldTime: string;
    profitLoss: number;
    accountBalance: number;
}

const mockTraders: TraderProfile[] = [
    {
        id: "1",
        name: "Alex Johnson",
        email: "alex@example.com",
        dnaType: "gambler",
        riskScore: 8.5,
        totalTrades: 342,
        winRate: 45,
        avgHoldTime: "12m",
        profitLoss: -2400,
        accountBalance: 47600,
    },
    {
        id: "2",
        name: "Sarah Chen",
        email: "sarah@example.com",
        dnaType: "sniper",
        riskScore: 3.2,
        totalTrades: 87,
        winRate: 68,
        avgHoldTime: "4h 23m",
        profitLoss: 5800,
        accountBalance: 55800,
    },
    {
        id: "3",
        name: "Mike Rodriguez",
        email: "mike@example.com",
        dnaType: "bot",
        riskScore: 2.1,
        totalTrades: 1247,
        winRate: 52,
        avgHoldTime: "3m",
        profitLoss: 1200,
        accountBalance: 51200,
    },
    {
        id: "4",
        name: "Emma Davis",
        email: "emma@example.com",
        dnaType: "sniper",
        riskScore: 4.5,
        totalTrades: 124,
        winRate: 61,
        avgHoldTime: "2h 15m",
        profitLoss: 3400,
        accountBalance: 53400,
    },
    {
        id: "5",
        name: "James Wilson",
        email: "james@example.com",
        dnaType: "gambler",
        riskScore: 9.2,
        totalTrades: 456,
        winRate: 42,
        avgHoldTime: "8m",
        profitLoss: -4200,
        accountBalance: 45800,
    },
];

export function TraderDNAProfiles() {
    const getDNABadge = (type: "gambler" | "sniper" | "bot") => {
        switch (type) {
            case "gambler":
                return {
                    icon: Dices,
                    label: "Gambler",
                    variant: "error" as const,
                    color: "bg-red-500/10 text-red-400 border-red-500/20",
                    description: "High frequency, high risk",
                };
            case "sniper":
                return {
                    icon: Target,
                    label: "Sniper",
                    variant: "success" as const,
                    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                    description: "Selective, high win rate",
                };
            case "bot":
                return {
                    icon: Bot,
                    label: "Bot",
                    variant: "info" as const,
                    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                    description: "Algorithmic patterns",
                };
        }
    };

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-zinc-200">Trader DNA Profiles</CardTitle>
                <CardDescription className="text-zinc-500">Behavioral classification and risk analysis</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {mockTraders.map((trader) => {
                        const dna = getDNABadge(trader.dnaType);
                        const DNAIcon = dna.icon;

                        return (
                            <div
                                key={trader.id}
                                className="p-4 bg-zinc-800/30 border border-white/5 rounded-lg hover:border-white/10 transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-sm font-medium text-white">{trader.name}</h3>
                                            <StatusBadge
                                                status={dna.label}
                                                variant={trader.dnaType === 'gambler' ? 'error' : trader.dnaType === 'sniper' ? 'success' : 'info'}
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-500">{trader.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-bold ${trader.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {trader.profitLoss >= 0 ? '+' : ''}${trader.profitLoss.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-zinc-500">P&L</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-white/5">
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">Trades</div>
                                        <div className="text-sm font-medium text-white">{trader.totalTrades}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">Win Rate</div>
                                        <div className={`text-sm font-medium ${trader.winRate >= 55 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                            {trader.winRate}%
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">Avg Hold</div>
                                        <div className="text-sm font-medium text-white">{trader.avgHoldTime}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">Risk Score</div>
                                        <div className={`text-sm font-medium ${trader.riskScore >= 7 ? 'text-red-400' :
                                            trader.riskScore >= 5 ? 'text-amber-400' :
                                                'text-emerald-400'
                                            }`}>
                                            {trader.riskScore.toFixed(1)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* DNA Type Legend */}
                <div className="mt-6 pt-4 border-t border-white/5">
                    <div className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">DNA Classifications</div>
                    <div className="grid grid-cols-3 gap-3">
                        {(["gambler", "sniper", "bot"] as const).map((type) => {
                            const dna = getDNABadge(type);
                            const DNAIcon = dna.icon;
                            return (
                                <div key={type} className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded ${dna.color}`}>
                                        <DNAIcon className="h-3 w-3" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-white">{dna.label}</div>
                                        <div className="text-[10px] text-zinc-500">{dna.description}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
