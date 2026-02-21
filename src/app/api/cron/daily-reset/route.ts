import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import { safeParseFloat } from "@/lib/safe-parse";
import { getPositionsWithPnL } from "@/lib/dashboard-service";
const logger = createLogger("DailyReset");

/**
 * Daily Reset Cron Endpoint
 * 
 * Runs at 00:00 UTC to:
 * 1. FINALIZE pending failures (users who hit daily loss and didn't recover)
 * 2. Snapshot each account's balance as their "start of day" balance
 * 3. Clear pendingFailureAt flags for survivors (new day = fresh start)
 * 
 * Call this from:
 * - Vercel Cron: Add to vercel.json
 * - External cron service (Railway, Render, etc.)
 * - Manual trigger for testing
 * 
 * Security: Protected by CRON_SECRET environment variable
 */

export async function GET(request: NextRequest) {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        logger.info("[DailyReset] ⚠️ Unauthorized cron attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("[DailyReset] 🌅 Starting Daily Reset...");

    const todayUTC = new Date().toISOString().split('T')[0];

    try {
        // ============================================
        // STEP 1: Finalize Pending Failures
        // Users who hit daily loss limit and never recovered
        // ============================================
        const pendingChallenges = await db.select()
            .from(challenges)
            .where(and(
                eq(challenges.status, "active"),
                isNotNull(challenges.pendingFailureAt)
            ));

        let failedCount = 0;
        for (const challenge of pendingChallenges) {
            await db.update(challenges)
                .set({
                    status: 'failed',
                    endsAt: new Date()
                })
                .where(eq(challenges.id, challenge.id));

            logger.info(`[DailyReset] 🔴 BREACH FINALIZED: Challenge ${challenge.id.slice(0, 8)} → FAILED (daily loss not recovered)`);
            failedCount++;
        }

        if (failedCount > 0) {
            logger.info(`[DailyReset] ❌ ${failedCount} challenge(s) marked as FAILED`);
        }

        // ============================================
        // STEP 2: Snapshot Balance for Surviving Accounts
        // ============================================
        const activeChallenges = await db.select()
            .from(challenges)
            .where(eq(challenges.status, "active"));

        logger.info(`[DailyReset] Found ${activeChallenges.length} active accounts`);

        let resetCount = 0;
        let skippedCount = 0;

        for (const challenge of activeChallenges) {
            // Idempotency: Skip if already reset today
            const lastResetDate = challenge.lastDailyResetAt?.toISOString().split('T')[0];
            if (lastResetDate === todayUTC) {
                skippedCount++;
                continue;
            }

            // Compute true equity (cash + open position value) for startOfDayEquity snapshot.
            // This is separate from startOfDayBalance (cash-only) which the risk engine uses.
            // Falls back to stored currentPrice if Redis prices are unavailable.
            let startOfDayEquityValue: string;
            try {
                const openPositions = await db.query.positions.findMany({
                    where: and(
                        eq(positions.challengeId, challenge.id),
                        eq(positions.status, 'OPEN')
                    ),
                });

                let totalPositionValue = 0;
                if (openPositions.length > 0) {
                    const { MarketService } = await import("@/lib/market");
                    const marketIds = openPositions.map(p => p.marketId);
                    const [livePrices, marketTitles] = await Promise.all([
                        MarketService.getBatchOrderBookPrices(marketIds),
                        MarketService.getBatchTitles(marketIds),
                    ]);
                    const enriched = getPositionsWithPnL(openPositions, livePrices, marketTitles);
                    totalPositionValue = enriched.reduce((sum, p) => sum + p.positionValue, 0);
                }

                const cashBalance = safeParseFloat(challenge.currentBalance);
                startOfDayEquityValue = (cashBalance + totalPositionValue).toFixed(2);
            } catch (err) {
                // Fail-safe: if position valuation fails, snapshot cash-only.
                // This means dailyPnL for this account stays null for the day rather than wrong.
                logger.warn(`[DailyReset] ⚠️ Position valuation failed for ${challenge.id.slice(0, 8)}, snapshotting cash-only equity`, err as object);
                startOfDayEquityValue = String(challenge.currentBalance);
            }

            // Snapshot current balance as start-of-day balance
            // Also clear pendingFailureAt for fresh start (shouldn't be any, but defensive)
            await db.update(challenges)
                .set({
                    startOfDayBalance: challenge.currentBalance,
                    startOfDayEquity: startOfDayEquityValue,
                    lastDailyResetAt: new Date(),
                    pendingFailureAt: null  // New day = fresh start
                })
                .where(eq(challenges.id, challenge.id));

            resetCount++;
        }

        const result = {
            success: true,
            timestamp: new Date().toISOString(),
            stats: {
                failed: failedCount,
                total: activeChallenges.length,
                reset: resetCount,
                skipped: skippedCount
            }
        };

        logger.info(`[DailyReset] ✅ Complete: ${failedCount} failed, ${resetCount} reset, ${skippedCount} skipped`);

        return NextResponse.json(result);

    } catch (error) {
        logger.error("[DailyReset] ❌ Error:", error);
        return NextResponse.json(
            { error: "Daily reset failed", details: String(error) },
            { status: 500 }
        );
    }
}

// Also support POST for compatibility with some cron services
export async function POST(request: NextRequest) {
    return GET(request);
}

