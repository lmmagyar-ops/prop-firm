import { XCircle, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
// Sidebar import removed
import { LifetimeStatsGrid } from "@/components/dashboard/LifetimeStatsGrid";
import { ChallengeHistoryTable } from "@/components/dashboard/ChallengeHistoryTable";
import { ChallengeHeader } from "@/components/dashboard/ChallengeHeader";
import { LiveEquityDisplay } from "@/components/dashboard/LiveEquityDisplay";
import { EquityDisplay } from "@/components/dashboard/EquityDisplay";
import { ProfitProgress } from "@/components/dashboard/ProfitProgress";
import { RiskMeters } from "@/components/dashboard/RiskMeters";
import { LivePositions } from "@/components/dashboard/LivePositions";
import { RecentTradesWidget } from "@/components/dashboard/RecentTradesWidget";

import { getDashboardData } from "@/lib/dashboard-service";

import { BuyEvaluationButton } from "@/components/dashboard/BuyEvaluationButton";
import { StartChallengeButton } from "@/components/dashboard/StartChallengeButton";

import { OnboardingHandler } from "@/components/dashboard/OnboardingHandler";
import { DashboardOutcomeHandler } from "@/components/dashboard/DashboardOutcomeHandler";
import { DevTools } from "@/components/dashboard/DevTools";
import { WelcomeTour } from "@/components/dashboard/WelcomeTour";
import { TraderSpotlight } from "@/components/dashboard/TraderSpotlight";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ActiveChallengeHeading } from "@/components/dashboard/ActiveChallengeHeading";

