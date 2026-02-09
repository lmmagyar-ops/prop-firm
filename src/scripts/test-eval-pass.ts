/**
 * E2E Test Script: Simulate Evaluation Pass
 * 
 * This script:
 * 1. Resets challenge B4A96D6C (the failed one) to active state
 * 2. Sets its balance to just above the profit target ($11,100 for a $10k account)
 * 3. Triggers the evaluator to verify it correctly transitions to "funded" phase
 * 4. Reports the result
 * 
 * Run with: npx tsx src/scripts/test-eval-pass.ts
 */

import { db } from "@/db";
import { challenges, trades, positions } from "@/db/schema";
import { eq } from "drizzle-orm";

const CHALLENGE_ID = "b4a96d6c-2014-486e-b358-a66d0f2c4a4b";

async function main() {
    console.log("=== E2E EVALUATION PASS TEST ===\n");

    // Step 1: Get current challenge state
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, CHALLENGE_ID));
    if (!challenge) {
        console.error("Challenge not found!");
        process.exit(1);
    }

    console.log(`Challenge: ${CHALLENGE_ID.slice(0, 8)}`);
    console.log(`Current Status: ${challenge.status}`);
    console.log(`Current Phase: ${challenge.phase}`);
    console.log(`Starting Balance: $${challenge.startingBalance}`);
    console.log(`Current Balance: $${challenge.currentBalance}`);
    console.log();

    // Step 2: Reset the challenge and set balance above profit target
    const startingBalance = parseFloat(challenge.startingBalance);
    const profitTarget = startingBalance * 0.10; // 10%
    const passBalance = startingBalance + profitTarget + 100; // $100 above target

    console.log(`Profit Target: $${profitTarget} (10% of $${startingBalance})`);
    console.log(`Pass Threshold: $${startingBalance + profitTarget}`);
    console.log(`Setting balance to: $${passBalance}\n`);

    // Delete existing positions and trades for clean state
    await db.delete(trades).where(eq(trades.challengeId, CHALLENGE_ID));
    await db.delete(positions).where(eq(positions.challengeId, CHALLENGE_ID));

    // Set challenge to active with balance above target
    await db.update(challenges).set({
        currentBalance: String(passBalance),
        startOfDayBalance: String(passBalance),
        highWaterMark: String(passBalance),
        status: "active",
        phase: "challenge",
        pendingFailureAt: null,
    }).where(eq(challenges.id, CHALLENGE_ID));

    console.log("✅ Challenge reset to active with high balance");
    console.log("🔄 Triggering evaluator...\n");

    // Step 3: Trigger the evaluator
    const { ChallengeEvaluator } = await import("@/lib/evaluator");
    const result = await ChallengeEvaluator.evaluate(CHALLENGE_ID);

    // Step 4: Check result
    const [updatedChallenge] = await db.select().from(challenges).where(eq(challenges.id, CHALLENGE_ID));

    console.log("=== RESULT ===");
    console.log(`Status: ${updatedChallenge.status}`);
    console.log(`Phase: ${updatedChallenge.phase}`);
    console.log(`Balance: $${updatedChallenge.currentBalance}`);

    if (updatedChallenge.phase === "funded") {
        console.log("\n🎉 PASS TEST SUCCEEDED! Challenge transitioned to FUNDED phase!");
    } else if (updatedChallenge.status === "active" && updatedChallenge.phase === "challenge") {
        console.log("\n⚠️ Challenge still in challenge phase — evaluator may not have detected pass");
    } else {
        console.log(`\n❌ Unexpected state: status=${updatedChallenge.status}, phase=${updatedChallenge.phase}`);
    }

    process.exit(0);
}

main().catch(e => {
    console.error("Script failed:", e);
    process.exit(1);
});
