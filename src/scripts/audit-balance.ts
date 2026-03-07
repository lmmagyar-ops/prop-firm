/**
 * BALANCE AUDIT INVESTIGATION
 * Challenge: a59d8d5e-363d-4962-b22b-37e0d7badbd5
 * Sentry alert: "Moderate discrepancy - review needed" at 2:00 AM UTC March 7
 *
 * Run from project root: npx tsx src/scripts/audit-balance.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from "@/db";
import { challenges, trades, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const CHALLENGE_ID = "a59d8d5e-363d-4962-b22b-37e0d7badbd5";

async function main() {
    console.log(`\n=== BALANCE AUDIT: ${CHALLENGE_ID.slice(0, 8)} ===\n`);

    const challenge = await db.query.challenges.findFirst({
        where: eq(challenges.id, CHALLENGE_ID),
    });

    if (!challenge) {
        console.error("CHALLENGE NOT FOUND");
        process.exit(1);
    }

    console.log("CHALLENGE STATE:");
    console.log(`  userId:          ${challenge.userId}`);
    console.log(`  status:          ${challenge.status}`);
    console.log(`  phase:           ${challenge.phase}`);
    console.log(`  startingBalance: $${challenge.startingBalance}`);
    console.log(`  currentBalance:  $${challenge.currentBalance}`);

    const allTrades = await db.query.trades.findMany({
        where: eq(trades.challengeId, CHALLENGE_ID),
        orderBy: (trades, { asc }) => [asc(trades.executedAt)],
    });

    let runningBalance = parseFloat(challenge.startingBalance || '10000');
    const startingBalance = runningBalance;

    let tradesToReplay = allTrades;
    if (challenge.phase === 'funded') {
        let transitionIndex = -1;
        for (let i = allTrades.length - 1; i >= 0; i--) {
            if ((allTrades[i] as any).closureReason === 'pass_liquidation') {
                transitionIndex = i;
                break;
            }
        }
        if (transitionIndex >= 0) {
            console.log(`  FUNDED: skipping ${transitionIndex + 1} pre-transition trades, replaying ${allTrades.length - transitionIndex - 1}`);
            tradesToReplay = allTrades.slice(transitionIndex + 1);
            runningBalance = startingBalance;
        }
    }

    console.log(`\nTRADE HISTORY (replaying ${tradesToReplay.length} / ${allTrades.length} total):`);
    console.log(`  #   | Type | Amount      | Running Bal   | ExecutedAt`);
    console.log(`  ----|------|-------------|---------------|------------------------`);

    for (let i = 0; i < tradesToReplay.length; i++) {
        const t = tradesToReplay[i];
        const amount = parseFloat(t.amount);
        const prev = runningBalance;
        if (t.type === "BUY") runningBalance -= amount;
        else if (t.type === "SELL") runningBalance += amount;
        const delta = runningBalance - prev;
        console.log(`  ${String(i + 1).padStart(3)} | ${t.type.padEnd(4)} | $${String(amount.toFixed(2)).padStart(10)} | $${String(runningBalance.toFixed(2)).padStart(12)} | ${t.executedAt?.toISOString().slice(0, 23)} [${delta >= 0 ? '+' : ''}${delta.toFixed(2)}]`);
    }

    const storedBalance = parseFloat(challenge.currentBalance);
    const calculatedBalance = Math.round(runningBalance * 100) / 100;
    const discrepancy = storedBalance - calculatedBalance;

    console.log(`\nDISCREPANCY ANALYSIS:`);
    console.log(`  startingBalance:   $${startingBalance.toFixed(2)}`);
    console.log(`  storedBalance:     $${storedBalance.toFixed(2)}`);
    console.log(`  calculatedBalance: $${calculatedBalance.toFixed(2)}`);
    console.log(`  discrepancy:       $${discrepancy.toFixed(2)}  (stored minus calculated)`);
    if (discrepancy > 0) console.log(`  DIRECTION:         stored > calculated — user has EXTRA money vs what trades justify`);
    else if (discrepancy < 0) console.log(`  DIRECTION:         stored < calculated — user has LESS money vs what trades justify`);
    console.log(`  verdict:           ${Math.abs(discrepancy) > 5000 ? '🔴 CRITICAL' : Math.abs(discrepancy) > 100 ? '🟠 MODERATE' : Math.abs(discrepancy) > 10 ? '🟡 MINOR' : '✅ CLEAN'}`);

    const openPositions = await db.query.positions.findMany({
        where: and(eq(positions.challengeId, CHALLENGE_ID), eq(positions.status, "OPEN")),
    });

    console.log(`\nOPEN POSITIONS (${openPositions.length}):`);
    for (const pos of openPositions) {
        const shares = parseFloat(pos.shares);
        const entry = parseFloat(pos.entryPrice);
        const current = parseFloat(pos.currentPrice || pos.entryPrice);
        const costBasis = shares * entry;
        const marketValue = shares * current;
        console.log(`  ${pos.direction} | shares=${shares.toFixed(4)} | entry=$${entry} | current=$${current} | costBasis=$${costBasis.toFixed(2)} | mktValue=$${marketValue.toFixed(2)} | sizeAmount=$${pos.sizeAmount}`);
        console.log(`    marketId: ${pos.marketId}`);
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