// Funded Account Components
import {
    FundedAccountHeader,
    FundedRiskMeters,
    PayoutEligibilityCard,
    ActivityTracker,
    PayoutProgressCard,
} from "@/components/dashboard/funded";

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
    const data = await getDashboardData(userId);

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

    const { lifetimeStats, hasActiveChallenge, activeChallenge, positions, stats, challengeHistory, isFunded, fundedStats } = data;

    // Helper for Locked State Logic
    const latestChallenge = challengeHistory && challengeHistory.length > 0 ? challengeHistory[0] : null;

    // Pre-compute date values to avoid hydration mismatch (Date.now() differs between server and client)
    const now = Date.now();
    const computedDaysActive = activeChallenge?.startedAt
        ? Math.ceil((now - new Date(activeChallenge.startedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 1;
    const computedDaysRemaining = activeChallenge?.endsAt
        ? Math.ceil((new Date(activeChallenge.endsAt).getTime() - now) / (1000 * 60 * 60 * 24))
        : 0;

    // Logic for Verification Status (Winner-Only Flow)
    // Reserved for future KYC and passed challenge checks

    // Calculate true equity = Cash + Position Value
    // Defense: positions from getDashboardData should be numeric, but guard against NaN
    const positionValue = positions?.reduce((sum, pos) => {
        const shares = Number(pos.shares) || 0;
        const price = Number(pos.currentPrice) || 0;
        return sum + (shares * price);
    }, 0) ?? 0;
    const trueEquity = (activeChallenge?.currentBalance ?? 0) + positionValue;

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

            {/* Trader Spotlight Card - ONLY if hasActiveChallenge */}
            {hasActiveChallenge && activeChallenge && stats && (
                <TraderSpotlight
                    totalTrades={lifetimeStats.totalTradeCount}
                    winRate={lifetimeStats.tradeWinRate}
                    currentStreak={lifetimeStats.currentWinStreak || 0}
                    daysActive={computedDaysActive}
                    profitProgress={stats.profitProgress}
                />
            )}

            {/* Active Challenge Section - ONLY if hasActiveChallenge */}
            {hasActiveChallenge && activeChallenge && stats && (
                <>
                    <ActiveChallengeHeading isFunded={isFunded} />

                    {/* FUNDED PHASE UI */}
                    {isFunded && fundedStats ? (
                        <>
                            {/* Funded Account Header */}
                            <FundedAccountHeader
                                startingBalance={activeChallenge.startingBalance}
                                currentBalance={activeChallenge.currentBalance}
                                tier={fundedStats.tier as "5k" | "10k" | "25k"}
                                profitSplit={fundedStats.profitSplit}
                                payoutCap={fundedStats.payoutCap}
                                daysUntilPayout={fundedStats.daysUntilPayout}
                                platform={activeChallenge.platform as "polymarket" | "kalshi"}
                            />

                            {/* Equity Display (same as challenge) */}
                            <div className="mt-6">
                                <LiveEquityDisplay
                                    initialBalance={trueEquity}
                                    initialDailyPnL={stats.dailyPnL}
                                />
                            </div>

                            {/* Funded Risk Meters (STATIC drawdown) */}
                            <div className="mt-6">
                                <FundedRiskMeters
                                    currentBalance={activeChallenge.currentBalance}
                                    startingBalance={activeChallenge.startingBalance}
                                    maxTotalDrawdown={fundedStats.maxTotalDrawdown}
                                    maxDailyDrawdown={fundedStats.maxDailyDrawdown}
                                    startOfDayBalance={activeChallenge.startOfDayBalance}
                                    platform={activeChallenge.platform as "polymarket" | "kalshi"}
                                />
                            </div>

                            {/* Payout & Activity Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                <PayoutEligibilityCard
                                    eligible={fundedStats.eligible}
                                    tradingDays={fundedStats.activeTradingDays}
                                    requiredTradingDays={fundedStats.requiredTradingDays}
                                    consistencyFlagged={fundedStats.consistencyFlagged}
                                    hasViolations={fundedStats.hasViolations}
                                    netProfit={fundedStats.netProfit}
                                    platform={activeChallenge.platform as "polymarket" | "kalshi"}
                                />
                                <ActivityTracker
                                    tradingDays={fundedStats.activeTradingDays}
                                    requiredDays={fundedStats.requiredTradingDays}
                                    lastActivityAt={fundedStats.lastActivityAt}
                                    payoutCycleStart={fundedStats.payoutCycleStart}
                                    platform={activeChallenge.platform as "polymarket" | "kalshi"}
                                />
                            </div>

                            {/* Payout Breakdown (show if profitable) */}
                            {fundedStats.netProfit > 0 && (
                                <div className="mt-6">
                                    <PayoutProgressCard
                                        grossProfit={fundedStats.netProfit}
                                        excludedPnl={0}
                                        profitSplit={fundedStats.profitSplit}
                                        payoutCap={fundedStats.payoutCap}
                                        platform={activeChallenge.platform as "polymarket" | "kalshi"}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        /* CHALLENGE/VERIFICATION PHASE UI */
                        <>
                            <ChallengeHeader
                                phase={activeChallenge.phase as "challenge" | "verification" | "funded"}
                                status={activeChallenge.status as "active" | "failed" | "passed"}
                                startingBalance={typeof activeChallenge.startingBalance === 'string' ? parseFloat(activeChallenge.startingBalance) : activeChallenge.startingBalance}
                                daysRemaining={computedDaysRemaining}
                            />

                            {/* Equity + Profit Progress */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2">
                                    <LiveEquityDisplay
                                        initialBalance={trueEquity}
                                        initialDailyPnL={stats.dailyPnL}
                                    />
                                </div>
                                <div>
                                    <ProfitProgress
                                        totalPnL={stats.totalPnL}
                                        profitTarget={(activeChallenge.rulesConfig as Record<string, number>)?.profitTarget ?? 0}
                                        profitProgress={stats.profitProgress}
                                        startingBalance={typeof activeChallenge.startingBalance === 'string' ? parseFloat(activeChallenge.startingBalance) : activeChallenge.startingBalance}
                                    />
                                </div>
                            </div>

                            {/* Risk Meters */}
                            <RiskMeters
                                drawdownUsage={stats.drawdownUsage}
                                dailyDrawdownUsage={stats.dailyDrawdownUsage}
                                startOfDayBalance={activeChallenge.startOfDayBalance}
                                startingBalance={activeChallenge.startingBalance}
                                maxDrawdownPercent={(activeChallenge.rulesConfig as Record<string, number>)?.maxDrawdownPercent ?? 10}
                                dailyDrawdownPercent={(activeChallenge.rulesConfig as Record<string, number>)?.dailyDrawdownPercent ?? 5}
                            />
                        </>
                    )}

                    {/* Open Positions with LIVE SSE Updates */}
                    <LivePositions initialPositions={positions || []} />

                    {/* Recent Trades Widget */}
                    <RecentTradesWidget />

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
                                <ProfitProgress totalPnL={4250.00} profitTarget={10000} profitProgress={42.5} startingBalance={100000} />
                            </div>
                        </div>
                        <RiskMeters drawdownUsage={1.2} dailyDrawdownUsage={0.8} startOfDayBalance={103000} startingBalance={100000} />

                    </div>

                    {/* 2. Overlay Layer (Dynamic CTA) */}
                    <div className="absolute inset-0 z-50 flex items-center justify-center">
                        <div className="bg-[#0f1115]/90 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-2xl shadow-2xl max-w-lg text-center transform scale-100 hover:scale-[1.02] transition-transform duration-300">

                            {/* Check if we have a PENDING challenge waiting to be started */}
                            {data.pendingChallenge ? (
                                <>
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)]">
                                        <div className="text-2xl">🚀</div>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-3">
                                        You&apos;re Almost There
                                    </h2>
                                    <p className="text-zinc-400 mb-8 leading-relaxed">
                                        Your evaluation is ready. Once you click &quot;Start&quot;, your 30-day trading period begins immediately.
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
                                        <BuyEvaluationButton label="Try Again - From $79" />
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
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)]">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
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
                <ChallengeHistoryTable challenges={challengeHistory as Array<{
                    id: string;
                    accountNumber: string;
                    challengeType: string;
                    phase: string;
                    status: 'active' | 'passed' | 'failed';
                    finalPnL: number | null;
                    startedAt: Date;
                    completedAt?: Date | null;
                    platform?: "polymarket" | "kalshi";
                }>} />
            </div>

            <DevTools userId={userId} />

            {/* Quick Actions Floating Widget */}
            <QuickActions
                hasActiveChallenge={hasActiveChallenge}
                hasPositions={(positions?.length || 0) > 0}
            />
        </div>
    );
}
