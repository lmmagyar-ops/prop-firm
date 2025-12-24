"use client";

import { useState } from "react";
import { TradingWidget } from "@/components/dashboard/TradingWidget";
import { TrendingUp, Users, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LiveMarketSectionProps {
    initialBalance: number;
    userId: string;
}

export function LiveMarketSection({ initialBalance, userId }: LiveMarketSectionProps) {
    const [isTradingOpen, setIsTradingOpen] = useState(false);

    return (
        <div className="mt-8">
            <h2 className="text-xl font-bold text-white mb-4">Live Markets</h2>

            {/* Market Trigger Card */}
            <div
                className="group relative overflow-hidden rounded-2xl bg-[#1A232E] border border-[#2E3A52] p-6 hover:border-[#2E81FF]/50 transition-all duration-300 cursor-pointer"
                onClick={() => setIsTradingOpen(true)}
            >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    {/* Market Info */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#2E81FF]/10 flex items-center justify-center text-[#2E81FF]">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white">BTC/USD</h3>
                                <span className="px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-bold border border-[#10B981]/20">
                                    +2.4%
                                </span>
                            </div>
                            <p className="text-sm text-zinc-500 font-mono mt-1">Bitcoin / US Dollar</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-8">
                        <div className="text-right">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Volume</div>
                            <div className="text-white font-mono font-bold">$1.25M</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Traders</div>
                            <div className="text-white font-mono font-bold flex items-center justify-end gap-1">
                                <Users className="w-3 h-3 text-zinc-400" />
                                42
                            </div>
                        </div>
                    </div>

                    {/* Action */}
                    <Button
                        className="bg-[#2E81FF] hover:bg-[#256ACC] text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsTradingOpen(true);
                        }}
                    >
                        Trade
                    </Button>
                </div>
            </div>

            {/* Trading Modal */}
            <TradingWidget
                initialBalance={initialBalance}
                userId={userId}
                open={isTradingOpen}
                onClose={() => setIsTradingOpen(false)}
                question="BTC/USD"
                volume={1250000}
                activeTraders={42}
            />
        </div>
    );
}
