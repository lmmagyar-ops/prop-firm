import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "../lib/logger";
const logger = createLogger("DailyReset");

/**
 * DailyResetWorker: The Risk Snapshotter.
 * Runs daily (00:00 UTC) to snapshot the user's EQUITY (balance + position values).
 * This sets the baseline for the daily drawdown rule.
 *
 * Per Mat: SOD should be equity, not just cash balance.
 * Uses stored currentPrice from positions table (updated every 30s by risk monitor).
 */
async function runDailyReset() {
    // AUDIT FIX: Only run at midnight UTC (0:00-0:59 window)
    // Prevents incorrect SOD snapshots after mid-day deploys
    const currentHour = new Date().getUTCHours();
    if (currentHour !== 0) {
        return; // Not midnight UTC, skip
    }

    logger.info("[DailyReset] 🌅 Starting Daily Snapshot...");

    // Get today's date in UTC (YYYY-MM-DD)
    const todayUTC = new Date().toISOString().split('T')[0];

    // 1. Fetch all ACTIVE challenges
    const activeChallenges = await db.select().from(challenges).where(eq(challenges.status, "active"));

    logger.info(`[DailyReset] Checking ${activeChallenges.length} active accounts.`);

    let resetCount = 0;
    let skippedCount = 0;

    for (const challenge of activeChallenges) {
        // Idempotency Check: Skip if already reset today
        const lastResetDate = challenge.lastDailyResetAt?.toISOString().split('T')[0];
        if (lastResetDate === todayUTC) {
            skippedCount++;
            continue; // Already reset today
        }

        // Calculate equity = balance + sum(position values)
        // Uses stored currentPrice (updated every 30s by risk monitor)
        const openPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challenge.id),
                eq(positions.status, 'OPEN')
            ),
        });

        const cashBalance = parseFloat(challenge.currentBalance);
        let positionValue = 0;
        for (const pos of openPositions) {
            const shares = parseFloat(pos.shares);
            // currentPrice is already direction-adjusted in DB
            const price = pos.currentPrice
                ? parseFloat(pos.currentPrice)
                : parseFloat(pos.entryPrice);
            positionValue += shares * price;
        }

        const equity = cashBalance + positionValue;

        // 2. Set StartOfDay = EQUITY (not just cash) + Mark as reset
        await db.update(challenges)
            .set({
                startOfDayBalance: equity.toFixed(2),
                lastDailyResetAt: new Date()
            })
            .where(eq(challenges.id, challenge.id));

        logger.info(`[DailyReset] ${challenge.id.slice(0, 8)}: cash=$${cashBalance.toFixed(2)}, positions=$${positionValue.toFixed(2)}, equity=$${equity.toFixed(2)}`);
        resetCount++;
    }

    logger.info(`[DailyReset] ✅ Snapshots complete. Reset: ${resetCount}, Skipped (already done): ${skippedCount}`);
}

// Daemon Check
logger.info("[DailyReset] Daemon started.");

// In PROD: Use node-cron or simple setInterval check for hour === 0
// DEMO MODE: specific interval
const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour
runDailyReset(); // Run once on startup to init dev env

setInterval(runDailyReset, CHECK_INTERVAL);
