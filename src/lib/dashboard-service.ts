import { db } from "@/db";
import { challenges, positions, trades, users } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { FUNDED_RULES, type FundedTier } from "@/lib/funded-rules";
import { calculatePositionMetrics } from "@/lib/position-utils";
import { normalizeRulesConfig } from "@/lib/normalize-rules";
import { safeParseFloat } from "./safe-parse";
import { softInvariant } from "./invariant";
import { isValidMarketPrice } from "./price-validation";
import { getCategories } from "@/workers/market-classifier";

// ── Lightweight DB row interfaces (fields accessed by pure functions) ──
export interface DbChallengeRow {
    id: string;
    startedAt: string | Date | null;
    endsAt: string | Date | null;
    startingBalance: string | number;
    currentBalance: string | number;
    highWaterMark: string | number | null;
    startOfDayBalance: string | number | null;
    startOfDayEquity: string | number | null;
    phase: string;
    status: string;
    platform: string | null;
    rulesConfig: unknown;
    profitSplit?: string | number | null;
    payoutCap?: string | number | null;
    activeTradingDays?: number | null;
    consistencyFlagged?: boolean | null;
    lastActivityAt?: string | Date | null;
    payoutCycleStart?: string | Date | null;
}

export interface DbPositionRow {
    id: string;
    marketId: string;
    direction: string;
    entryPrice: string | number;
    currentPrice: string | number | null;
    shares: string | number;
    sizeAmount: string | number;
    openedAt: string | Date | null;
}

// ─── Pure functions (extracted for independent testability) ─────────

/**
 * Map raw DB challenge rows into a UI-ready sorted array.
 * Pure function — no I/O.
 */
export function mapChallengeHistory(challengesList: DbChallengeRow[]) {
    return challengesList.map((c, idx) => ({
        id: c.id,
        accountNumber: `CH-${c.startedAt ? new Date(c.startedAt).getFullYear() : 'XXXX'}-${String(idx + 1).padStart(3, '0')}`,
        challengeType: `$${safeParseFloat(c.startingBalance).toLocaleString()} Challenge`,
        phase: c.phase,
        status: c.status,
        finalPnL: c.status !== 'active' ? safeParseFloat(c.currentBalance) - safeParseFloat(c.startingBalance) : null,
        startedAt: c.startedAt,
        completedAt: c.status !== 'active' ? c.endsAt : null,
        platform: c.platform || "polymarket",
    })).sort((a, b) => {
        const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
        const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
        return timeB - timeA;
    });
}

/**
 * Enrich raw DB positions with live prices, market titles, and calculated PnL.
 * Pure function — receives pre-fetched data, does no I/O.
 */
export function getPositionsWithPnL(
    openPositions: DbPositionRow[],
    livePrices: Map<string, { price: string; source?: string }>,
    marketTitles: Map<string, string>,
) {
    return openPositions.map(pos => {
        const entry = safeParseFloat(pos.entryPrice);
        const shares = safeParseFloat(pos.shares);

        if (isNaN(entry) || isNaN(shares) || shares <= 0) {
            return null;
        }

        const livePrice = livePrices.get(pos.marketId);

        let rawPrice: number;
        let needsDirectionAdjustment: boolean;

        if (livePrice) {
            const parsedLivePrice = safeParseFloat(livePrice.price);
            if (isValidMarketPrice(parsedLivePrice)) {
                rawPrice = parsedLivePrice;
                needsDirectionAdjustment = true;
            } else {
                rawPrice = safeParseFloat(pos.currentPrice || pos.entryPrice);
                needsDirectionAdjustment = false;
            }
        } else {
            rawPrice = safeParseFloat(pos.currentPrice || pos.entryPrice);
            needsDirectionAdjustment = false;
        }

        let effectiveCurrentPrice: number;
        let unrealizedPnL: number;
        let positionValue: number;

        if (needsDirectionAdjustment) {
            const metrics = calculatePositionMetrics(shares, entry, rawPrice, pos.direction as 'YES' | 'NO');
            effectiveCurrentPrice = metrics.effectiveCurrentPrice;
            unrealizedPnL = metrics.unrealizedPnL;
            positionValue = metrics.positionValue;
        } else {
            // Stored prices (currentPrice, entryPrice) are ALREADY direction-adjusted in DB.
            // DO NOT use calculatePositionMetrics here — it would double-adjust the price.
            effectiveCurrentPrice = rawPrice;
            positionValue = shares * effectiveCurrentPrice;
            unrealizedPnL = (effectiveCurrentPrice - entry) * shares;
        }

        return {
            id: pos.id,
            marketId: pos.marketId,
            marketTitle: marketTitles.get(pos.marketId) || `Market ${pos.marketId.slice(0, 8)}...`,
            direction: pos.direction as 'YES' | 'NO',
            sizeAmount: safeParseFloat(pos.sizeAmount),
            shares,
            entryPrice: entry,
            currentPrice: effectiveCurrentPrice,
            unrealizedPnL,
            positionValue,
            openedAt: pos.openedAt ? new Date(pos.openedAt).toISOString() : new Date().toISOString(),
            priceSource: livePrice?.source || 'stored',
        };
    }).filter((p): p is NonNullable<typeof p> => p !== null);
}

