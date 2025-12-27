"use client";

import { BigNumberDisplay } from "@/components/BigNumberDisplay";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, Clock, Target, Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MobileNav } from "@/components/MobileNav";
import { MissionTracker } from "@/components/dashboard/MissionTracker";
import { useSelectedChallengeContext } from "@/contexts/SelectedChallengeContext";
import { MarketTicker } from "@/components/MarketTicker";
import { OpenPositions } from "./OpenPositions";

// New Trading Components
import { TradingModal } from "@/components/trading/TradingModal";
import { UnifiedTradePanel } from "@/components/trading/UnifiedTradePanel";
import { ProbabilityChart } from "@/components/trading/ProbabilityChart";
import { OrderBook } from "@/components/trading/OrderBook";
import { RecentActivityFeed } from "@/components/trading/RecentActivityFeed";

import { ChallengeFailedModal } from "@/components/dashboard/ChallengeFailedModal";
import { ChallengePassedModal } from "@/components/dashboard/ChallengePassedModal";
import { DevTools } from "@/components/dashboard/DevTools";

// Use Chart Data Generator directly for mock price simulation
import { generateChartData } from "@/lib/trading/chart-data-generator";

interface DashboardViewProps {
    initialBalance?: number | null;
    demoMode?: boolean;
    userId?: string;
    challengeHistory?: any[]; // Passed from server
}

