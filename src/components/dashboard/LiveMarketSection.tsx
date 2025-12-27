"use client";

import { useState, useEffect } from "react";
import { TradingWidget } from "@/components/dashboard/TradingWidget";
import { TrendingUp, Users, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveMarkets } from "@/app/actions/market";

interface LiveMarketSectionProps {
    initialBalance: number;
    userId: string;
}

export function LiveMarketSection({ initialBalance, userId }: LiveMarketSectionProps) {
    const [isTradingOpen, setIsTradingOpen] = useState(false);
    const [markets, setMarkets] = useState<any[]>([]);
    const [selectedMarket, setSelectedMarket] = useState<any>(null);

    useEffect(() => {
        // Fetch active markets on mount
        getActiveMarkets().then(data => {
            if (data && data.length > 0) {
                setMarkets(data);
                // Default to first market if none selected? 
                // No, just load list.
            }
        });
    }, []);

    const handleOpenTrade = (market: any) => {
        setSelectedMarket(market);
        setIsTradingOpen(true);
    };

    if (markets.length === 0) {
        return (
            <div className="mt-8">
                <h2 className="text-xl font-bold text-white mb-4">Live Markets</h2>
                <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl">
                    <p className="text-zinc-500 animate-pulse">Connecting to Institutional Feed...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h2 className="text-xl font-bold text-white mb-4">Live Markets</h2>

            <div className="grid grid-cols-1 gap-4">
                {markets.map((market) => (
                    <div
                        key={market.id}
                        className="group relative overflow-hidden rounded-2xl bg-[#1A232E] border border-[#2E3A52] p-6 hover:border-[#2E81FF]/50 transition-all duration-300 cursor-pointer"
                        onClick={() => handleOpenTrade(market)}
                    >
                        {/* Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            {/* Market Info */}
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#2E81FF]/10 flex items-center justify-center text-[#2E81FF] shrink-0">
                                    {market.image ? (
                                        <img src={market.image} alt="icon" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <Activity className="w-6 h-6" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-lg font-bold text-white max-w-[300px] truncate" title={market.question}>
                                            {market.question}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-bold border border-[#10B981]/20">
                                            LIVE
                                        </span>
                                    </div>
                                    <p className="text-sm text-zinc-500 font-mono mt-1 line-clamp-1">{market.description}</p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-8 ml-auto">
                                <div className="text-right hidden sm:block">
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Volume</div>
                                    <div className="text-white font-mono font-bold">
                                        ${(market.volume || 0).toLocaleString()}
                                    </div>
                                </div>

                                {/* Action */}
                                <Button
                                    className="bg-[#2E81FF] hover:bg-[#256ACC] text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenTrade(market);
                                    }}
                                >
                                    Trade
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Trading Modal */}
            {selectedMarket && (
                <TradingWidget
                    key={selectedMarket.id} // Force re-mount when changing markets to ensure clean state
                    initialBalance={initialBalance}
                    userId={userId}
                    open={isTradingOpen}
                    onClose={() => setIsTradingOpen(false)}
                    marketId={selectedMarket.id}
                    question={selectedMarket.question}
                    volume={selectedMarket.volume}
                    activeTraders={Math.floor(Math.random() * 50) + 10} // Mock for now
                />
            )}
        </div>
    );
}
