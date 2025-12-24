"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { TradingModal } from "@/components/trading/TradingModal";
import { ProbabilityLineChart } from "@/components/trading/ProbabilityLineChart";
import { OrderBook } from "@/components/trading/OrderBook";
import { MarketHeader } from "@/components/trading/MarketHeader";
import { OutcomeRow } from "@/components/trading/OutcomeRow";
import { UnifiedTradePanel } from "@/components/trading/UnifiedTradePanel";

interface TradingWidgetProps {
    initialBalance: number;
    userId?: string;
    demoMode?: boolean;
    marketId?: string;
    open: boolean;
    onClose: () => void;
    question: string;
    volume: number;
    activeTraders: number;
}

export function TradingWidget({
    initialBalance,
    userId = "demo-user",
    demoMode = false,
    marketId = "32666",
    open,
    onClose,
    question,
    volume,
    activeTraders
}: TradingWidgetProps) {
    const [balance, setBalance] = useState(initialBalance);
    const [price, setPrice] = useState(0.56);
    const [position, setPosition] = useState<any>(null); // TODO: Type this properly

    // Mock Live Price Updates
    useEffect(() => {
        const interval = setInterval(() => {
            const change = (Math.random() - 0.5) * 0.005;
            const newPrice = Math.max(0.01, Math.min(0.99, price + change));
            setPrice(newPrice);
        }, 3000);
        return () => clearInterval(interval);
    }, [price]);

    // Sync balance prop if it changes
    useEffect(() => {
        setBalance(initialBalance);
    }, [initialBalance]);

    // Fetch Position
    const fetchPosition = async () => {
        try {
            const res = await fetch(`/api/trade/position?userId=${userId}&marketId=${marketId}`);
            if (res.ok) {
                const data = await res.json();
                setPosition(data.position);
            }
        } catch (e) {
            console.error("Failed to fetch position", e);
        }
    };

    useEffect(() => {
        if (open) {
            fetchPosition();
        }
    }, [open, userId, marketId]);

    const handleTrade = async (outcome: "YES" | "NO", amount: number) => {
        try {
            const res = await fetch("/api/trade/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    marketId,
                    outcome,
                    amount,
                }),
            });

            const data = await res.json();
            console.log("📊 Trade response:", data);

            if (data.success) {
                setBalance(prev => prev - amount);
                // Use position from response (no race condition!)
                if (data.position) {
                    console.log("✅ Setting position:", data.position);
                    setPosition(data.position);
                } else {
                    console.log("⚠️ No position data in response");
                }
            } else {
                console.error("Trade failed:", data.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Close Position Handler
    const handleClosePosition = async () => {
        console.log("🔴 CLOSE POSITION CLICKED", { position, userId });
        if (!position) return;

        try {
            const res = await fetch("/api/trade/close", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    positionId: position.id
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Update balance
                setBalance(parseFloat(data.newBalance));

                // Clear position (it's now closed)
                setPosition(null);

                // Optionally close the modal or show success message
                console.log("Position closed successfully");
            } else {
                console.error("Close position failed:", data.error);
            }
        } catch (err) {
            console.error("Close position error:", err);
        }
    };

    return (
        <TradingModal
            open={open}
            onClose={onClose}
            question={question}
            volume={volume}
            activeTraders={activeTraders}
        >
            <div className="flex flex-col lg:flex-row h-full bg-[#1A232E] text-foreground">
                {/* LEFT: 70% Width - Context & Chart */}
                <div className="flex-[3] border-b lg:border-b-0 lg:border-r border-[#2E3A52] p-6 flex flex-col relative overflow-hidden">
                    <MarketHeader
                        question={question}
                        volume={volume}
                        activeTraders={activeTraders}
                    />

                    {/* CHART CONTAINER - Flex 1 to fill available space */}
                    <div className="flex-1 relative min-h-[300px] mb-6 overflow-hidden group">
                        <div className="absolute inset-0 transition-transform duration-700">
                            <ProbabilityLineChart currentPrice={price} outcome="YES" />
                        </div>
                    </div>

                    <OutcomeRow
                        yesPrice={price}
                        noPrice={1 - price}
                        onSelect={(outcome) => console.log("Selected via OutcomeRow", outcome)}
                    />
                </div>

                {/* RIGHT: 30% Width - Trading Panel */}
                <div className="flex-1 lg:max-w-[420px] bg-sidebar p-6 flex flex-col shadow-2xl z-20 border-l border-border">
                    <div className="flex-1 min-h-0 relative">
                        <UnifiedTradePanel
                            yesPrice={price}
                            noPrice={1 - price}
                            balance={balance}
                            onTrade={handleTrade}
                            position={position}
                            onClosePosition={handleClosePosition}
                        />
                    </div>

                    <div className="mt-auto pt-6 border-t border-border/50">
                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                            <h4 className="text-[10px] font-bold text-blue-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider">
                                <TrendingUp className="w-3 h-3" />
                                Market Insight
                            </h4>
                            <p className="text-xs text-blue-200/50 leading-relaxed font-medium">
                                Trump's odds have surged 2.4% in the last hour following the new poll release. Volume is spiking.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </TradingModal>
    );
}
