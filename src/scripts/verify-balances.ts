import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '@/db';
import { challenges, trades } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * verify-balances.ts
 * 
 * Nightly balance reconciliation script.
 * For each active challenge, recomputes balance from startingBalance + sum(trade deltas)
 * and compares to the stored currentBalance.
 * 
 * Usage: npm run test:balances
 * Exit code: 0 = all match, 1 = drift detected
 */

const DRIFT_THRESHOLD = 0.01; // $0.01 tolerance

async function reconcile() {
    console.log('\n⚖️  BALANCE RECONCILIATION AUDIT');
    console.log('═══════════════════════════════════════════════\n');

    // Get all active challenges
    const activeChallenges = await db.query.challenges.findMany({
        where: eq(challenges.status, 'active')
    });

    console.log(`Found ${activeChallenges.length} active challenges\n`);

    if (activeChallenges.length === 0) {
        console.log('⚠️  No active challenges found. Nothing to reconcile.');
        process.exit(0);
    }

    let driftCount = 0;
    let checkedCount = 0;

    for (const challenge of activeChallenges) {
        checkedCount++;
        const startingBalance = parseFloat(challenge.startingBalance || '0');
        const currentBalance = parseFloat(challenge.currentBalance || '0');

        // Get all trades for this challenge
        const challengeTrades = await db.query.trades.findMany({
            where: eq(trades.challengeId, challenge.id)
        });

        // Recompute balance from trade history:
        // BUY deducts the trade amount, SELL credits the trade amount
        let recomputedBalance = startingBalance;

        for (const trade of challengeTrades) {
            const amount = parseFloat(trade.amount || '0');
            if (trade.type === 'BUY') {
                recomputedBalance -= amount;
            } else if (trade.type === 'SELL') {
                recomputedBalance += amount;
            }
        }

        const drift = Math.abs(recomputedBalance - currentBalance);

        if (drift > DRIFT_THRESHOLD) {
            driftCount++;
            console.error(`  🔴 DRIFT: challenge ${challenge.id.slice(0, 8)}...`);
            console.error(`     User: ${challenge.userId?.slice(0, 8)}...`);
            console.error(`     Starting: $${startingBalance.toFixed(2)}`);
            console.error(`     Expected: $${recomputedBalance.toFixed(2)}`);
            console.error(`     Stored:   $${currentBalance.toFixed(2)}`);
            console.error(`     Drift:    $${drift.toFixed(4)}`);
            console.error(`     Trades:   ${challengeTrades.length} (${challengeTrades.filter(t => t.type === 'BUY').length} buys, ${challengeTrades.filter(t => t.type === 'SELL').length} sells)`);
            console.error('');
        } else {
            console.log(`  ✅ ${challenge.id.slice(0, 8)}... — $${currentBalance.toFixed(2)} (${challengeTrades.length} trades, drift: $${drift.toFixed(4)})`);
        }
    }

    console.log('\n═══════════════════════════════════════════════');
    if (driftCount > 0) {
        console.error(`🔴 DRIFT DETECTED: ${driftCount}/${checkedCount} challenges have balance discrepancies`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: All ${checkedCount} challenges reconciled ($${DRIFT_THRESHOLD} tolerance)`);
        process.exit(0);
    }
}

reconcile().catch(err => {
    console.error('💥 FATAL ERROR:', err);
    process.exit(1);
});
