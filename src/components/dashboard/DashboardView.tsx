"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { MissionTracker } from "@/components/dashboard/MissionTracker";
import { useSelectedChallengeContext } from "@/contexts/SelectedChallengeContext";
import { MarketTicker } from "@/components/MarketTicker";
import { OpenPositions } from "./OpenPositions";
import { ProbabilityChart } from "@/components/trading/ProbabilityChart";
import { useRouter } from "next/navigation";

import { ChallengeFailedModal } from "@/components/dashboard/ChallengeFailedModal";
import { ChallengePassedModal } from "@/components/dashboard/ChallengePassedModal";
import { DevTools } from "@/components/dashboard/DevTools";

interface DashboardViewProps {
    initialBalance?: number | null;
    demoMode?: boolean;
    userId?: string;
    challengeHistory?: any[]; // Passed from server
}

export function DashboardView({ initialBalance = null, demoMode = false, userId = "demo-user-1", challengeHistory = [] }: DashboardViewProps) {
    const [balance, setBalance] = useState<number | null>(initialBalance);
    const [price, setPrice] = useState(0.56);
    const router = useRouter();

    // Get selected challenge from context
    const { selectedChallengeId } = useSelectedChallengeContext();

    // Outcome Modals Logic
    const latestChallenge = challengeHistory && challengeHistory.length > 0 ? challengeHistory[0] : null;
    const [showFailedModal, setShowFailedModal] = useState(false);
    const [showPassedModal, setShowPassedModal] = useState(false);

    useEffect(() => {
        if (initialBalance === null && latestChallenge) {
            if (latestChallenge.status === 'failed') {
                setShowFailedModal(true);
            } else if (latestChallenge.status === 'passed') {
                setShowPassedModal(true);
            }
        }
    }, [initialBalance, latestChallenge]);

    // State for Dynamic Market Info
    const [marketInfo, setMarketInfo] = useState({
        id: "simulated-btc",
        title: "BTC/USD (Perpetual)",
        volume: "$1.2B",
        category: "CRYPTO"
    });

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

                {/* 3. Market Card (Clickable to go to Trade page) */}
                <div
                    onClick={() => router.push('/dashboard/trade')}
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
                />

            </div>

            {/* Mobile Nav */}
            <MobileNav />

            {/* Mobile Sticky Button - Navigate to Trade page */}
            <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
                <button
                    onClick={() => router.push('/dashboard/trade')}
                    className="w-full bg-[#2E81FF] text-white font-black uppercase py-4 rounded-xl shadow-2xl shadow-blue-900/50 border border-blue-500/50 flex items-center justify-center gap-2"
                >
                    Trade Now • {(price * 100).toFixed(1)}¢
                </button>
            </div>

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
