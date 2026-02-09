import { db } from "@/db";
import { challenges, positions, trades, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { FUNDED_RULES, type FundedTier } from "@/lib/funded-rules";
import { getPortfolioValue, DEFAULT_MAX_DRAWDOWN } from "@/lib/position-utils";
import { safeParseFloat } from "./safe-parse";
import { MarketService } from "./market";

// ─── Types ──────────────────────────────────────────────────────────

type ChallengeRow = Awaited<ReturnType<typeof db.query.challenges.findFirst>>;
type TradeRow = { id: string; type: string; realizedPnL: string | null; executedAt: Date | null };

// ─── Main Entry Point ───────────────────────────────────────────────

export async function getDashboardData(userId: string) {
    // 1. Fetch user + all challenges in parallel
    const [user, allChallenges] = await Promise.all([
        db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { displayName: true, email: true }
        }),
        db.query.challenges.findMany({
            where: eq(challenges.userId, userId),
        }),
    ]);

    if (!user) return null;

    const lifetimeStats = await getLifetimeStats(allChallenges);
    const challengeHistory = mapChallengeHistory(allChallenges);

    // 2. Find active challenge (prefer selected from cookie)
    const activeChallenge = await findActiveChallenge(userId, allChallenges);
    const pendingChallenge = await db.query.challenges.findFirst({
        where: and(eq(challenges.userId, userId), eq(challenges.status, "pending")),
    });

    if (!activeChallenge) {
        return {
            user,
            lifetimeStats,
            hasActiveChallenge: false,
            challengeHistory,
            pendingChallenge: pendingChallenge ? {
                id: pendingChallenge.id,
                status: pendingChallenge.status,
                type: "10k Challenge",
            } : null,
            activeChallenge: undefined,
            positions: [],
            stats: undefined,
        };
    }

    // 3. Build active challenge data
    const openPositions = await db.query.positions.findMany({
        where: and(
            eq(positions.challengeId, activeChallenge.id),
            eq(positions.status, "OPEN")
        ),
    });

    // 4. Price positions via shared utility
    const marketIds = openPositions.map(p => p.marketId);
    const [livePrices, marketTitles] = await Promise.all([
        marketIds.length > 0 ? MarketService.getBatchOrderBookPrices(marketIds) : Promise.resolve(new Map()),
        MarketService.getBatchTitles(marketIds),
    ]);

    const positionsWithPnL = getPositionsWithPnL(openPositions, livePrices, marketTitles);
    const totalPositionValue = positionsWithPnL.reduce((sum, p) => sum + p.positionValue, 0);

    // 5. Calculate equity-based stats
    const cashBalance = safeParseFloat(activeChallenge.currentBalance);
    const startingBalance = safeParseFloat(activeChallenge.startingBalance);
    const equity = cashBalance + totalPositionValue;

    const stats = getEquityStats(activeChallenge, equity, startingBalance);
    const isFunded = activeChallenge.phase === "funded";
    const fundedStats = isFunded ? getFundedStats(activeChallenge, equity, startingBalance) : null;

    return {
        user,
        lifetimeStats,
        hasActiveChallenge: true,
        activeChallenge: {
            id: activeChallenge.id,
            phase: activeChallenge.phase,
            status: activeChallenge.status,
            startingBalance,
            currentBalance: cashBalance,
            equity,
            highWaterMark: safeParseFloat(activeChallenge.highWaterMark) || startingBalance,
            startOfDayBalance: safeParseFloat(activeChallenge.startOfDayBalance) || startingBalance,
            rulesConfig: (activeChallenge.rulesConfig as Record<string, unknown>) || {},
            startedAt: activeChallenge.startedAt,
            endsAt: activeChallenge.endsAt,
            platform: activeChallenge.platform || "polymarket",
        },
        positions: positionsWithPnL,
        stats,
        challengeHistory,
        isFunded,
        fundedStats,
    };
}

// ─── Sub-functions ──────────────────────────────────────────────────

/**
 * Aggregate lifetime stats across all challenges and trades.
 */
