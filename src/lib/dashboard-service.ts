import { db } from "@/db";
import { challenges, positions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { FUNDED_RULES, type FundedTier } from "@/lib/funded-rules";
import { calculatePositionMetrics, DEFAULT_MAX_DRAWDOWN } from "@/lib/position-utils";
import { safeParseFloat } from "./safe-parse";

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
            const profit = safeParseFloat(c.currentBalance) - safeParseFloat(c.startingBalance);
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
    };

    // 3. Find active challenge (prefer the selected one from cookie)
    // Import cookies for server-side reading
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const selectedChallengeId = cookieStore.get("selectedChallengeId")?.value;

    // If user has selected a specific challenge, try to find that one
    let activeChallenge = null;
    if (selectedChallengeId) {
        activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.id, selectedChallengeId),
                eq(challenges.userId, userId),
                eq(challenges.status, "active")
            ),
        });
    }

    // Fallback to any active challenge if selected one not found
    if (!activeChallenge) {
        activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, userId),
                eq(challenges.status, "active")
            ),
        });
    }

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
    const livePrices = marketIds.length > 0 ? await MarketService.getBatchOrderBookPrices(marketIds) : new Map();
    const marketTitles = await MarketService.getBatchTitles(marketIds);

    // Calculate position values with live prices and direction handling
    const positionsWithPnL = openPositions.map(pos => {
        const entry = safeParseFloat(pos.entryPrice);
        const shares = safeParseFloat(pos.shares);

        // Guard against NaN from invalid database values
        if (isNaN(entry) || isNaN(shares) || shares <= 0) {
            console.warn("[DashboardService] Invalid position data:", {
                id: pos.id,
                entryPrice: pos.entryPrice,
                shares: pos.shares
            });
            return null; // Mark for filtering
        }

        const livePrice = livePrices.get(pos.marketId);

        // CRITICAL: Determine if we're using raw YES price (needs adjustment) or stored price (already adjusted)
        // - Live prices from order book are RAW YES prices → need direction adjustment
        // - Stored currentPrice in DB is ALREADY direction-adjusted → no adjustment needed
        let rawPrice: number;
        let needsDirectionAdjustment: boolean;

        if (livePrice) {
            // Live price from order book is raw YES price
            const parsedLivePrice = safeParseFloat(livePrice.price);

            // SANITY CHECK: Validate price is in valid range for active markets
            if (parsedLivePrice > 0.01 && parsedLivePrice < 0.99 && !isNaN(parsedLivePrice)) {
                rawPrice = parsedLivePrice;
                needsDirectionAdjustment = true;
            } else {
                // Invalid price - log and fall back to stored
                console.warn("[DashboardService] Invalid live price detected, using stored fallback:", {
                    marketId: pos.marketId.slice(0, 12),
                    invalidPrice: livePrice.price,
                    source: livePrice.source
                });
                rawPrice = safeParseFloat(pos.currentPrice || pos.entryPrice);
                needsDirectionAdjustment = false;
            }
        } else {
            // Fallback: Use stored price (already direction-adjusted in DB)
            rawPrice = safeParseFloat(pos.currentPrice || pos.entryPrice);
            needsDirectionAdjustment = false;
        }

        // Calculate P&L with proper adjustment handling
        let effectiveCurrentPrice: number;
        let unrealizedPnL: number;
        let positionValue: number;

        if (needsDirectionAdjustment) {
            // Use shared utility for direction-adjusted calculations
            const metrics = calculatePositionMetrics(shares, entry, rawPrice, pos.direction as 'YES' | 'NO');
            effectiveCurrentPrice = metrics.effectiveCurrentPrice;
            unrealizedPnL = metrics.unrealizedPnL;
            positionValue = metrics.positionValue;
        } else {
            // Stored prices are already adjusted - use them directly
            effectiveCurrentPrice = rawPrice;
            positionValue = shares * effectiveCurrentPrice;
            unrealizedPnL = (effectiveCurrentPrice - entry) * shares;
        }

        // DEBUG: Log P&L calculation details for NO positions
        if (pos.direction === 'NO') {
            console.log(`[PNL DEBUG] ${pos.marketId.slice(0, 12)}...`, {
                direction: pos.direction,
                shares,
                storedEntry: pos.entryPrice,
                storedCurrent: pos.currentPrice,
                livePriceRaw: livePrice?.price,
                livePriceSource: livePrice?.source,
                needsAdjust: needsDirectionAdjustment,
                rawPriceUsed: rawPrice,
                effectiveEntry: entry,
                effectiveCurrentPrice,
                pnlCalc: `(${effectiveCurrentPrice.toFixed(4)} - ${entry.toFixed(4)}) * ${shares.toFixed(2)} = ${unrealizedPnL.toFixed(2)}`
            });
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
    }).filter((p): p is NonNullable<typeof p> => p !== null); // Filter out invalid positions


    // 6. Calculate TRUE EQUITY (cash + position value)
    const cashBalance = safeParseFloat(activeChallenge.currentBalance);
    const startingBalance = safeParseFloat(activeChallenge.startingBalance);

    // CRITICAL: Defensive fallback for rulesConfig to prevent server crash on malformed data
    const rawRules = activeChallenge.rulesConfig as Record<string, unknown> | null;
    const rules = rawRules || {};
    const defaultProfitTarget = startingBalance * 0.10; // 10% of starting balance
    const profitTarget = (rules.profitTarget as number) ?? defaultProfitTarget;

    // Safe fallbacks: ensure HWM and SOD are valid (not 0 or missing)
    const hwmParsed = safeParseFloat(activeChallenge.highWaterMark);
    const highWaterMark = hwmParsed > 0 ? hwmParsed : startingBalance;
    const sodParsed = safeParseFloat(activeChallenge.startOfDayBalance);
    const startOfDayBalance = sodParsed > 0 ? sodParsed : startingBalance;

    const totalPositionValue = positionsWithPnL.reduce((sum, p) => sum + p.positionValue, 0);
    const equity = cashBalance + totalPositionValue;

    // 7. Calculate stats using EQUITY (not just cash)
    const totalPnL = equity - startingBalance;
    const dailyPnL = equity - startOfDayBalance;

    const maxDrawdownLimit = (rules.maxDrawdown as number) || DEFAULT_MAX_DRAWDOWN;
    // CRITICAL FIX: DB stores maxDailyDrawdownPercent (e.g. 0.04), NOT absolute dollars.
    // Previously read `maxDailyDrawdown` which would be 0.04 instead of $400,
    // causing drawdown bar to show 2500%+ usage on any small loss.
    const dailyDrawdownPercent = (rules.maxDailyDrawdownPercent as number) || 0.04;
    const dailyDrawdownLimit = dailyDrawdownPercent * startingBalance;

    // Drawdown = distance from peak (high water mark) to current equity
    const drawdownAmount = Math.max(0, highWaterMark - equity);
    const dailyDrawdownAmount = Math.max(0, startOfDayBalance - equity);

    const drawdownUsage = (drawdownAmount / maxDrawdownLimit) * 100;
    const dailyDrawdownUsage = (dailyDrawdownAmount / dailyDrawdownLimit) * 100;

    const profitProgress = Math.max(0, Math.min(100, (totalPnL / profitTarget) * 100));

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
        const profitSplit = safeParseFloat(activeChallenge.profitSplit, 0.80);
        const payoutCap = safeParseFloat(activeChallenge.payoutCap, fundedRules.payoutCap);
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

        // Net profit for display (can be negative to show true P&L)
        // NOTE: Payout eligibility check is separate (PayoutService floors to 0)
        const netProfit = totalPnL;

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
            currentBalance: cashBalance, // Cash balance (for backwards compatibility)
            equity, // TRUE equity = cash + position value
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