/**
 * Calculate equity stats (PnL, drawdown, profit progress) from challenge + equity.
 * Pure function — no I/O.
 */
export function getEquityStats(challenge: DbChallengeRow, equity: number, startingBalance: number, cashBalance?: number) {
    const hwmParsed = safeParseFloat(challenge.highWaterMark);
    const highWaterMark = hwmParsed > 0 ? hwmParsed : startingBalance;
    const sodParsed = safeParseFloat(challenge.startOfDayBalance);
    const startOfDayBalance = sodParsed > 0 ? sodParsed : startingBalance;

    const rawRules = challenge.rulesConfig as Record<string, unknown> | null;
    const rules = rawRules || {};
    const normalized = normalizeRulesConfig(rules, startingBalance);
    const profitTarget = normalized.profitTarget;
    const maxDrawdownLimit = normalized.maxDrawdown;

    const dailyDrawdownPercent = (rules.maxDailyDrawdownPercent as number) || 0.04;
    const dailyDrawdownLimit = dailyDrawdownPercent * startingBalance;

    const totalPnL = equity - startingBalance;

    // Daily PnL uses startOfDayEquity (true equity at midnight = cash + position value).
    // startOfDayBalance is cash-only and is intentionally kept for the risk engine's
    // daily drawdown limit. Mixing the two creates phantom gains equal to open position value.
    // If null (account created before this column was added), we suppress the display rather
    // than show a misleading number.
    const sodeRaw = challenge.startOfDayEquity !== undefined ? safeParseFloat(challenge.startOfDayEquity) : NaN;
    const startOfDayEquity = !isNaN(sodeRaw) && sodeRaw > 0 ? sodeRaw : null;
    const dailyPnL: number | null = startOfDayEquity !== null ? equity - startOfDayEquity : null;

    const drawdownAmount = Math.max(0, highWaterMark - equity);
    const dailyDrawdownAmount = Math.max(0, startOfDayBalance - equity);

    const drawdownUsage = (drawdownAmount / maxDrawdownLimit) * 100;
    const dailyDrawdownUsage = (dailyDrawdownAmount / dailyDrawdownLimit) * 100;

    const profitProgress = Math.max(0, Math.min(100, (totalPnL / profitTarget) * 100));

    // DYNAMIC DENOMINATOR: Mat's formula — shows how much room exists between
    // start-of-day equity and the absolute floor, not the static max drawdown.
    // floor = startingBalance - maxDrawdownLimit (e.g., $10K - $1K = $9K)
    // allowance = startOfDayBalance - floor (dynamic, grows with profits)
    const floor = startingBalance - maxDrawdownLimit;
    const maxDrawdownAllowance = Math.max(0, startOfDayBalance - floor);

    return { totalPnL, dailyPnL, drawdownUsage, dailyDrawdownUsage, profitProgress, drawdownAmount, dailyDrawdownAmount, maxDrawdownAllowance, maxDrawdownLimit };
}