async function getLifetimeStats(allChallenges: NonNullable<ChallengeRow>[]) {
    const totalChallengesStarted = allChallenges.length;
    const challengesCompleted = allChallenges.filter(c => c.status === "passed").length;
    const challengesFailed = allChallenges.filter(c => c.status === "failed").length;
    const successRate = totalChallengesStarted > 0
        ? (challengesCompleted / totalChallengesStarted) * 100
        : 0;

    const totalProfitEarned = allChallenges
        .filter(c => c.status === "passed")
        .reduce((sum, c) => {
            const profit = safeParseFloat(c.currentBalance) - safeParseFloat(c.startingBalance);
            return sum + Math.max(0, profit);
        }, 0);

    // Fetch trades for all challenges
    const challengeIds = allChallenges.map(c => c.id);
    const allTradesResult: TradeRow[] = [];

    if (challengeIds.length > 0) {
        for (const cId of challengeIds) {
            const chTrades = await db.query.trades.findMany({
                where: eq(trades.challengeId, cId),
                columns: { id: true, type: true, realizedPnL: true, executedAt: true },
                orderBy: [desc(trades.executedAt)],
            });
            allTradesResult.push(...(chTrades as TradeRow[]));
        }
        allTradesResult.sort((a, b) => {
            const ta = a.executedAt ? new Date(a.executedAt).getTime() : 0;
            const tb = b.executedAt ? new Date(b.executedAt).getTime() : 0;
            return tb - ta;
        });
    }

    const totalTradeCount = allTradesResult.length;
    const sellTrades = allTradesResult.filter(t => t.type === "SELL");
    const winningTrades = sellTrades.filter(t => safeParseFloat(t.realizedPnL) > 0);
    const tradeWinRate = sellTrades.length > 0
        ? (winningTrades.length / sellTrades.length) * 100
        : 0;

    let currentWinStreak = 0;
    for (const t of sellTrades) {
        if (safeParseFloat(t.realizedPnL) > 0) {
            currentWinStreak++;
        } else {
            break;
        }
    }

    const totalRealizedPnL = sellTrades.reduce((sum, t) => sum + safeParseFloat(t.realizedPnL), 0);

    return {
        totalChallengesStarted,
        challengesCompleted,
        challengesFailed,
        successRate,
        totalProfitEarned: totalProfitEarned > 0 ? totalProfitEarned : Math.max(0, totalRealizedPnL),
        bestMarketCategory: null as string | null,
        currentWinStreak,
        avgTradeWinRate: tradeWinRate,
        totalTradeCount,
        tradeWinRate,
        totalRealizedPnL,
    };
}

/**
 * Map challenge history with safe dates for the UI.
 */
export function mapChallengeHistory(challengesList: NonNullable<ChallengeRow>[]) {
    return challengesList.map((c, idx) => ({
        id: c.id,
        accountNumber: `CH-${c.startedAt ? new Date(c.startedAt).getFullYear() : "XXXX"}-${String(idx + 1).padStart(3, "0")}`,
        challengeType: `$${safeParseFloat(c.startingBalance).toLocaleString()} Challenge`,
        phase: c.phase,
        status: c.status,
        finalPnL: c.status !== "active" ? safeParseFloat(c.currentBalance) - safeParseFloat(c.startingBalance) : null,
        startedAt: c.startedAt,
        completedAt: c.status !== "active" ? c.endsAt : null,
        platform: c.platform || "polymarket",
    })).sort((a, b) => {
        const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
        const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
        return timeB - timeA;
    });
}

/**
 * Find the active challenge, preferring the user-selected one (via cookie).
 */
async function findActiveChallenge(userId: string, allChallenges: NonNullable<ChallengeRow>[]) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const selectedChallengeId = cookieStore.get("selectedChallengeId")?.value;

    if (selectedChallengeId) {
        const selected = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.id, selectedChallengeId),
                eq(challenges.userId, userId),
                eq(challenges.status, "active")
            ),
        });
        if (selected) return selected;
    }

    // Fallback: any active challenge
    return db.query.challenges.findFirst({
        where: and(
            eq(challenges.userId, userId),
            eq(challenges.status, "active")
        ),
    });
}

/**
 * Enrich open positions with live P&L using shared getPortfolioValue().
 */
