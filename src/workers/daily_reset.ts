import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * DailyResetWorker: The Risk Snapshotter.
 * Runs daily (00:00 UTC) to snapshot the user's balance.
 * This sets the baseline for the "5% Daily Drawdown" rule.
 */
async function runDailyReset() {
    console.log("[DailyReset] 🌅 Starting Daily Snapshot...");

    // 1. Fetch all ACTIVE challenges
    const activeChallenges = await db.select().from(challenges).where(eq(challenges.status, "active"));

    console.log(`[DailyReset] Snapshotting ${activeChallenges.length} active accounts.`);

    for (const challenge of activeChallenges) {
        // 2. Set StartOfDay = Current
        // If they had a great day yesterday (Bal $11,000), their new 5% loss limit is based on $11k.
        // If they had a bad day (Bal $9,500), their new 5% loss limit is based on $9.5k.
        // This is "Trailing Daily".

        await db.update(challenges)
            .set({
                startOfDayBalance: challenge.currentBalance,
                updatedAt: new Date()
            })
            .where(eq(challenges.id, challenge.id));
    }

    console.log("[DailyReset] ✅ Snapshots complete.");
}

// Daemon Check
console.log("[DailyReset] Daemon started.");

// In PROD: Use node-cron or simple setInterval check for hour === 0
// DEMO MODE: specific interval
const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour
runDailyReset(); // Run once on startup to init dev env

setInterval(runDailyReset, CHECK_INTERVAL);
