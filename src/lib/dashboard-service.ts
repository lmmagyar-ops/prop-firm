import { db } from "@/db";
import { challenges, positions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { FUNDED_RULES, type FundedTier } from "@/lib/funded-rules";

export async function getDashboardData(userId: string) {
    // MOCK DATA BYPASS - REMOVED (Now using real DB for everyone)
    // if (userId.startsWith("demo-user")) { ... }

    // 1. Get user info
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { displayName: true, email: true }
    });

    if (!user) {
        return null;
    }

    // 2. Calculate lifetime stats
    const allChallenges = await db.query.challenges.findMany({
        where: eq(challenges.userId, userId),
    });

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
            const profit = parseFloat(c.currentBalance) - parseFloat(c.startingBalance);
            return sum + Math.max(0, profit);
        }, 0);

    const lifetimeStats = {
        totalChallengesStarted,
        challengesCompleted,
        challengesFailed,
        successRate,
        totalProfitEarned,
        bestMarketCategory: null, // Will implement when trade history exists
        currentWinStreak: null, // Calculate streak
        avgTradeWinRate: null, // Calculate from trades
    };

    // Helper to map challenge history with safe dates
    const mapChallengeHistory = (challengesList: typeof allChallenges) => {
        return challengesList.map((c, idx) => ({
            id: c.id,
            accountNumber: `CH-${c.startedAt ? new Date(c.startedAt).getFullYear() : 'XXXX'}-${String(idx + 1).padStart(3, '0')}`,
            challengeType: `$${parseFloat(c.startingBalance).toLocaleString()} Challenge`,
            phase: c.phase,
            status: c.status,
            finalPnL: c.status !== 'active' ? parseFloat(c.currentBalance) - parseFloat(c.startingBalance) : null,
            startedAt: c.startedAt,
            completedAt: c.status !== 'active' ? c.endsAt : null,
            platform: c.platform || "polymarket",
        })).sort((a, b) => {
            const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
            const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
            return timeB - timeA;
        });
    };

    // 3. Find active challenge
    const activeChallenge = await db.query.challenges.findFirst({
        where: and(
            eq(challenges.userId, userId),
            eq(challenges.status, "active")
        ),
    });

    // Common history data
    const challengeHistory = mapChallengeHistory(allChallenges);

    // 3b. Find PENDING challenge (if no active one, or maybe even if there is one? Usually only one allowed)
    const pendingChallenge = await db.query.challenges.findFirst({
        where: and(
            eq(challenges.userId, userId),
            eq(challenges.status, "pending")
        ),
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
                type: "10k Challenge" // hardcoded for MVP or derived
            } : null,
            // Return empty structures for safety if UI expects them
            activeChallenge: undefined,
            positions: [],
            stats: undefined
        };
    }

    // 4. Get open positions for active challenge
    const openPositions = await db.query.positions.findMany({
        where: eq(positions.challengeId, activeChallenge.id),
    });

    // 5. Calculate stats for active challenge
    const rules = activeChallenge.rulesConfig as any;
    const currentBalance = parseFloat(activeChallenge.currentBalance);
    const startingBalance = parseFloat(activeChallenge.startingBalance);
    const highWaterMark = parseFloat(activeChallenge.highWaterMark || "0");
    const startOfDayBalance = parseFloat(activeChallenge.startOfDayBalance || startingBalance.toString());

    const totalPnL = currentBalance - startingBalance;
    const dailyPnL = currentBalance - startOfDayBalance;

    const maxDrawdownLimit = rules.maxDrawdown || 1000;
    const dailyDrawdownLimit = rules.maxDailyDrawdown || 500;

    // Drawdown amounts should be positive values representing distance from peak/SOD
    const drawdownAmount = Math.max(0, highWaterMark - currentBalance);
    const dailyDrawdownAmount = Math.max(0, startOfDayBalance - currentBalance);

    const drawdownUsage = (drawdownAmount / maxDrawdownLimit) * 100;
    const dailyDrawdownUsage = (dailyDrawdownAmount / dailyDrawdownLimit) * 100;

    const profitProgress = Math.min(100, (totalPnL / rules.profitTarget) * 100);

    // 6. Calculate unrealized P&L for positions using LIVE prices from ORDER BOOKS
    // This ensures PnL display matches the prices used for trade execution
    const { MarketService } = await import("./market");
    const marketIds = openPositions.map(p => p.marketId);
    const livePrices = marketIds.length > 0 ? await MarketService.getBatchOrderBookPrices(marketIds) : new Map();

    // Fetch market titles from Redis event lists
    const marketTitles = await MarketService.getBatchTitles(marketIds);

    const positionsWithPnL = openPositions.map(pos => {
        const entry = parseFloat(pos.entryPrice);
        const shares = parseFloat(pos.shares);

        // Use live price from Redis, fallback to stored price
        const livePrice = livePrices.get(pos.marketId);
        const rawPrice = livePrice ? parseFloat(livePrice.price) : parseFloat(pos.currentPrice || pos.entryPrice);

        // Handle NO direction: P&L is inverted (profit when price drops)
        // For NO positions: effective value = 1 - yesPrice
        const isNo = pos.direction === 'NO';
        const effectiveCurrentValue = isNo ? (1 - rawPrice) : rawPrice;
        const effectiveEntryValue = isNo ? (1 - entry) : entry;
        const unrealizedPnL = (effectiveCurrentValue - effectiveEntryValue) * shares;

        return {
            id: pos.id,
            marketId: pos.marketId,
            marketTitle: marketTitles.get(pos.marketId) || `Market ${pos.marketId.slice(0, 8)}...`,
            direction: pos.direction as 'YES' | 'NO',
            sizeAmount: parseFloat(pos.sizeAmount),
            shares,
            entryPrice: entry,
            currentPrice: rawPrice,
            unrealizedPnL,
            openedAt: pos.openedAt ? new Date(pos.openedAt).toISOString() : new Date().toISOString(),
            priceSource: livePrice?.source || 'stored', // Track if using live or stale price
        };
    });

    // 7. Funded-specific data
    const isFunded = activeChallenge.phase === 'funded';
    let fundedStats = null;

    if (isFunded) {
        // Determine tier based on starting balance
        let tier: FundedTier;
        if (startingBalance <= 5000) {
            tier = "5k";
        } else if (startingBalance <= 10000) {
            tier = "10k";
        } else {
            tier = "25k";
        }

        const fundedRules = FUNDED_RULES[tier];
        const profitSplit = parseFloat(activeChallenge.profitSplit || "0.80");
        const payoutCap = parseFloat(activeChallenge.payoutCap || fundedRules.payoutCap.toString());
        const activeTradingDays = activeChallenge.activeTradingDays || 0;
        const consistencyFlagged = activeChallenge.consistencyFlagged || false;
        const lastActivityAt = activeChallenge.lastActivityAt;
        const payoutCycleStart = activeChallenge.payoutCycleStart;

        // Calculate days until next payout cycle (bi-weekly = 14 days)
        const cycleLength = 14;
        const daysSinceCycleStart = payoutCycleStart
            ? Math.floor((Date.now() - new Date(payoutCycleStart).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
        const daysUntilPayout = Math.max(0, cycleLength - daysSinceCycleStart);

        // Net profit available for payout
        const netProfit = Math.max(0, totalPnL);

        // Eligibility check (simplified - full check in PayoutService)
        const hasMinTradingDays = activeTradingDays >= fundedRules.minTradingDays;
        const hasProfit = netProfit > 0;
        const eligible = hasProfit && hasMinTradingDays;

        fundedStats = {
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
            hasViolations: false, // Would check actual violations in production
            maxTotalDrawdown: fundedRules.maxTotalDrawdown,
            maxDailyDrawdown: fundedRules.maxDailyDrawdown,
        };
    }

    return {
        user,
        lifetimeStats,
        hasActiveChallenge: true,
        activeChallenge: {
            id: activeChallenge.id,
            phase: activeChallenge.phase,
            status: activeChallenge.status,
            startingBalance,
            currentBalance,
            highWaterMark,
            startOfDayBalance,
            rulesConfig: rules,
            startedAt: activeChallenge.startedAt,
            endsAt: activeChallenge.endsAt,
            platform: activeChallenge.platform || "polymarket",
        },
        positions: positionsWithPnL,
        stats: {
            totalPnL,
            dailyPnL,
            drawdownUsage,
            dailyDrawdownUsage,
            profitProgress,
        },
        challengeHistory,
        // Funded-specific data
        isFunded,
        fundedStats,
    };
}
