import { db } from "@/db";
import { positions, challenges } from "@/db/schema";
import { eq, and, lt, isNull, or, sql } from "drizzle-orm";

/**
 * FeeSweeper: The "Stick" of the Velocity Engine.
 * Penalizes passive holding by charging 0.1% per day on open positions.
 */
async function runFeeSweep() {
    console.log("[FeeSweeper] Starting sweep...");

    // 1. Find Stale Positions
    // Criteria: Status OPEN AND
    // (openedAt < 24h ago AND lastFeeChargedAt IS NULL) OR (lastFeeChargedAt < 24h ago)

    // For MVP Demo simplicity: We'll check for anything opened > 1 minute ago to demonstrate it working
    // In PROD: Replace '1 minute' with '24 hours'
    const STALE_INTERVAL = "1 minute"; // DEMO MODE VELOCITY
    const FEE_RATE = 0.001; // 0.1%

    const stalePositions = await db.execute(sql`
        SELECT * FROM positions 
        WHERE status = 'OPEN' 
        AND (
            (last_fee_charged_at IS NULL AND opened_at < NOW() - INTERVAL ${sql.raw(`'${STALE_INTERVAL}'`)})
            OR 
            (last_fee_charged_at < NOW() - INTERVAL ${sql.raw(`'${STALE_INTERVAL}'`)})
        )
    `);

    // Drizzle `execute` returns exact rows in PostgreSQL? It returns a Result object. 
    // Let's use Query Builder for safety if possible, but complex interval math is easier in raw SQL.
    // Actually, let's just query all OPEN positions and filter in JS for safety/clarity in this MVP.

    // Use standard Query Builder for robustness
    const allOpenPositions = await db.select({
        id: positions.id,
        challengeId: positions.challengeId,
        sizeAmount: positions.sizeAmount,
        lastFeeChargedAt: positions.lastFeeChargedAt,
        openedAt: positions.openedAt,
        feesPaid: positions.feesPaid,
        marketId: positions.marketId,
        // We need challenge balance, so let's use a join or just fetch separately inside loop (n+1 but safer for this cron)
        // Or Join:
    }).from(positions)
        .where(eq(positions.status, "OPEN"));

    // Fetch challenges separately to avoid complex JOIN typing issues in this worker
    let chargedCount = 0;

    for (const pos of allOpenPositions) {
        if (!pos.challengeId) continue;

        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, pos.challengeId)
        });

        if (!challenge) continue;

        const now = new Date();
        const lastCharge = pos.lastFeeChargedAt ? new Date(pos.lastFeeChargedAt) : new Date(pos.openedAt!);
        const diffMs = now.getTime() - lastCharge.getTime();

        // Demo: 1 Minute = 60000ms. Prod: 24 Hours = 86400000ms
        const THRESHOLD_MS = 60 * 1000;

        if (diffMs > THRESHOLD_MS) {
            // CHARGE!
            const size = parseFloat(pos.sizeAmount);
            const fee = size * FEE_RATE;

            await db.transaction(async (tx) => {
                // 1. Deduct from Balance
                // We fetched 'challenge' above
                const currentBal = parseFloat(challenge.currentBalance);
                const newBal = currentBal - fee;

                await tx.update(challenges)
                    .set({ currentBalance: newBal.toString() })
                    .where(eq(challenges.id, pos.challengeId!));

                // 2. Update Position
                const currentFees = parseFloat(pos.feesPaid || "0");
                await tx.update(positions)
                    .set({
                        feesPaid: (currentFees + fee).toString(),
                        lastFeeChargedAt: new Date()
                    })
                    .where(eq(positions.id, pos.id));

                console.log(`[FeeSweeper] ⚡ CHARGED $${fee.toFixed(2)} on Position ${pos.marketId}. New Bal: $${newBal.toFixed(2)}`);
            });
            chargedCount++;
        }
    }

    if (chargedCount > 0) console.log(`[FeeSweeper] Sweep complete. Charged ${chargedCount} positions.`);
}

// Run loop
console.log("[FeeSweeper] Daemon started.");
setInterval(runFeeSweep, 10000); // Check every 10s
