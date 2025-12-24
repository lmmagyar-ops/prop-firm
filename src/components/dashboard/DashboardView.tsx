
"use client";

import { BigNumberDisplay } from "@/components/BigNumberDisplay";
import { OpenPositions } from "./OpenPositions";
import { Badge } from "@/components/ui/badge";
import { MarketTicker } from "@/components/MarketTicker";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";

// New Trading Components
import { TradingModal } from "@/components/trading/TradingModal";
import { UnifiedTradePanel } from "@/components/trading/UnifiedTradePanel";
import { ProbabilityChart } from "@/components/trading/ProbabilityChart";
import { OrderBook } from "@/components/trading/OrderBook";
import { RecentActivityFeed } from "@/components/trading/RecentActivityFeed";

// Use Chart Data Generator directly for mock price simulation
import { generateChartData } from "@/lib/trading/chart-data-generator";

interface DashboardViewProps {
    initialBalance?: number | null;
    demoMode?: boolean;
    userId?: string;
}

export function DashboardView({ initialBalance = null, demoMode = false, userId = "demo-user-1" }: DashboardViewProps) {
    const [balance, setBalance] = useState<number | null>(initialBalance);
    const [price, setPrice] = useState(0.56);

    // Trading Modal State
    const [isTradingModalOpen, setIsTradingModalOpen] = useState(false);

    // Derived states
    const currentEquity = balance || 10000;
    const MAX_DRAWDOWN = 10000 * 0.10;
    const drawdownAmount = 10000 - currentEquity;
    const drawdownPercent = Math.max(0, drawdownAmount / MAX_DRAWDOWN);

    // Mock Live Price Updates
    useEffect(() => {
        if (demoMode) setBalance(10000);
        if (initialBalance) setBalance(initialBalance);
    }, [demoMode, initialBalance]);

    useEffect(() => {
        const interval = setInterval(() => {
            const change = (Math.random() - 0.5) * 0.005; // Smaller moves
            const newPrice = Math.max(0.01, Math.min(0.99, price + change));
            setPrice(newPrice);
        }, 3000); // Slower updates
        return () => clearInterval(interval);
    }, [price]);

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
            const marketId = "32666"; // Fixed mock ID

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
            // Error handling is done in TradingPanel via haptics mostly, maybe show toast
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

                {/* 2. HUD */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#1A232E] border border-[#2E3A52] p-4 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between w-full md:w-auto gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/20">
                                <TrendingUp className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Equity</h2>
                                <div className="text-2xl font-black font-mono tracking-tight text-white flex items-center gap-2">
                                    <BigNumberDisplay value={currentEquity} className="" />
                                    <Badge variant="outline" className="hidden md:flex border-green-500/20 text-green-500 text-[10px] uppercase bg-green-500/5">
                                        Live
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        {/* Mobile Only PnL Pill */}
                        <div className="md:hidden">
                            <span className={`text-sm font-mono font-bold ${currentEquity >= 10000 ? 'text-green-500' : 'text-red-500'}`}>
                                {currentEquity >= 10000 ? '+' : ''}${(currentEquity - 10000).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="hidden md:flex gap-12">
                        <div>
                            <h3 className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Balance</h3>
                            <span className="text-lg font-mono text-zinc-300 font-medium">$10,000.00</span>
                        </div>
                        <div>
                            <h3 className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Daily P&L</h3>
                            <span className={`text-lg font-mono font-bold ${currentEquity >= 10000 ? 'text-green-500' : 'text-red-500'}`}>
                                {currentEquity >= 10000 ? '+' : ''}${(currentEquity - 10000).toFixed(2)}
                            </span>
                        </div>
                        <div className="">
                            <h3 className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Risk Usage</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${drawdownPercent > 0.8 ? 'bg-red-500' : 'bg-blue-500'} transition-all duration-500`}
                                        style={{ width: `${drawdownPercent * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-zinc-400 font-mono">{(drawdownPercent * 10).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Market Card (Clickable to open Trading Modal) */}
                <div
                    onClick={() => setIsTradingModalOpen(true)}
                    className="cursor-pointer group relative overflow-hidden bg-[#1A232E] border border-[#2E3A52] hover:border-zinc-600 transition-all duration-300 rounded-xl p-6"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-4">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl border border-zinc-700 shadow-lg">🇺🇸</div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-lg border border-zinc-700 shadow-lg">🐘</div>
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-white leading-tight group-hover:text-blue-400 transition-colors">
                                    Will Donald Trump win the 2024 Election?
                                </h1>
                                <div className="flex items-center gap-3 mt-2 text-xs font-bold tracking-wider text-zinc-500">
                                    <span className="text-blue-400">POLITICS</span>
                                    <span>•</span>
                                    <span>VOL: $15.2M</span>
                                    <span>•</span>
                                    <span className="text-green-500">ENDS NOV 5</span>
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

        </div>
    );
}
