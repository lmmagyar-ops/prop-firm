"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { TradingModal } from "@/components/trading/TradingModal";
import { useSelectedChallengeContext } from "@/contexts/SelectedChallengeContext";
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
    const [position, setPosition] = useState<any>(null);
    const [isLive, setIsLive] = useState(false);
    const [currentMarketId, setCurrentMarketId] = useState(marketId);

    // Get selected challenge from context
    const { selectedChallengeId } = useSelectedChallengeContext();

    // WebSocket for Live Price Updates
    // DISABLED: Not available on Vercel serverless
    // TODO: Re-enable when WS server is deployed
    /*
    useEffect(() => {
        if (!open) return; // Only connect when modal is open

        let ws: WebSocket;
        let reconnectTimeout: NodeJS.Timeout;

        const connectWebSocket = () => {
            try {
                ws = new WebSocket("ws://localhost:3001");

                ws.onopen = () => {
                    console.log("🟢 TradingWidget connected to price feed");
                    setIsLive(true);
                };

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        if (payload.price && payload.asset_id) {
                            setPrice(parseFloat(payload.price));
                            setCurrentMarketId(payload.asset_id);
                        }
                    } catch (e) {
                        console.error("WS parse error", e);
                    }
                };

                ws.onerror = (error) => {
                    console.error("WS error:", error);
                    setIsLive(false);
                };

                ws.onclose = () => {
                    console.log("🔴 TradingWidget disconnected");
                    setIsLive(false);
                    // Attempt reconnect after 3 seconds
                    reconnectTimeout = setTimeout(connectWebSocket, 3000);
                };
            } catch (e) {
                console.error("Failed to connect to WebSocket", e);
            }
        };

        connectWebSocket();

        return () => {
            clearTimeout(reconnectTimeout);
            if (ws) ws.close();
        };
    }, [open]);
    */

    // Fallback: Simulated price updates when WebSocket is not connected
    useEffect(() => {
        if (isLive || !open) return;

        const interval = setInterval(() => {
            const change = (Math.random() - 0.5) * 0.005;
            const newPrice = Math.max(0.01, Math.min(0.99, price + change));
            setPrice(newPrice);
        }, 3000);

        return () => clearInterval(interval);
    }, [price, isLive, open]);

    // Sync balance prop if it changes
    useEffect(() => {
        setBalance(initialBalance);
    }, [initialBalance]);

    // Fetch Position on Mount
    useEffect(() => {
        const fetchPosition = async () => {
            try {
                const res = await fetch(`/api/trade/position?userId=${userId}&marketId=${currentMarketId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.position) {
                        console.log("📦 Fetched position:", data.position);
                        setPosition(data.position);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch position", e);
            }
        };

        if (open) {
            fetchPosition();
        }
    }, [open, userId, currentMarketId]);

    const handleTrade = async (outcome: "YES" | "NO", amount: number) => {
        if (!selectedChallengeId) {
            console.error("No challenge selected");
            return;
        }

        try {
            const res = await fetch("/api/trade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    challengeId: selectedChallengeId,
                    marketId: currentMarketId,
                    side: outcome === "YES" ? "BUY" : "SELL",
                    amount,
                }),
            });

            const data = await res.json();
            console.log("📊 Trade response:", data);

            if (data.success) {
                setBalance(prev => prev - amount);
                if (data.position) {
                    console.log("✅ Setting position:", data.position);
                    setPosition(data.position);
                } else {
                    console.log("⚠️ No position data in response");
                }

                // Check if challenge status changed
                if (data.challengeStatus && data.challengeStatus !== 'active') {
                    console.log(`🚨 Challenge ${data.challengeStatus} !`);
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            } else {
                console.error("Trade failed:", data.error);

                // Better error messaging for closed markets
                if (data.error && data.error.includes("closed or halted")) {
                    alert("⚠️ This market is no longer accepting trades.\n\nPlease try a different market from the list.");
                    onClose(); // Close the modal
                } else {
                    alert(`Trade failed: ${data.error} `);
                }
            }
        } catch (err) {
            console.error(err);
            alert("Trade execution error. Check console.");
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
                setBalance(parseFloat(data.newBalance));
                setPosition(null);
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

                    {/* Live Feed Indicator */}
                    {isLive && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full z-10">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Live Feed</span>
                        </div>
                    )}

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
                                {isLive ? "Connected to live market data feed." : "Using simulated market data."}
                            </p>
                        </div>
                    </div>
                </div>
            </div >
        </TradingModal >
    );
}