// ─── Trade-level category stats (pure function) ───────────────────

interface TradeForCategory {
    marketId: string;
    realizedPnL: string | null;
}

/**
 * Compute the user's best market category from their SELL trade history.
 * "Best" = highest win rate among categories with ≥2 closed trades.
 * Ties broken by total trade count (more trades = more confidence).
 * Pure function — no I/O.
 */
export function computeBestMarketCategory(
    sellTrades: TradeForCategory[],
    marketTitles: Map<string, string>,
): string | null {
    if (sellTrades.length === 0) return null;

    // Group trades by category
    const categoryStats = new Map<string, { wins: number; total: number }>();

    for (const trade of sellTrades) {
        const title = marketTitles.get(trade.marketId);
        if (!title) continue;

        // Classify using the same keyword engine as the risk system
        const categories = getCategories(null, title);
        if (categories.length === 0) continue;

        const isWin = safeParseFloat(trade.realizedPnL) > 0;

        for (const category of categories) {
            // Skip meta-categories that aren't trading categories
            if (category === 'Breaking' || category === 'New') continue;

            const existing = categoryStats.get(category) || { wins: 0, total: 0 };
            existing.total++;
            if (isWin) existing.wins++;
            categoryStats.set(category, existing);
        }
    }

    // Find category with highest win rate (min 2 trades to avoid noise)
    let bestCategory: string | null = null;
    let bestWinRate = -1;
    let bestTotalTrades = 0;

    for (const [category, stats] of categoryStats) {
        if (stats.total < 2) continue;

        const winRate = stats.wins / stats.total;
        if (
            winRate > bestWinRate ||
            (winRate === bestWinRate && stats.total > bestTotalTrades)
        ) {
            bestCategory = category;
            bestWinRate = winRate;
            bestTotalTrades = stats.total;
        }
    }

    return bestCategory;
}

/**
 * Calculate funded account stats (tier, payout eligibility, cycle timing).
 * Pure function — no I/O.
 */
