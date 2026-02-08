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
import { getActiveEvents, type EventMetadata } from "@/app/actions/market";

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

    // Featured market — fetched from real Redis data
    const [featuredMarket, setFeaturedMarket] = useState<{
        id: string;
        title: string;
        price: number;
        volume: string;
        category: string;
    } | null>(null);

    useEffect(() => {
        if (demoMode) {
            setBalance(10000);
            return;
        }

        async function fetchFeaturedMarket() {
            try {
                const events = await getActiveEvents("polymarket");
                if (events.length === 0) return;

                // Pick the highest-volume event as the featured market
                const top = events.sort((a, b) => b.volume - a.volume)[0];
                const price = top.markets[0]?.price ?? 0;
                const tokenId = top.markets[0]?.id;

                if (price > 0 && price < 1 && tokenId) {
                    const vol = top.volume >= 1_000_000
                        ? `$${(top.volume / 1_000_000).toFixed(1)}M`
                        : `$${(top.volume / 1_000).toFixed(0)}K`;

                    setFeaturedMarket({
                        id: tokenId,
                        title: top.title,
                        price,
                        volume: vol,
                        category: top.categories?.[0]?.toUpperCase() || "MARKETS",
                    });
                }
            } catch (error) {
                console.error("[DashboardView] Failed to fetch featured market:", error);
            }
        }

        fetchFeaturedMarket();
    }, [demoMode]);

    // Derived states
    const currentEquity = balance || 10000;

    const MAX_DRAWDOWN = 10000 * 0.10;
    const drawdownAmount = 10000 - currentEquity;
    const drawdownPercent = Math.max(0, drawdownAmount / MAX_DRAWDOWN);

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

                {/* 3. Featured Market Card (Real data or CTA) */}
                <div
                    onClick={() => router.push('/dashboard/trade')}
                    className="cursor-pointer group relative overflow-hidden bg-[#1A232E] border border-[#2E3A52] hover:border-zinc-600 transition-all duration-300 rounded-xl p-6"
                >
                    {featuredMarket ? (
                        <>
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl border border-zinc-700 shadow-lg">📈</div>
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-lg border border-zinc-700 shadow-lg">🟢</div>
                                    </div>
                                    <div>
                                        <h1 className="text-xl md:text-2xl font-medium text-white leading-tight group-hover:text-primary transition-colors">
                                            {featuredMarket.title}
                                        </h1>
                                        <div className="flex items-center gap-3 mt-2 text-xs font-bold tracking-wider text-zinc-500">
                                            <span className="text-primary">{featuredMarket.category}</span>
                                            <span>•</span>
                                            <span>VOL: {featuredMarket.volume}</span>
                                            <span>•</span>
                                            <span className="text-green-500">LIVE</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-medium text-green-500 font-mono tracking-tighter">
                                        {Math.round(featuredMarket.price * 100)}¢
                                    </div>
                                </div>
                            </div>

                            {/* Real Chart with real tokenId */}
                            <div className="h-[200px] w-full rounded-lg overflow-hidden pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                                <ProbabilityChart
                                    tokenId={featuredMarket.id}
                                    currentPrice={featuredMarket.price}
                                    outcome="YES"
                                />
                            </div>
                        </>
                    ) : (
                        /* Honest empty state — no fake data */
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl mb-4 border border-primary/20">📊</div>
                            <h2 className="text-xl font-bold text-white mb-2">Start Trading</h2>
                            <p className="text-zinc-500 text-sm max-w-md">
                                Browse live prediction markets and place your first trade.
                            </p>
                            <div className="mt-4 px-6 py-2 bg-primary/10 text-primary rounded-lg text-sm font-bold border border-primary/20 group-hover:bg-primary/20 transition-colors">
                                Explore Markets →
                            </div>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>

                {/* 4. Open Positions */}
                <OpenPositions
                    positions={[]} // TODO: Wire up real positions from API/Context
                />

            </div>

            {/* Mobile Nav */}
            <MobileNav />

            {/* Mobile Sticky Button */}
            <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
                <button
                    onClick={() => router.push('/dashboard/trade')}
                    className="w-full bg-[#29af73] text-white font-black uppercase py-4 rounded-xl shadow-2xl shadow-primary/30 border border-primary/50 flex items-center justify-center gap-2"
                >
                    {featuredMarket ? (
                        <>Trade Now • {Math.round(featuredMarket.price * 100)}¢</>
                    ) : (
                        <>Explore Markets</>
                    )}
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
