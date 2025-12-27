"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { OpenPositions } from "@/components/dashboard/OpenPositions";
import { ProbabilityChart } from "@/components/trading/ProbabilityChart";
import { UnifiedTradePanel } from "@/components/trading/UnifiedTradePanel";
import { ChallengeStats } from "./ChallengeStats";
import { cn } from "@/lib/utils";
import { TrendingUp, Clock, AlertTriangle } from "lucide-react";

interface TradingTerminalProps {
    challenge: {
        id: string;
        startedAt: Date;
        durationDays: number;
        initialBalance: number; // string in DB (decimal), simplified here
        profitTarget: number;   // json config in DB, or passed flat
        maxDrawdown: number;    // json config or passed flat
        currentBalance: string; // decimal string
    };
}

export function TradingTerminal({ challenge }: TradingTerminalProps) {
    // Phase 1: Hardcoded Initial State from Challenge Prop
    // In a real app we might parse the complex configuration JSON for targets
    const initialBalance = parseFloat(challenge.currentBalance) || 10000;
    const initialEquity = initialBalance; // Initial equity = balance before trades

    const [equity, setEquity] = useState(initialEquity);
    // const [balance, setBalance] = useState(initialBalance); // Unified panel uses balance from props or fetches it? It uses prop.
    const [price, setPrice] = useState(0.56);
    const [positions, setPositions] = useState<any[]>([]);
    const [marketInfo, setMarketInfo] = useState({
        id: "simulated-btc",
        title: "BTC/USD (Perpetual)",
        volume: "$1.2B",
        category: "CRYPTO"
    });

    // Fetch Positions Logic
    const fetchData = async () => {
        try {
            const posRes = await fetch("/api/user/positions");
            const posData = await posRes.json();
            if (posData.positions) {
                setPositions(posData.positions);
            }

            const balRes = await fetch("/api/user/balance");
            const balData = await balRes.json();
            if (balData.equity) {
                setEquity(balData.equity);
            }
        } catch (e) {
            console.error("Failed to fetch data", e);
        }
    };

    // WebSocket Logic (Live Feed)
    // DISABLED: Not available on Vercel serverless
    /*
    useEffect(() => {
        fetchData(); // Fetch on mount

        const ws = new WebSocket("ws://localhost:3001");

        ws.onopen = () => {
            console.log("🟢 Terminal Connected to Feed");
        };

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.price && payload.asset_id) {
                    setPrice(parseFloat(payload.price));

                    // Update Market Info if it changes (snap to high velocity market)
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
                console.error("WS Error", e);
            }
        };

        return () => ws.close();
    }, []);
    */

    // Trade Handler
    const handleTrade = async (outcome: "YES" | "NO", amount: number) => {
        try {
            // Use the dynamic ID from the live feed is best, but for MVP falling back to hardcoded if simulated
            // The ingestion worker is pushing updates for specific assets.
            // If marketInfo.id is "simulated-btc", trade execution might fail if we use that ID against real backend.
            // However, our backend has a fallback "Auto-Provision" logic in execute/route.ts!
            // So we just pass the ID we have.
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
            if (!res.ok) throw new Error(data.error);

            // Refresh positions and balance after trade
            await fetchData();

        } catch (e) {
            console.error("Trade failed", e);
        }
    };

    // Derived Display Data
    const daysRemaining = challenge.durationDays || 30; // Static for now, logic needed to calc diff from startedAt

    return (
        <div className="min-h-screen bg-[#0A0B0E] font-sans text-white pb-20">
            {/* Top Bar: Challenge Timer / Status */}
            <div className="bg-[#1A232E] border-b border-[#2E3A52] px-6 py-3 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[#94A3B8] text-sm font-bold uppercase tracking-wider">
                        <Clock className="w-4 h-4" />
                        <span>Day 1 of {challenge.durationDays}</span>
                    </div>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                        ACTIVE
                    </Badge>
                </div>
                <div className="text-sm font-mono text-[#94A3B8]">
                    Challenge ID: <span className="text-zinc-500">{challenge.id.substring(0, 8)}...</span>
                </div>
            </div>

            <main className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT COLUMN (Chat / Market / Execution) - Span 8 or 9 */}
                <div className="lg:col-span-8 flex flex-col gap-6">

                    {/* Market Header Card */}
                    <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6 relative overflow-hidden group">
                        <div className="flex justify-between items-start z-10 relative">
                            <div>
                                <h1 className="text-2xl font-black text-white leading-tight max-w-2xl">
                                    {marketInfo.title}
                                </h1>
                                <div className="flex items-center gap-3 mt-2 text-xs font-bold tracking-wider text-zinc-500">
                                    <span className="text-blue-400">{marketInfo.category}</span>
                                    <span>•</span>
                                    <span>VOL: {marketInfo.volume}</span>
                                    <span>•</span>
                                    <span className="text-green-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> LIVE FEED</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-black text-green-500 font-mono tracking-tighter">
                                    {(price * 100).toFixed(1)}¢
                                </div>
                            </div>
                        </div>
                        {/* Background Gradient */}
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>

                    {/* Chart Section */}
                    <div className="h-[400px] bg-[#1A232E] border border-[#2E3A52] rounded-xl p-4">
                        <ProbabilityChart currentPrice={price} outcome="YES" />
                    </div>

                    {/* Trade Panel (Horizontal Layout for Terminal) */}
                    <div className="h-[350px]">
                        <UnifiedTradePanel
                            yesPrice={price}
                            noPrice={1 - price}
                            balance={equity} // Using equity as buying power for simplicity 
                            onTrade={handleTrade}
                            question={marketInfo.title}
                        />
                    </div>

                </div>

                {/* RIGHT COLUMN (Stats / Positions) - Span 4 or 3 */}
                <div className="lg:col-span-4 flex flex-col gap-6">

                    {/* Challenge Stats Widget */}
                    <ChallengeStats
                        challengeId={challenge.id}
                        startedAt={new Date(challenge.startedAt)}
                        durationDays={challenge.durationDays}
                        currentEquity={equity}
                        initialBalance={initialBalance}
                        profitTarget={500} // TODO: Parse config
                        maxDrawdown={1000} // TODO: Parse config
                    />

                    {/* Open Positions List */}
                    <div className="flex-1 min-h-[400px]">
                        <OpenPositions
                            positions={positions}
                            onClosePosition={(id) => { console.log("Closing", id) }} // Close logic needs API endpoint logic or calling execute with opposite side
                        />
                    </div>

                </div>

            </main>
        </div >
    );
}