export function DashboardView({ initialBalance = null, demoMode = false, userId = "demo-user-1", challengeHistory = [] }: DashboardViewProps) {
    const [balance, setBalance] = useState<number | null>(initialBalance);
    const [price, setPrice] = useState(0.56);

    // Get selected challenge from context
    const { selectedChallengeId } = useSelectedChallengeContext();

    // Outcome Modals Logic
    // We check the latest challenge in history. If it ended recently (or we just want to show it on load if not acknowledged)
    // For MVP, if !activeChallenge and latest is FAILED/PASSED, show modal.
    // In a real app we'd track "acknowledged" state in DB or local storage.
    const latestChallenge = challengeHistory && challengeHistory.length > 0 ? challengeHistory[0] : null;
    const [showFailedModal, setShowFailedModal] = useState(false);
    const [showPassedModal, setShowPassedModal] = useState(false);

    useEffect(() => {
        // Only show if we are NOT in an active challenge (balance is null usually implies no active challenge in this component's logic, 
        // but strictly we should rely on a prop. For now, if we have history and it's failed/passed and we are "locked", show it.
        // Actually, initialBalance being null is our "Locked" state trigger in the parent page? 
        // Wait, parent passes `initialBalance = { activeChallenge?.currentBalance }`. So if null, no active challenge.

        if (initialBalance === null && latestChallenge) {
            if (latestChallenge.status === 'failed') {
                setShowFailedModal(true);
            } else if (latestChallenge.status === 'passed') {
                setShowPassedModal(true);
            }
        }
    }, [initialBalance, latestChallenge]);


    // State for Dynamic Market Info
    // Default to "Simulated" mode so the user sees immediate action
    const [marketInfo, setMarketInfo] = useState({
        id: "simulated-btc",
        title: "BTC/USD (Perpetual)",
        volume: "$1.2B",
        category: "CRYPTO"
    });

    // Trading Modal State
    const [isTradingModalOpen, setIsTradingModalOpen] = useState(false);

    // Derived states
    const currentEquity = balance || 10000;

    const MAX_DRAWDOWN = 10000 * 0.10;
    const drawdownAmount = 10000 - currentEquity;
    const drawdownPercent = Math.max(0, drawdownAmount / MAX_DRAWDOWN);

    // Live Price Updates via WebSocket
    useEffect(() => {
        if (demoMode) {
            setBalance(10000);
            return;
        }

        let isLive = false;

        // DISABLED: WebSocket (Not available on Vercel serverless)
        // TODO: Re-enable when WS server is deployed to Railway/Render
        /*
        const ws = new WebSocket("ws://localhost:3001");

        ws.onopen = () => {
            console.log("🟢 Connected to Market Data Feed");
        };

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);

                if (payload.price && payload.asset_id) {
                    isLive = true; // Switch to live mode on first packet
                    setPrice(parseFloat(payload.price));

                    // Snap to the real market
                    setMarketInfo(prev => {
                        if (prev.id !== payload.asset_id) {
                            return {
                                id: payload.asset_id,
                                title: "Polymarket Live Feed (High Frequency)",
                                volume: "$24M+",
                                category: "CRYPTO"
                            };
                        }
                        return prev;
                    });
                }
            } catch (e) {
                console.error("WS Parse Error", e);
            }
        };

        ws.onerror = (e) => {
            console.warn("WS Connection Failed. Using Polling Fallback.");
        };

        ws.onclose = () => {
            console.log("WS Closed");
        };
        */        // 2. Simulation (The Fallback / Filler)
        const simInterval = setInterval(() => {
            if (!isLive) {
                // Generate random walk for BTC simulation
                setPrice(prev => {
                    const change = (Math.random() - 0.5) * 0.002;
                    return Math.max(0.01, prev + change);
                });
            }
        }, 1000);

        return () => {
            // ws.close();
            clearInterval(simInterval);
        };
    }, [demoMode]);

    // Mock Position State for Demo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [userPosition, setUserPosition] = useState<any>(null);

    const handleTrade = async (outcome: "YES" | "NO", amount: number) => {
        if (demoMode) {
            // Simulate optimistic update for demo
            setBalance(b => b! - amount);
            // Simulate creation of position
            setUserPosition({
                id: "pos-1",
                shares: amount / (outcome === "YES" ? price : 1 - price),
                avgPrice: outcome === "YES" ? price : 1 - price,
                invested: amount,
                currentPnl: 0, // Starts flat
                roi: 0,
                side: outcome
            });
            return;
        }

        try {
            // Use the dynamic ID from the live feed
            // If loading, fall back to a safe default for demo purposes or block
            const marketId = marketInfo.id === "loading" ? "21742633140121905979720502385255162663563053022834833784511119623297328612769" : marketInfo.id;

            const res = await fetch("/api/trade/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    marketId,
                    outcome,
                    amount
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Trade failed");
            }

            console.log("Trade Success:", data);
            setBalance(b => b! - amount);

            // Visual Confirmation (Professional)
            toast.success("Order Filled", {
                description: `Bought ${data.shares ? data.shares.toFixed(0) : (amount / price).toFixed(0)} ${outcome} @${(price * 100).toFixed(1)}¢`,
                duration: 3000,
                // Custom icon or styling if needed, but default success is clean
            });

            // Set position from response if available, or mock it closely
            setUserPosition({
                id: data.positionId || "pos-new",
                shares: amount / (outcome === "YES" ? price : 1 - price),
                avgPrice: outcome === "YES" ? price : 1 - price,
                invested: amount,
                currentPnl: 0,
                roi: 0,
                side: outcome
            });

        } catch (e: any) {
            console.error(e);
            toast.error("Order Failed", { description: e.message });
        }
    };

    return (
        <div className="font-sans text-white">
            {/* 1. Global Ticker */}
            <div className="hidden md:block fixed top-0 w-full z-50">
                <MarketTicker />
            </div>

            {/* Main Content */}
            <div className="pt-4 md:pt-16 p-4 md:p-6 max-w-[1800px] mx-auto space-y-6 pb-32 md:pb-6">

                {/* 2. HUD / Mission Tracker */}
                <MissionTracker
                    startingBalance={10000}
                    currentBalance={currentEquity}
                    profitTarget={1000} // 10%
                    maxDrawdown={800} // 8%
                    dailyLossLimit={400} // 4%
                    daysRemaining={29}
                />

                {/* 3. Market Card (Clickable to open Trading Modal) */}
                <div
                    onClick={() => setIsTradingModalOpen(true)}
                    className="cursor-pointer group relative overflow-hidden bg-[#1A232E] border border-[#2E3A52] hover:border-zinc-600 transition-all duration-300 rounded-xl p-6"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-4">
                            <div className="relative">
                                {/* Dynamic Icon based on Category could go here */}
                                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl border border-zinc-700 shadow-lg">⚡️</div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-lg border border-zinc-700 shadow-lg">🟢</div>
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-white leading-tight group-hover:text-blue-400 transition-colors">
                                    {marketInfo.title}
                                </h1>
                                <div className="flex items-center gap-3 mt-2 text-xs font-bold tracking-wider text-zinc-500">
                                    <span className="text-blue-400">{marketInfo.category}</span>
                                    <span>•</span>
                                    <span>VOL: {marketInfo.volume}</span>
                                    <span>•</span>
                                    <span className="text-green-500">LIVE</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-black text-green-500 font-mono tracking-tighter">
                                {(price * 100).toFixed(1)}¢
                            </div>
                            <div className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold mt-1">
                                <TrendingUp className="w-3 h-3" /> +2.4% TODAY
                            </div>
                        </div>
                    </div>

                    {/* Mini Chart Preview */}
                    <div className="h-[200px] w-full rounded-lg overflow-hidden pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                        <ProbabilityChart currentPrice={price} outcome="YES" />
                    </div>

                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>

                {/* 4. Open Positions */}
                <OpenPositions
                    positions={[]} // TODO: Wire up real positions from API/Context
                    onClosePosition={() => { }}
                />

            </div>

            {/* Mobile Nav */}
            <MobileNav />

            {/* TRADING MODAL (The Main Feature) */}
            <TradingModal
                open={isTradingModalOpen}
                onClose={() => setIsTradingModalOpen(false)}
                question="Will Donald Trump win the 2024 Election?"
                volume={15200000}
                activeTraders={1243}
            >
                <div className="flex flex-col lg:flex-row h-full">
                    {/* Left Column: Chart + OrderBook */}
                    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-6 border-b lg:border-b-0 lg:border-r border-zinc-800">
                        <ProbabilityChart currentPrice={price} outcome="YES" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <OrderBook marketPrice={price} outcome="YES" />
                            <RecentActivityFeed />
                        </div>
                    </div>

                    {/* Right Column: Trading Interface */}
                    <div className="lg:w-[400px] bg-zinc-950/30 p-4 lg:p-6 overflow-y-auto">
                        <UnifiedTradePanel
                            yesPrice={price}
                            noPrice={1 - price}
                            balance={balance || 0}
                            onTrade={handleTrade}
                            // Passing header info
                            question="Will Donald Trump win the 2024 Election?"
                            // Pass the position state
                            position={userPosition}
                            onClosePosition={() => setUserPosition(null)}
                        // No imageUrl passed to use default placeholder, or we can use the emoji one from grid above if we extracted it.
                        // For this demo, let's leave it undefined to triggering the default US/Elephant placeholder in the component
                        />
                    </div>
                </div>
            </TradingModal>

            {/* Mobile Sticky Buy Button (Triggers Modal) */}
            {!isTradingModalOpen && (
                <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
                    <button
                        onClick={() => setIsTradingModalOpen(true)}
                        className="w-full bg-[#2E81FF] text-white font-black uppercase py-4 rounded-xl shadow-2xl shadow-blue-900/50 border border-blue-500/50 flex items-center justify-center gap-2"
                    >
                        Trade Now • {(price * 100).toFixed(1)}¢
                    </button>
                </div>
            )}

            <ChallengeFailedModal
                isOpen={showFailedModal}
                onClose={() => setShowFailedModal(false)}
            />
            <ChallengePassedModal
                isOpen={showPassedModal}
                onClose={() => setShowPassedModal(false)}
            />

            <DevTools userId={userId} />
        </div>
    );
}
