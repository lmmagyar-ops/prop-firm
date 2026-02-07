/**
 * AUDIT 1: Financial Reconciliation
 * 
 * Verifies that for EVERY challenge in the database:
 *   startingBalance + Σ(trade deltas) ≈ currentBalance
 * 
 * BUY delta = -amount (cash leaves balance)
 * SELL delta = +shares * price (cash returns to balance)
 * 
 * Usage: npx tsx src/scripts/audit-reconciliation.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "@/db";
import { challenges, trades } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const TOLERANCE = 0.02; // Allow $0.02 rounding tolerance

async function runReconciliation() {
    console.log("\n🔍 ═══════════════════════════════════════════════");
    console.log("   AUDIT 1: FINANCIAL RECONCILIATION");
    console.log("   ═══════════════════════════════════════════════\n");

    // 1. Fetch ALL challenges
    const allChallenges = await db.query.challenges.findMany({
        orderBy: [desc(challenges.startedAt)]
    });

    console.log(`📊 Found ${allChallenges.length} total challenges\n`);

    let passed = 0;
    let failed = 0;
    let noTrades = 0;
    const discrepancies: Array<{
        challengeId: string;
        userId: string | null;
        phase: string;
        status: string;
        startingBalance: number;
        currentBalance: number;
        calculatedBalance: number;
        discrepancy: number;
        tradeCount: number;
    }> = [];

    for (const challenge of allChallenges) {
        const rulesConfig = challenge.rulesConfig as Record<string, unknown>;
        // Primary: use the column startingBalance (source of truth)
        // Fallback: rulesConfig.startingBalance (snapshot at creation)
        const startingBalance = parseFloat(challenge.startingBalance)
            || (rulesConfig?.startingBalance as number)
            || 10000;
        const currentBalance = parseFloat(challenge.currentBalance);

        // Fetch all trades for this challenge
        const challengeTrades = await db.query.trades.findMany({
            where: eq(trades.challengeId, challenge.id),
            orderBy: [desc(trades.executedAt)]
        });

        if (challengeTrades.length === 0) {
            noTrades++;
            // No trades — balance should equal starting balance
            if (Math.abs(currentBalance - startingBalance) > TOLERANCE) {
                discrepancies.push({
                    challengeId: challenge.id,
                    userId: challenge.userId,
                    phase: challenge.phase,
                    status: challenge.status,
                    startingBalance,
                    currentBalance,
                    calculatedBalance: startingBalance,
                    discrepancy: currentBalance - startingBalance,
                    tradeCount: 0
                });
                failed++;
                console.log(`  ❌ ${challenge.id.slice(0, 8)} | ${challenge.phase}/${challenge.status} | No trades but balance ≠ starting ($${currentBalance} vs $${startingBalance})`);
            } else {
                passed++;
            }
            continue;
        }

        // Calculate expected balance
        let calculatedBalance = startingBalance;
        for (const trade of challengeTrades.reverse()) { // chronological order
            const amount = parseFloat(trade.amount);
            const shares = parseFloat(trade.shares);
            const price = parseFloat(trade.price);

            if (trade.type === "BUY") {
                calculatedBalance -= amount;
            } else if (trade.type === "SELL") {
                const proceeds = shares * price;
                calculatedBalance += proceeds;
            }
        }

        const discrepancy = currentBalance - calculatedBalance;

        if (Math.abs(discrepancy) > TOLERANCE) {
            discrepancies.push({
                challengeId: challenge.id,
                userId: challenge.userId,
                phase: challenge.phase,
                status: challenge.status,
                startingBalance,
                currentBalance,
                calculatedBalance,
                discrepancy,
                tradeCount: challengeTrades.length,
            });
            failed++;
            console.log(`  ❌ ${challenge.id.slice(0, 8)} | ${challenge.phase}/${challenge.status} | ${challengeTrades.length} trades | Expected $${calculatedBalance.toFixed(2)} but got $${currentBalance.toFixed(2)} (off by $${discrepancy.toFixed(2)})`);
        } else {
            passed++;
        }
    }

    // Summary
    console.log("\n═══════════════════════════════════════════════");
    console.log("   RECONCILIATION RESULTS");
    console.log("═══════════════════════════════════════════════\n");
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⚪ No trades: ${noTrades}`);
    console.log(`  📊 Total: ${allChallenges.length}`);

    if (discrepancies.length > 0) {
        console.log("\n🚨 DISCREPANCIES FOUND:\n");
        for (const d of discrepancies) {
            console.log(`  Challenge: ${d.challengeId}`);
            console.log(`    User: ${d.userId}`);
            console.log(`    Phase/Status: ${d.phase}/${d.status}`);
            console.log(`    Starting: $${d.startingBalance.toFixed(2)}`);
            console.log(`    Expected: $${d.calculatedBalance.toFixed(2)}`);
            console.log(`    Actual:   $${d.currentBalance.toFixed(2)}`);
            console.log(`    Δ: $${d.discrepancy.toFixed(2)} (${d.tradeCount} trades)`);
            console.log();
        }
    }

    const result = failed === 0 ? "🟢 PASS" : "🔴 FAIL";
    console.log(`\n  RESULT: ${result}\n`);

    process.exit(failed > 0 ? 1 : 0);
}

runReconciliation().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
