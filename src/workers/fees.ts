import { db } from "@/db";
import { positions, challenges, businessRules } from "@/db/schema";
import { eq, and, lte, isNull } from "drizzle-orm";
import { TRADING_CONFIG } from "@/config/trading";

// Configuration from centralized config
const FEE_RATE = TRADING_CONFIG.fees.carryFeeRate;
const THRESHOLD_MS = TRADING_CONFIG.fees.stalePeriodMs;

/**
 * FeeSweeper: Simulates "Carry Cost" or "Funding Fees"
 * 
 * In a real prop firm, holding positions overnight costs money (swaps).
 * Since this is a high-velocity demo, we charge fees every X minutes/hours
 * to force the user to manage their PnL actively.
 */
export async function runFeeSweep() {
    console.log("🧹 [FeeSweeper] Starting sweep...");

    try {
        const now = new Date();
        const staleThreshold = new Date(now.getTime() - THRESHOLD_MS);

        // 1. Find Open Positions that haven't been charged recently
        // Logic: openedAt < threshold AND (lastFeeChargedAt IS NULL OR lastFeeChargedAt < threshold)
        const stalePositions = await db.query.positions.findMany({
            where: and(
                eq(positions.status, "OPEN"),
                lte(positions.openedAt, staleThreshold)
            )
        });

        // Refined Filter in memory for granular control
        const chargeablePositions = stalePositions.filter(pos => {
            const openedAt = pos.openedAt ? new Date(pos.openedAt) : new Date();
            const lastCharged = pos.lastFeeChargedAt ? new Date(pos.lastFeeChargedAt) : null;

            // Position must have been opened before the threshold
            if (openedAt.getTime() >= staleThreshold.getTime()) {
                return false;
            }

            // If never charged, it's chargeable
            if (!lastCharged) {
                return true;
            }

            // If last charged before the threshold, it's chargeable again
            return lastCharged.getTime() < staleThreshold.getTime();
        });

        console.log(`🧹 [FeeSweeper] Found ${chargeablePositions.length} positions to charge.`);

        let chargedCount = 0;
        for (const pos of chargeablePositions) {
            await chargeFee(pos);
            chargedCount++;
        }

        if (chargedCount > 0) console.log(`🧹 [FeeSweeper] Sweep complete. Charged ${chargedCount} positions.`);

    } catch (error) {
        console.error("🧹 [FeeSweeper] Error:", error);
    }
}

async function chargeFee(position: any) {
    // Transaction to ensure balance deduction and position update happen together
    await db.transaction(async (tx) => {
        // 1. Calculate Fee
        const entryPrice = parseFloat(position.entryPrice);
        const shares = parseFloat(position.shares);
        const notional = entryPrice * shares;
        const fee = notional * FEE_RATE;

        // 2. Deduct from Challenge Balance
        const challenge = await tx.query.challenges.findFirst({
            where: eq(challenges.id, position.challengeId)
        });

        if (!challenge) return; // Should not happen

        const currentBalance = parseFloat(challenge.currentBalance);
        const newBalance = currentBalance - fee;

        await tx.update(challenges)
            .set({ currentBalance: newBalance.toString() })
            .where(eq(challenges.id, challenge.id));

        // 3. Update Position Metadata
        const currentFees = parseFloat(position.feesPaid || "0");
        await tx.update(positions)
            .set({
                feesPaid: (currentFees + fee).toString(),
                lastFeeChargedAt: new Date()
            })
            .where(eq(positions.id, position.id));

        console.log(`   💸 Charged $${fee.toFixed(2)} on Position ${position.id} (Challenge ${challenge.id})`);
    });
}

// Start the worker if this file is run directly (e.g. via separate process)
// In Next.js, this might be called via a Cron Job or API route.
// For the DEMO, we can start a lightweight interval if imported.
if (process.env.NEXT_RUNTIME === 'nodejs') {
    setInterval(runFeeSweep, TRADING_CONFIG.fees.sweepIntervalMs);
}