export function getPositionsWithPnL(
    openPositions: Awaited<ReturnType<typeof db.query.positions.findMany>>,
    livePrices: Map<string, { price: string; source?: string }>,
    marketTitles: Map<string, string>
) {
    const portfolio = getPortfolioValue(openPositions, livePrices);

    // Map portfolio positions back to enriched objects for the UI
    return portfolio.positions.map(pv => {
        const dbPos = openPositions.find(p => p.marketId === pv.marketId);
        if (!dbPos) return null;

        return {
            id: dbPos.id,
            marketId: pv.marketId,
            marketTitle: marketTitles.get(pv.marketId) || `Market ${pv.marketId.slice(0, 8)}...`,
            direction: (dbPos.direction as "YES" | "NO") || "YES",
            sizeAmount: safeParseFloat(dbPos.sizeAmount),
            shares: pv.shares,
            entryPrice: safeParseFloat(dbPos.entryPrice),
            currentPrice: pv.effectivePrice,
            unrealizedPnL: pv.unrealizedPnL,
            positionValue: pv.positionValue,
            openedAt: dbPos.openedAt ? new Date(dbPos.openedAt).toISOString() : new Date().toISOString(),
            priceSource: pv.priceSource,
        };
    }).filter((p): p is NonNullable<typeof p> => p !== null);
}

/**
 * Calculate equity-based stats (drawdown, P&L, profit progress).
 */
export function getEquityStats(
    challenge: NonNullable<ChallengeRow>,
    equity: number,
    startingBalance: number,
) {
    const rawRules = challenge.rulesConfig as Record<string, unknown> | null;
    const rules = rawRules || {};

    const hwmParsed = safeParseFloat(challenge.highWaterMark);
    const highWaterMark = hwmParsed > 0 ? hwmParsed : startingBalance;
    const sodParsed = safeParseFloat(challenge.startOfDayBalance);
    const startOfDayBalance = sodParsed > 0 ? sodParsed : startingBalance;

    const totalPnL = equity - startingBalance;
    const dailyPnL = equity - startOfDayBalance;

    const maxDrawdownLimit = (rules.maxDrawdown as number) || DEFAULT_MAX_DRAWDOWN;
    const dailyDrawdownPercent = (rules.maxDailyDrawdownPercent as number) || 0.04;
    const dailyDrawdownLimit = dailyDrawdownPercent * startingBalance;

    const drawdownAmount = Math.max(0, highWaterMark - equity);
    const dailyDrawdownAmount = Math.max(0, startOfDayBalance - equity);

    const drawdownUsage = (drawdownAmount / maxDrawdownLimit) * 100;
    const dailyDrawdownUsage = (dailyDrawdownAmount / dailyDrawdownLimit) * 100;

    const defaultProfitTarget = startingBalance * 0.10;
    const profitTarget = (rules.profitTarget as number) ?? defaultProfitTarget;
    const profitProgress = Math.max(0, Math.min(100, (totalPnL / profitTarget) * 100));

    return { totalPnL, dailyPnL, drawdownUsage, dailyDrawdownUsage, profitProgress };
}

/**
 * Calculate funded-phase-specific stats (payout eligibility, tier data).
 */
export function getFundedStats(
    challenge: NonNullable<ChallengeRow>,
    equity: number,
    startingBalance: number,
) {
    let tier: FundedTier;
    if (startingBalance <= 5000) tier = "5k";
    else if (startingBalance <= 10000) tier = "10k";
    else tier = "25k";

    const fundedRules = FUNDED_RULES[tier];
    const profitSplit = safeParseFloat(challenge.profitSplit, 0.80);
    const payoutCap = safeParseFloat(challenge.payoutCap, fundedRules.payoutCap);
    const activeTradingDays = challenge.activeTradingDays || 0;
    const consistencyFlagged = challenge.consistencyFlagged || false;

    // Payout cycle: bi-weekly (14 days)
    const cycleLength = 14;
    const daysSinceCycleStart = challenge.payoutCycleStart
        ? Math.floor((Date.now() - new Date(challenge.payoutCycleStart).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    const daysUntilPayout = Math.max(0, cycleLength - daysSinceCycleStart);

    const netProfit = equity - startingBalance;
    const hasMinTradingDays = activeTradingDays >= fundedRules.minTradingDays;
    const eligible = netProfit > 0 && hasMinTradingDays;

    return {
        tier,
        profitSplit,
        payoutCap,
        activeTradingDays,
        requiredTradingDays: fundedRules.minTradingDays,
        consistencyFlagged,
        lastActivityAt: challenge.lastActivityAt,
        payoutCycleStart: challenge.payoutCycleStart,
        daysUntilPayout,
        netProfit,
        eligible,
        hasViolations: false,
        maxTotalDrawdown: fundedRules.maxTotalDrawdown,
        maxDailyDrawdown: fundedRules.maxDailyDrawdown,
    };
}