export function getFundedStats(challenge: DbChallengeRow, equity: number, startingBalance: number) {
    let tier: FundedTier;
    if (startingBalance <= 5000) {
        tier = "5k";
    } else if (startingBalance <= 10000) {
        tier = "10k";
    } else {
        tier = "25k";
    }

    const fundedRules = FUNDED_RULES[tier];
    const profitSplit = safeParseFloat(challenge.profitSplit, 0.80);
    const payoutCap = safeParseFloat(challenge.payoutCap, fundedRules.payoutCap);
    const activeTradingDays = challenge.activeTradingDays || 0;
    const consistencyFlagged = challenge.consistencyFlagged || false;
    const lastActivityAt = challenge.lastActivityAt ? new Date(challenge.lastActivityAt) : null;
    const payoutCycleStart = challenge.payoutCycleStart ? new Date(challenge.payoutCycleStart) : null;

    const cycleLength = 14;
    const daysSinceCycleStart = payoutCycleStart
        ? Math.floor((Date.now() - new Date(payoutCycleStart).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    const daysUntilPayout = Math.max(0, cycleLength - daysSinceCycleStart);

    const netProfit = equity - startingBalance;
    const hasMinTradingDays = activeTradingDays >= fundedRules.minTradingDays;
    const hasProfit = netProfit > 0;
    const eligible = hasProfit && hasMinTradingDays;

    return {
        tier,
        profitSplit,
        payoutCap,
        activeTradingDays,
        requiredTradingDays: fundedRules.minTradingDays,
        consistencyFlagged,
        lastActivityAt,
        payoutCycleStart,
        daysUntilPayout,
        netProfit,
        eligible,
        hasViolations: false,
        maxTotalDrawdown: fundedRules.maxTotalDrawdown,
        maxDailyDrawdown: fundedRules.maxDailyDrawdown,
    };
}

export async function getDashboardData(userId: string) {
    // MOCK DATA BYPASS - REMOVED (Now using real DB for everyone)
    // if (userId.startsWith("demo-user")) { ... }

    // 1. Get user info + all challenges in parallel (no dependency between them)
    const [user, allChallenges] = await Promise.all([
        db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { displayName: true, email: true }
        }),
        db.query.challenges.findMany({
            where: eq(challenges.userId, userId),
        }),
    ]);

    if (!user) {
        return null;
    }

    const totalChallengesStarted = allChallenges.length;
    const challengesCompleted = allChallenges.filter(c => c.status === 'passed').length;
    const challengesFailed = allChallenges.filter(c => c.status === 'failed').length;
    const successRate = totalChallengesStarted > 0
        ? (challengesCompleted / totalChallengesStarted) * 100
        : 0;

    // Calculate total profit from completed challenges
    const totalProfitEarned = allChallenges
        .filter(c => c.status === 'passed')
        .reduce((sum, c) => {
            const profit = safeParseFloat(c.currentBalance) - safeParseFloat(c.startingBalance);
            return sum + Math.max(0, profit);
        }, 0);

    // 2b. Calculate REAL trade-level stats from trades table
    // Get all challenge IDs for this user
    const challengeIds = allChallenges.map(c => c.id);
    type TradeRow = { id: string; type: string; marketId: string; realizedPnL: string | null; executedAt: Date | null };
    const allTradesResult: TradeRow[] = [];

    if (challengeIds.length > 0) {
        // PERF: Single query for ALL trades across all challenges (fixes N+1)
        const chTrades = await db.query.trades.findMany({
            where: inArray(trades.challengeId, challengeIds),
            columns: { id: true, type: true, marketId: true, realizedPnL: true, executedAt: true },
            orderBy: [desc(trades.executedAt)],
        });
        allTradesResult.push(...(chTrades as TradeRow[]));
    }

    const totalTradeCount = allTradesResult.length;
    const sellTrades = allTradesResult.filter((t: TradeRow) => t.type === 'SELL');
    const winningTrades = sellTrades.filter((t: TradeRow) => safeParseFloat(t.realizedPnL) > 0);
    const tradeWinRate = sellTrades.length > 0
        ? (winningTrades.length / sellTrades.length) * 100
        : null; // null = no closed trades yet (UI shows "—" instead of misleading "0%")

    // Calculate current win streak (consecutive profitable SELL trades, most recent first)
    let currentWinStreak = 0;
    for (const t of sellTrades) {
        if (safeParseFloat(t.realizedPnL) > 0) {
            currentWinStreak++;
        } else {
            break;
        }
    }

    // Sum realized PnL from all SELL trades
    const totalRealizedPnL = sellTrades.reduce((sum: number, t: TradeRow) => sum + safeParseFloat(t.realizedPnL), 0);

    // Compute best market category from SELL trade history + market titles
    const sellTradeMarketIds = [...new Set(sellTrades.map(t => t.marketId))];
    const marketModule = await import("./market");
    const tradeMarketTitles = sellTradeMarketIds.length > 0
        ? await marketModule.MarketService.getBatchTitles(sellTradeMarketIds)
        : new Map<string, string>();
    const bestMarketCategory = computeBestMarketCategory(sellTrades, tradeMarketTitles);

    const lifetimeStats = {
        totalChallengesStarted,
        challengesCompleted,
        challengesFailed,
        successRate,
        totalProfitEarned: totalProfitEarned > 0 ? totalProfitEarned : Math.max(0, totalRealizedPnL),
        bestMarketCategory,
        currentWinStreak,
        avgTradeWinRate: tradeWinRate,
        // NEW: trade-level stats
        totalTradeCount,
        tradeWinRate,
        totalRealizedPnL,
    };

    // mapChallengeHistory is now a top-level exported function

    // 3. Find active challenge (single active challenge per user — no cookie selection)
    type ChallengeType = typeof allChallenges[number];
    let activeChallenge: ChallengeType | undefined = undefined;
    let pendingChallenge: ChallengeType | undefined = undefined;

    // Derive active + pending from the allChallenges we already fetched (zero extra queries)
    const activeChallenges = allChallenges.filter(c => c.status === "active");
    pendingChallenge = allChallenges.find(c => c.status === "pending");
    activeChallenge = activeChallenges[0];

    // Common history data
    const challengeHistory = mapChallengeHistory(allChallenges);

    if (!activeChallenge) {
        return {
            user,
            lifetimeStats,
            hasActiveChallenge: false,
            challengeHistory,
            pendingChallenge: pendingChallenge ? {
                id: pendingChallenge.id,
                status: pendingChallenge.status,
                type: "10k Challenge" // hardcoded for MVP or derived
            } : null,
            // Return empty structures for safety if UI expects them
            activeChallenge: undefined,
            positions: [],
            stats: undefined
        };
    }

    // 4. Get open positions for active challenge (only OPEN status, exclude closed)
    const openPositions = await db.query.positions.findMany({
        where: and(
            eq(positions.challengeId, activeChallenge.id),
            eq(positions.status, 'OPEN')
        ),
    });

    // 5. Calculate position values FIRST (needed for equity-based stats)
    // Import MarketService early for position valuation
    const { MarketService } = await import("./market");
    const marketIds = openPositions.map(p => p.marketId);
    // PERF: Parallelize order book prices + titles (independent Redis calls)
    const [livePrices, marketTitles] = await Promise.all([
        marketIds.length > 0 ? MarketService.getBatchOrderBookPrices(marketIds) : Promise.resolve(new Map()),
        MarketService.getBatchTitles(marketIds),
    ]);

    // Enrich positions with live prices (delegates to extracted pure function)
    const positionsWithPnL = getPositionsWithPnL(openPositions, livePrices, marketTitles);


    // 6. Calculate TRUE EQUITY (cash + position value)
    const cashBalance = safeParseFloat(activeChallenge.currentBalance);
    const startingBalance = safeParseFloat(activeChallenge.startingBalance);

    const totalPositionValue = positionsWithPnL.reduce((sum, p) => sum + p.positionValue, 0);
    const equity = cashBalance + totalPositionValue;

    // 7. Calculate stats using extracted pure functions
    // Pass cashBalance so getEquityStats can compare equity vs startOfDayEquity accurately.
    const stats = getEquityStats(activeChallenge, equity, startingBalance, cashBalance);

    // Runtime invariants — catch impossible states at the source
    softInvariant(equity >= 0, "Negative equity in dashboard", { userEmail: user.email, equity, cashBalance, totalPositionValue });
    softInvariant(!isNaN(stats.totalPnL), "PnL is NaN", { userEmail: user.email, equity, startingBalance });
    softInvariant(stats.drawdownUsage <= 200, "Impossible drawdown percentage", { userEmail: user.email, drawdownUsage: stats.drawdownUsage });

    // Safe fallbacks (needed for return object)
    const hwmParsed = safeParseFloat(activeChallenge.highWaterMark);
    const highWaterMark = hwmParsed > 0 ? hwmParsed : startingBalance;
    const sodParsed = safeParseFloat(activeChallenge.startOfDayBalance);
    const startOfDayBalance = sodParsed > 0 ? sodParsed : startingBalance;
    const rawRules = activeChallenge.rulesConfig as Record<string, unknown> | null;
    const rules = rawRules || {};

    // 8. Funded-specific data
    const isFunded = activeChallenge.phase === 'funded';
    const fundedStatsResult = isFunded ? getFundedStats(activeChallenge, equity, startingBalance) : null;

    return {
        user,
        lifetimeStats,
        hasActiveChallenge: true,
        activeChallenge: {
            id: activeChallenge.id,
            phase: activeChallenge.phase,
            status: activeChallenge.status,
            startingBalance,
            currentBalance: cashBalance, // Cash balance (for backwards compatibility)
            equity, // TRUE equity = cash + position value
            highWaterMark,
            startOfDayBalance,
            rulesConfig: rules,
            startedAt: activeChallenge.startedAt,
            endsAt: activeChallenge.endsAt,
            platform: activeChallenge.platform || "polymarket",
            pendingFailureAt: activeChallenge.pendingFailureAt?.toISOString() ?? null,
        },
        positions: positionsWithPnL,
        stats,
        challengeHistory,
        // Funded-specific data
        isFunded,
        fundedStats: fundedStatsResult,
    };
}
