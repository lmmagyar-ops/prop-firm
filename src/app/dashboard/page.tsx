import { redirect } from "next/navigation";
import { TrendingUp, XCircle, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
// Sidebar import removed
import { LifetimeStatsGrid } from "@/components/dashboard/LifetimeStatsGrid";
import { ChallengeHistoryTable } from "@/components/dashboard/ChallengeHistoryTable";
import { ChallengeHeader } from "@/components/dashboard/ChallengeHeader";
import { EquityDisplay } from "@/components/dashboard/EquityDisplay";
import { ProfitProgress } from "@/components/dashboard/ProfitProgress";
import { RiskMeters } from "@/components/dashboard/RiskMeters";
import { OpenPositions } from "@/components/dashboard/OpenPositions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard-service";
import { LiveMarketSection } from "@/components/dashboard/LiveMarketSection";
import { BuyEvaluationButton } from "@/components/dashboard/BuyEvaluationButton";
import { StartChallengeButton } from "@/components/dashboard/StartChallengeButton";

import { OnboardingHandler } from "@/components/dashboard/OnboardingHandler";
import { DashboardOutcomeHandler } from "@/components/dashboard/DashboardOutcomeHandler";
import { DevTools } from "@/components/dashboard/DevTools";
import { WelcomeTour } from "@/components/dashboard/WelcomeTour";

// Server component
export default async function DashboardPage() {
    const session = await auth();

    // DEMO MODE: Auth disabled for testing
    // Redirect if not authenticated
    // if (!session?.user?.id) {
    //     redirect('/login');
    // }

    const userId = session?.user?.id || "demo-user-1"; // Fallback for testing

    // Use service directly - no HTTP fetch
    console.log(`[DashboardPage] Rendering for User ID: ${userId}`);
    const data = await getDashboardData(userId);
    console.log(`[DashboardPage] Pending Challenge Found:`, data?.pendingChallenge);
    console.log(`[DashboardPage] Has Active Challenge:`, data?.hasActiveChallenge);
    console.log(`[DashboardPage] Challenge History Length:`, data?.challengeHistory?.length);
    console.log(`[DashboardPage] Active Challenge Data:`, data?.activeChallenge ? 'EXISTS' : 'NULL');
    console.log(`[DashboardPage] Stats Data:`, data?.stats ? 'EXISTS' : 'NULL');
    console.log(`[DashboardPage] Positions Length:`, data?.positions?.length || 0);

    if (!data) {
        // Fallback for user not found
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                    <h1 className="text-xl font-bold mb-2">User Not Found</h1>
                    <p className="text-zinc-500">Could not retrieve data for ID: {userId}</p>
                </div>
            </div>
        );
    }

    const { user, lifetimeStats, hasActiveChallenge, activeChallenge, positions, stats, challengeHistory } = data;

    // Helper for Locked State Logic
    const latestChallenge = challengeHistory && challengeHistory.length > 0 ? challengeHistory[0] : null;

    // Logic for Verification Status (Winner-Only Flow)
    const isKycVerified = (user as any).kycVerified === true;
    const hasPassedChallenge = challengeHistory.some(c => c.status === "passed");

    return (
        <div className="space-y-6">
            <WelcomeTour />
            <OnboardingHandler />

            {/* Handle Outcome Modals (Client Side) */}
            {!hasActiveChallenge && (
                <DashboardOutcomeHandler challengeHistory={challengeHistory} />
            )}

            {/* Lifetime Stats Grid - ALWAYS VISIBLE */}
            <LifetimeStatsGrid stats={lifetimeStats} />

            {/* Active Challenge Section - ONLY if hasActiveChallenge */}
            {hasActiveChallenge && activeChallenge && stats && (
                <>
                    <div className="border-t border-white/5 pt-6 mt-8">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Active Challenge
                        </h2>
                    </div>

                    <ChallengeHeader
                        phase={activeChallenge.phase as any}
                        status={activeChallenge.status as any}
                        startingBalance={typeof activeChallenge.startingBalance === 'string' ? parseFloat(activeChallenge.startingBalance) : activeChallenge.startingBalance}
                        daysRemaining={activeChallenge.endsAt
                            ? Math.ceil((new Date(activeChallenge.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                            : 0
                        }
                    />

                    {/* Equity + Profit Progress */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <EquityDisplay
                                currentBalance={activeChallenge.currentBalance}
                                dailyPnL={stats.dailyPnL}
                            />
                        </div>
                        <div>
                            <ProfitProgress
                                totalPnL={stats.totalPnL}
                                profitTarget={activeChallenge.rulesConfig.profitTarget}
                                profitProgress={stats.profitProgress}
                            />
                        </div>
                    </div>

                    {/* Risk Meters */}
                    <RiskMeters
                        drawdownUsage={stats.drawdownUsage}
                        dailyDrawdownUsage={stats.dailyDrawdownUsage}
                        startOfDayBalance={activeChallenge.startOfDayBalance}
                    />

                    {/* Open Positions */}
                    <OpenPositions
                        positions={positions || []}
                        onClosePosition={async (id) => {
                            "use server";
                            // TODO: Implement server action for closing position
                            console.log("Close position (server):", id);
                        }}
                    />

                    {/* ACTIVE TRADING MARKETS */}
                    <LiveMarketSection
                        initialBalance={typeof activeChallenge.currentBalance === 'string' ? parseFloat(activeChallenge.currentBalance) : activeChallenge.currentBalance}
                        userId={userId}
                    />
                </>
            )}

            {/* Locked State - Preview Mode or Pending Challenge */}
            {!hasActiveChallenge && (
                <div className="relative">
                    {/* 1. Content Layer (Blurred & Unreachable) ... removed content for brevity as it's just blurred BG ... */}
                    <div className="filter blur-sm pointer-events-none opacity-40 select-none grayscale-[0.5] transition-all duration-1000">
                        {/* ... Reusing existing blurred content structure ... */}
                        <div className="border-t border-white/5 pt-6 mt-8">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                Active Challenge
                            </h2>
                        </div>
                        <ChallengeHeader
                            phase="challenge"
                            status="active"
                            startingBalance={100000}
                            daysRemaining={28}
                        />
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                            <div className="lg:col-span-2">
                                <EquityDisplay currentBalance={104250.00} dailyPnL={1250.50} />
                            </div>
                            <div>
                                <ProfitProgress totalPnL={4250.00} profitTarget={10000} profitProgress={42.5} />
                            </div>
                        </div>
                        <RiskMeters drawdownUsage={1.2} dailyDrawdownUsage={0.8} startOfDayBalance={103000} />
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-white mb-4">Live Markets</h2>
                            <div className="h-[400px] w-full bg-[#0a0a0a] rounded-xl border border-white/10 flex items-center justify-center">
                                <div className="text-zinc-600 font-mono">Terminal Offline</div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Overlay Layer (Dynamic CTA) */}
                    <div className="absolute inset-0 z-50 flex items-center justify-center">
                        <div className="bg-[#0f1115]/90 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-2xl shadow-2xl max-w-lg text-center transform scale-100 hover:scale-[1.02] transition-transform duration-300">

                            {/* Check if we have a PENDING challenge waiting to be started */}
                            {data.pendingChallenge ? (
                                <>
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)]">
                                        <div className="text-2xl">🚀</div>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-3">
                                        You're Almost There
                                    </h2>
                                    <p className="text-zinc-400 mb-8 leading-relaxed">
                                        Your evaluation is ready. Once you click "Start", your 30-day trading period begins immediately.
                                    </p>
                                    <div className="space-y-4">
                                        <StartChallengeButton />
                                        <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">
                                            Good Luck!
                                        </p>
                                    </div>
                                </>
                            ) : latestChallenge?.status === 'failed' ? (
                                <>
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_30px_-10px_rgba(239,68,68,0.5)]">
                                        <XCircle className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-3">
                                        Evaluation Failed
                                    </h2>
                                    <p className="text-zinc-400 mb-8 leading-relaxed">
                                        You breached the risk limits on your previous attempt. Professional trading is about resilience.
                                    </p>
                                    <div className="space-y-4">
                                        <BuyEvaluationButton label="Try Again - $99" />
                                        <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">
                                            Reset &amp; Retry Immediately
                                        </p>
                                    </div>
                                </>
                            ) : latestChallenge?.status === 'passed' ? (
                                <>
                                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/20 shadow-[0_0_30px_-10px_rgba(234,179,8,0.5)]">
                                        <Trophy className="w-8 h-8 text-yellow-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-3">
                                        Phase 1 Completed
                                    </h2>
                                    <p className="text-zinc-400 mb-8 leading-relaxed">
                                        Congratulations! You have passed the evaluation phase.
                                        <br />
                                        <span className="text-yellow-500/80 text-sm mt-2 block">Next Phase Coming Soon</span>
                                    </p>
                                    <div className="space-y-4">
                                        {/* Optional: Allow buying another evaluation if they want multiple accounts */}
                                        <BuyEvaluationButton label="Purchase Another Evaluation" />
                                        <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">
                                            Expand Your Portfolio
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)]">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                    </div>

                                    <h2 className="text-2xl font-bold text-white mb-3">
                                        Active Evaluation Required
                                    </h2>
                                    <p className="text-zinc-400 mb-8 leading-relaxed">
                                        To access the institutional trading terminal and live market data, you must be enrolled in an active evaluation.
                                    </p>

                                    <div className="space-y-4">
                                        <BuyEvaluationButton />
                                        <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">
                                            Instant Access • No KYC Required
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Challenge History Table - ALWAYS VISIBLE */}
            <div className="border-t border-white/5 pt-6 mt-8">
                <ChallengeHistoryTable challenges={challengeHistory as any[]} />
            </div>

            <DevTools userId={userId} />
        </div>
    );
}
