/**
 * SAFETY VERIFICATION — Targeted Exploit Scenario Tests
 * 
 * Each test directly exercises one of the 4 critical vulnerabilities
 * found during the Feb 10 safety audit. These are NOT generic smoke tests —
 * each one proves that a specific exploit path is blocked.
 * 
 * TEST 1: Infinite Payout Bug — proves balance is deducted after payout completion.
 * TEST 2: Transaction Atomicity — proves completePayout doesn't leave orphaned state.
 * TEST 3: Risk Monitor Funded Phase — proves funded accounts use FUNDED_RULES, not challenge rules.
 * TEST 4: Evaluator Position Leak — proves positions are closed during funded transition.
 * 
 * Usage: npm run test:safety
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from '@/db';
import { users, challenges, positions, payouts, trades } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { PayoutService } from '@/lib/payout-service';
import { ChallengeEvaluator } from '@/lib/evaluator';
import { FUNDED_RULES } from '@/lib/funded-rules';
import { buildRulesConfig } from '@/config/tiers';
import { nanoid } from 'nanoid';
import Redis from 'ioredis';
import { startTestWorkerServer } from './lib/test-worker-server';
import { TestGuard } from './lib/test-guard';

let redis: InstanceType<typeof Redis>;

// ============================================================
// CONFIG
// ============================================================
const PREFIX = `safety-bot-${Date.now()}`;
const MARKET_A = 'safety-test-market-alpha';
let pass = 0;
let fail = 0;
let userCount = 0;

// ============================================================
// UTILITIES
// ============================================================
function assert(condition: boolean, msg: string) {
    if (condition) { pass++; console.log(`  ✅ ${msg}`); }
    else { fail++; console.error(`  ❌ FAILED: ${msg}`); }
}

function assertApprox(actual: number, expected: number, tolerance: number, msg: string) {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) { pass++; console.log(`  ✅ ${msg} (${actual.toFixed(2)} ≈ ${expected.toFixed(2)})`); }
    else { fail++; console.error(`  ❌ FAILED: ${msg} (${actual.toFixed(2)} ≠ ${expected.toFixed(2)}, diff=${diff.toFixed(4)})`); }
}

function userId(label: string) { return `${PREFIX}-${label}-${userCount++}`; }

async function getChallenge(id: string) {
    return db.query.challenges.findFirst({ where: eq(challenges.id, id) });
}

async function getBalance(id: string): Promise<number> {
    const c = await getChallenge(id);
    return parseFloat(c?.currentBalance || '0');
}

async function getOpenPositions(challengeId: string) {
    return db.query.positions.findMany({
        where: and(eq(positions.challengeId, challengeId), eq(positions.status, 'OPEN'))
    });
}

// ============================================================
// REDIS SEEDING
// ============================================================
async function seedRedis() {
    const now = Date.now();
    const existing = JSON.parse(await redis.get('market:prices:all') || '{}');
    existing[MARKET_A] = { price: '0.56', asset_id: MARKET_A, timestamp: now };
    await redis.set('market:prices:all', JSON.stringify(existing));

    const ob = JSON.parse(await redis.get('market:orderbooks') || '{}');
    ob[MARKET_A] = {
        bids: [{ price: '0.55', size: '50000' }, { price: '0.53', size: '50000' }],
        asks: [{ price: '0.57', size: '50000' }, { price: '0.59', size: '50000' }],
    };
    await redis.set('market:orderbooks', JSON.stringify(ob));
}

// ============================================================
// TEST USER + CHALLENGE FACTORY
// ============================================================
async function createTestUser(label: string): Promise<string> {
    const id = userId(label);
    await db.insert(users).values({
        id, email: `${id}@safety.test`, name: `Safety ${label}`, role: 'client',
    });
    return id;
}

async function createTestChallenge(
    uid: string,
    balance: number,
    overrides: Record<string, unknown> = {},
): Promise<string> {
    const tier = balance >= 25000 ? '25k' : balance >= 10000 ? '10k' : '5k';
    const rules = buildRulesConfig(tier);

    const [c] = await db.insert(challenges).values({
        userId: uid,
        status: 'active',
        phase: 'challenge',
        platform: 'polymarket',
        rulesConfig: rules,
        startingBalance: balance.toString(),
        currentBalance: (overrides.currentBalance as string) || balance.toString(),
        startOfDayBalance: (overrides.startOfDayBalance as string) || balance.toString(),
        highWaterMark: (overrides.highWaterMark as string) || balance.toString(),
        startedAt: new Date(),
        ...overrides,
    }).returning();

    return c.id;
}

// ============================================================
// TEST 1: INFINITE PAYOUT BUG
// Proves: completePayout deducts the payout amount from the balance.
// Exploit: Without the fix, a trader could request the same profit
//          as a payout repeatedly because balance was never reduced.
// ============================================================
async function test1_infinitePayoutBug() {
    console.log('\n🚨 TEST 1: Infinite Payout Bug — Balance Deduction After Payout\n');

    const uid = await createTestUser('t1-payout');
    const startingBalance = 10000;
    const fundedBalance = 12000; // $2000 profit
    const cid = await createTestChallenge(uid, startingBalance, {
        currentBalance: fundedBalance.toString(),
        phase: 'funded',
        profitSplit: '0.80',
        payoutCap: '10000',
        activeTradingDays: 5,
        payoutCycleStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    });

    // Verify pre-condition: balance is $12,000
    const balBefore = await getBalance(cid);
    assertApprox(balBefore, 12000, 0.01, 'Pre-payout balance is $12,000');

    // Create a payout record directly (simulating the full request → approve → process flow)
    const payoutId = `safety-payout-${nanoid(8)}`;
    const netPayoutAmount = 1600; // $2000 profit × 80% split = $1600
    await db.insert(payouts).values({
        id: payoutId,
        userId: uid,
        challengeId: cid,
        amount: netPayoutAmount.toFixed(2),
        network: 'POLYGON',
        walletAddress: '0xSAFETY_TEST_WALLET',
        status: 'processing',
        requestedAt: new Date(),
        grossProfit: '2000.00',
        profitSplit: '0.80',
    });

    // Complete the payout
    await PayoutService.completePayout(payoutId, '0xTEST_TX_HASH_001');

    // THE CRITICAL ASSERTION: Balance should be reduced
    const balAfter = await getBalance(cid);
    const expectedDeduction = netPayoutAmount / 0.80; // grossDeduction = $1600 / 0.80 = $2000
    const expectedBalance = fundedBalance - expectedDeduction; // $12000 - $2000 = $10000

    assertApprox(balAfter, expectedBalance, 0.01, `Post-payout balance deducted to $${expectedBalance}`);
    assert(balAfter < balBefore, `Balance decreased (${balAfter.toFixed(2)} < ${balBefore.toFixed(2)})`);

    // Verify the payout record is marked completed
    const [completedPayout] = await db.select().from(payouts).where(eq(payouts.id, payoutId));
    assert(completedPayout.status === 'completed', `Payout status is 'completed' (got '${completedPayout.status}')`);
    assert(completedPayout.transactionHash === '0xTEST_TX_HASH_001', 'Transaction hash recorded');

    // Verify challenge state was updated
    const challenge = await getChallenge(cid);
    assert(challenge!.activeTradingDays === 0, 'Cycle reset: activeTradingDays = 0');
    assertApprox(parseFloat(challenge!.totalPaidOut || '0'), netPayoutAmount, 0.01, `totalPaidOut = $${netPayoutAmount}`);

    // EXPLOIT PROOF: After payout, net profit should now be $0 (balance back to starting)
    // A second payout request should be rejected because there's no new profit
    const newBalance = await getBalance(cid);
    const newNetProfit = newBalance - startingBalance;
    assertApprox(newNetProfit, 0, 0.01, `Post-payout net profit is $0 — no repeat payout possible`);
}

// ============================================================
// TEST 2: TRANSACTION ATOMICITY
// Proves: If the payout record doesn't exist or is in wrong status,
//         the entire operation (including balance deduction) is rolled back.
// ============================================================
async function test2_transactionAtomicity() {
    console.log('\n🔒 TEST 2: Transaction Atomicity — No Orphaned State\n');

    const uid = await createTestUser('t2-atomic');
    const cid = await createTestChallenge(uid, 10000, {
        currentBalance: '11500',
        phase: 'funded',
        profitSplit: '0.80',
        payoutCap: '10000',
        activeTradingDays: 5,
        payoutCycleStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });

    const balBefore = await getBalance(cid);

    // Try to complete a non-existent payout
    let errorThrown = false;
    try {
        await PayoutService.completePayout('nonexistent-payout-id', '0xFAKE_TX');
    } catch (e) {
        errorThrown = true;
        assert(true, `Non-existent payout throws: ${(e as Error).message.slice(0, 60)}`);
    }
    assert(errorThrown, 'Non-existent payout was rejected');

    // Verify balance is UNCHANGED (no partial state modification)
    const balAfter = await getBalance(cid);
    assertApprox(balAfter, balBefore, 0.01, `Balance unchanged after failed payout (${balAfter.toFixed(2)} ≈ ${balBefore.toFixed(2)})`);

    // Try to complete a payout in wrong status (pending, not processing)
    const payoutId = `safety-payout-wrong-status-${nanoid(8)}`;
    await db.insert(payouts).values({
        id: payoutId,
        userId: uid,
        challengeId: cid,
        amount: '800.00',
        network: 'POLYGON',
        walletAddress: '0xSAFETY_TEST_WALLET',
        status: 'pending', // Wrong status — should be 'processing'
        requestedAt: new Date(),
        grossProfit: '1000.00',
        profitSplit: '0.80',
    });

    errorThrown = false;
    try {
        await PayoutService.completePayout(payoutId, '0xFAKE_TX_2');
    } catch (e) {
        errorThrown = true;
        assert(true, `Wrong-status payout throws: ${(e as Error).message.slice(0, 60)}`);
    }
    assert(errorThrown, 'Wrong-status payout was rejected');

    // Balance still unchanged
    const balFinal = await getBalance(cid);
    assertApprox(balFinal, balBefore, 0.01, `Balance still unchanged after wrong-status payout`);
}

// ============================================================
// TEST 3: RISK MONITOR FUNDED PHASE RULES
// Proves: Funded accounts use FUNDED_RULES (static drawdown from initial balance),
//         not challenge-phase trailing HWM rules.
// This is a unit-level test of the rule selection logic.
// ============================================================
async function test3_riskMonitorFundedPhaseRules() {
    console.log('\n🛡️  TEST 3: Risk Monitor Funded Phase — Uses FUNDED_RULES\n');

    // Verify FUNDED_RULES are correctly defined for all tiers
    for (const [tier, rules] of Object.entries(FUNDED_RULES)) {
        assert(rules.maxTotalDrawdown > 0, `${tier} has maxTotalDrawdown: $${rules.maxTotalDrawdown}`);
        assert(rules.maxDailyDrawdown > 0, `${tier} has maxDailyDrawdown: $${rules.maxDailyDrawdown}`);
        assert(rules.profitSplit > 0, `${tier} has profitSplit: ${rules.profitSplit}`);
        assert(rules.payoutCap > 0, `${tier} has payoutCap: $${rules.payoutCap}`);
    }

    // Now verify the critical scenario: funded account with challenge-phase rules
    // would have DIFFERENT drawdown limits than FUNDED_RULES
    const uid = await createTestUser('t3-funded-rules');
    const tier10k = buildRulesConfig('10k');

    // 10k tier challenge rules: maxTotalDrawdownPercent = 0.10 → $1000 trailing from HWM
    // 10k tier funded rules:    maxTotalDrawdown = $1000 static from INITIAL balance
    // The KEY difference is: challenge uses trailing HWM, funded uses static from initial.
    //
    // Scenario: Trader profits to $12,000 (HWM=$12k), then drops to $11,100
    //   - Challenge trailing: HWM($12k) - $1000 = $11,000 → equity $11,100 > $11k → SAFE
    //   - Funded static: Initial($10k) - $1000 = $9,000 → equity $11,100 > $9k → SAFE
    //   But if HWM is $12k and equity drops to $10,900:
    //   - Challenge trailing: $12k - $1k = $11k → equity $10,900 < $11k → BREACH ❌
    //   - Funded static: $10k - $1k = $9k → equity $10,900 > $9k → SAFE ✅
    //
    // That's the bug: funded traders were being checked with challenge trailing rules,
    // causing unfair breaches. Let's verify the math.

    const startingBalance = 10000;
    const challengeRules = tier10k;
    const fundedRules = FUNDED_RULES['10k'];

    const challengeMaxDrawdown = (challengeRules.maxTotalDrawdownPercent as number) * startingBalance;
    const fundedMaxDrawdown = fundedRules.maxTotalDrawdown;

    assert(challengeMaxDrawdown === 1000, `Challenge maxDrawdown = $${challengeMaxDrawdown}`);
    assert(fundedMaxDrawdown === 1000, `Funded maxDrawdown = $${fundedMaxDrawdown}`);

    // The absolute values are the same ($1000), but the BASE is different:
    // Challenge: HWM-based (trailing). If HWM rises to $12k, floor = $12k - $1k = $11k
    // Funded: Initial-based (static). Floor is always $10k - $1k = $9k
    // Verify by simulating the evaluator with a funded account

    const cid = await createTestChallenge(uid, startingBalance, {
        currentBalance: '10900',    // $10,900 equity (no open positions)
        highWaterMark: '12000',     // HWM reached $12k at peak
        phase: 'funded',
        startOfDayBalance: '11000',
    });

    // Evaluate — should NOT fail because funded uses static drawdown ($10k - $1k = $9k floor)
    const result = await ChallengeEvaluator.evaluate(cid);
    assert(result.status === 'active', `Funded at $10,900 with HWM=$12k: status='${result.status}' (expected 'active', NOT failed)`);

    // Now verify a challenge with the same numbers WOULD fail (trailing drawdown)
    const uid2 = await createTestUser('t3-challenge-rules');
    const cid2 = await createTestChallenge(uid2, startingBalance, {
        currentBalance: '10900',    // Same equity
        highWaterMark: '12000',     // Same HWM
        phase: 'challenge',        // But challenge phase — uses trailing
        startOfDayBalance: '11000',
    });

    const result2 = await ChallengeEvaluator.evaluate(cid2);
    assert(result2.status === 'failed', `Challenge at $10,900 with HWM=$12k: status='${result2.status}' (expected 'failed' — trailing breach)`);

    console.log('\n  📊 KEY INSIGHT: Same equity ($10,900), same HWM ($12k), different outcomes:');
    console.log(`     Funded (static floor $9k): ${result.status.toUpperCase()} ← Correct, trader is safe`);
    console.log(`     Challenge (trailing floor $11k): ${result2.status.toUpperCase()} ← Correct, trader breached`);
}

// ============================================================
// TEST 4: EVALUATOR POSITION LEAK ON FUNDED TRANSITION
// Proves: When the evaluator triggers a funded transition, all open
//         positions are closed before the balance is reset.
// ============================================================
async function test4_evaluatorPositionLeak() {
    console.log('\n📈 TEST 4: Evaluator Position Leak — Positions Closed on Funded Transition\n');

    await seedRedis();

    const uid = await createTestUser('t4-position-leak');
    const startingBalance = 10000;
    const profitBalance = 11500; // $1,500 profit (above $1k target)

    const cid = await createTestChallenge(uid, startingBalance, {
        currentBalance: profitBalance.toString(),
        highWaterMark: profitBalance.toString(),
        phase: 'challenge',
    });

    // Manually create open positions to simulate challenge-phase trading
    const [pos1] = await db.insert(positions).values({
        challengeId: cid,
        marketId: MARKET_A,
        direction: 'YES',
        sizeAmount: '100.00',
        shares: '172.41',
        entryPrice: '0.5800',
        currentPrice: '0.5600',
        status: 'OPEN',
    }).returning();

    const [pos2] = await db.insert(positions).values({
        challengeId: cid,
        marketId: MARKET_A,
        direction: 'NO',
        sizeAmount: '50.00',
        shares: '113.64',
        entryPrice: '0.4400',
        currentPrice: '0.4400',
        status: 'OPEN',
    }).returning();

    // Verify pre-condition: 2 open positions
    const openBefore = await getOpenPositions(cid);
    assert(openBefore.length === 2, `Pre-transition: ${openBefore.length} open positions`);

    // Trigger funded transition via evaluator
    const result = await ChallengeEvaluator.evaluate(cid);
    assert(result.status === 'passed', `Evaluator returned '${result.status}' (expected 'passed')`);

    // THE CRITICAL ASSERTIONS: Positions must be closed
    const openAfter = await getOpenPositions(cid);
    assert(openAfter.length === 0, `Post-transition: ${openAfter.length} open positions (expected 0)`);

    // Verify positions are actually CLOSED, not deleted
    const allPositions = await db.query.positions.findMany({
        where: eq(positions.challengeId, cid)
    });
    assert(allPositions.length === 2, `Both positions still exist in DB (${allPositions.length})`);
    for (const pos of allPositions) {
        assert(pos.status === 'CLOSED', `Position ${pos.id.slice(0, 8)} status='${pos.status}' (expected 'CLOSED')`);
        assert(pos.pnl !== null && pos.pnl !== '0', `Position ${pos.id.slice(0, 8)} has PnL recorded: $${pos.pnl}`);
        assert(pos.closedAt !== null, `Position ${pos.id.slice(0, 8)} has closedAt set`);
        assert(pos.closedPrice !== null, `Position ${pos.id.slice(0, 8)} has closedPrice set`);
    }

    // Balance should be reset to startingBalance, NOT startingBalance + position value
    const balAfter = await getBalance(cid);
    assertApprox(balAfter, startingBalance, 0.01, `Balance reset to starting ($${balAfter.toFixed(2)} ≈ $${startingBalance})`);

    // Phase should be funded
    const c = await getChallenge(cid);
    assert(c!.phase === 'funded', `Phase is 'funded' (got '${c!.phase}')`);

    // POSITION CLOSE INVARIANT: Every CLOSED position must have a SELL trade record
    const sellTradesForChallenge = await db.query.trades.findMany({
        where: and(eq(trades.challengeId, cid), eq(trades.type, 'SELL'))
    });
    assert(sellTradesForChallenge.length === 2, `2 SELL trade records created (got ${sellTradesForChallenge.length})`);
    for (const t of sellTradesForChallenge) {
        assert(t.closureReason === 'pass_liquidation',
            `SELL trade ${t.id.slice(0, 8)} closureReason='${t.closureReason}' (expected 'pass_liquidation')`);
        assert(t.realizedPnL !== null, `SELL trade ${t.id.slice(0, 8)} has realizedPnL`);
        assert(t.positionId !== null, `SELL trade ${t.id.slice(0, 8)} has positionId linked`);
    }
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanup() {
    console.log('\n🧹 Cleaning up all safety test data...');
    const testUsers = await db.select().from(users).where(like(users.id, `${PREFIX}%`));

    for (const user of testUsers) {
        // Delete payouts first (references challenges)
        await db.delete(payouts).where(eq(payouts.userId, user.id));
        // Delete positions and trades via challenge cascade
        const userChallenges = await db.select().from(challenges).where(eq(challenges.userId, user.id));
        for (const c of userChallenges) {
            await db.delete(trades).where(eq(trades.challengeId, c.id));
            await db.delete(positions).where(eq(positions.challengeId, c.id));
        }
        await db.delete(challenges).where(eq(challenges.userId, user.id));
        await db.delete(users).where(eq(users.id, user.id));
    }

    console.log(`  ✅ Removed ${testUsers.length} test users and all related data`);
}

// ============================================================
// MAIN
// ============================================================
const guard = new TestGuard('safety-bot');
guard.registerCleanup(cleanup);

async function main() {
    console.log(`
🛡️  ═══════════════════════════════════════════════
   SAFETY VERIFICATION — Exploit Scenario Tests
   ═══════════════════════════════════════════════
`);

    await guard.sweepOrphans();

    try {
        const workerServer = await startTestWorkerServer();
        redis = workerServer.redis;
        guard.registerCleanup(workerServer.cleanup);

        await seedRedis();
        await test1_infinitePayoutBug();
        await test2_transactionAtomicity();
        await test3_riskMonitorFundedPhaseRules();
        await test4_evaluatorPositionLeak();
    } catch (error) {
        console.error('\n💀 UNHANDLED ERROR:', error);
        fail++;
    } finally {
        await cleanup();
        guard.markComplete();
    }

    console.log(`
═══════════════════════════════════════════════
   RESULTS: ${pass} passed, ${fail} failed
═══════════════════════════════════════════════
`);

    if (fail > 0) {
        console.log('🔴 SAFETY TESTS FAILED — DO NOT DEPLOY\n');
    } else {
        console.log('🟢 ALL SAFETY ASSERTIONS PASSED — SAFE TO DEPLOY\n');
    }

    process.exit(fail > 0 ? 1 : 0);
}

main();
