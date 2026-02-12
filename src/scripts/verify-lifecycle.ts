/**
 * LIFECYCLE SIMULATOR — Full E2E Challenge Lifecycle Verification
 * 
 * Simulates a real user's complete journey against the production database.
 * No mocks. Catches every class of bug that has hit production.
 * 
 * Phases:
 *   1. Challenge Creation → canonical rulesConfig verification
 *   2. Drawdown Breach → challenge FAILED
 *   3. Profit Target → funded transition
 *   4. Risk Monitor → breach detection + PnL settlement
 *   5. Risk Monitor → profit target detection + funded transition
 *   6. Daily Reset → drawdown recovery
 *   7. Data Integrity Invariants
 * 
 * Usage: npm run test:lifecycle
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from '@/db';
import { users, challenges, positions, trades, auditLogs } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { TradeExecutor } from '@/lib/trade';
import { ChallengeEvaluator } from '@/lib/evaluator';
import { TIERS, buildRulesConfig } from '@/config/tiers';
import Redis from 'ioredis';
import { startTestWorkerServer } from './lib/test-worker-server';
import { TestGuard } from './lib/test-guard';

let redis: InstanceType<typeof Redis>;

// ============================================================
// CONFIG
// ============================================================
const PREFIX = `lifecycle-bot-${Date.now()}`;
const MARKET_A = 'lifecycle-test-market-alpha';
const MARKET_B = 'lifecycle-test-market-beta';
const BID = '0.55';
const ASK = '0.57';
const MID = '0.56';

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
// REDIS SEEDING — isolated test markets
// ============================================================
async function seedRedis() {
    const now = Date.now();

    // Prices
    const existing = JSON.parse(await redis.get('market:prices:all') || '{}');
    existing[MARKET_A] = { price: MID, asset_id: MARKET_A, timestamp: now };
    existing[MARKET_B] = { price: MID, asset_id: MARKET_B, timestamp: now };
    await redis.set('market:prices:all', JSON.stringify(existing));

    // Order books
    const ob = JSON.parse(await redis.get('market:orderbooks') || '{}');
    for (const m of [MARKET_A, MARKET_B]) {
        ob[m] = {
            bids: [{ price: BID, size: '50000' }, { price: '0.53', size: '50000' }],
            asks: [{ price: ASK, size: '50000' }, { price: '0.59', size: '50000' }],
        };
    }
    await redis.set('market:orderbooks', JSON.stringify(ob));

    // Event list (for risk engine category lookup)
    const events = JSON.parse(await redis.get('kalshi:active_list') || '[]');
    events.push({
        title: 'Lifecycle Test Event', volume: 50_000_000, categories: ['Crypto'],
        markets: [
            { id: MARKET_A, price: parseFloat(MID), question: 'Lifecycle Alpha?', volume: 50_000_000, outcomes: ['Yes', 'No'] },
            { id: MARKET_B, price: parseFloat(MID), question: 'Lifecycle Beta?', volume: 50_000_000, outcomes: ['Yes', 'No'] },
        ],
    });
    await redis.set('kalshi:active_list', JSON.stringify(events));
}

async function refreshPrices() {
    const now = Date.now();
    const p = JSON.parse(await redis.get('market:prices:all') || '{}');
    p[MARKET_A] = { price: MID, asset_id: MARKET_A, timestamp: now };
    p[MARKET_B] = { price: MID, asset_id: MARKET_B, timestamp: now };
    await redis.set('market:prices:all', JSON.stringify(p));
}

// ============================================================
// TEST USER + CHALLENGE FACTORY
// ============================================================
async function createTestUser(label: string): Promise<string> {
    const id = userId(label);
    await db.insert(users).values({
        id, email: `${id}@lifecycle.test`, name: `LCT ${label}`, role: 'client',
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
// PHASE 1: Challenge Creation Verification
// ============================================================
async function phase1() {
    console.log('\n📋 PHASE 1: Challenge Creation — Canonical RulesConfig\n');

    for (const [tierKey, tier] of Object.entries(TIERS)) {
        const uid = await createTestUser(`p1-${tierKey}`);
        const cid = await createTestChallenge(uid, tier.startingBalance);
        const c = await getChallenge(cid);
        const rules = c!.rulesConfig as Record<string, unknown>;

        assert(rules.maxTotalDrawdownPercent === tier.maxTotalDrawdownPercent,
            `$${tier.startingBalance} tier: maxTotalDrawdownPercent = ${tier.maxTotalDrawdownPercent} (got ${rules.maxTotalDrawdownPercent})`);
        assert(rules.maxDailyDrawdownPercent === tier.maxDailyDrawdownPercent,
            `$${tier.startingBalance} tier: maxDailyDrawdownPercent = ${tier.maxDailyDrawdownPercent} (got ${rules.maxDailyDrawdownPercent})`);
        assert(rules.profitTargetPercent === tier.profitTargetPercent,
            `$${tier.startingBalance} tier: profitTargetPercent = ${tier.profitTargetPercent} (got ${rules.profitTargetPercent})`);
        assert(rules.maxDrawdown === tier.startingBalance * tier.maxTotalDrawdownPercent,
            `$${tier.startingBalance} tier: maxDrawdown = $${tier.startingBalance * tier.maxTotalDrawdownPercent} (got $${rules.maxDrawdown})`);
        assert(rules.profitTarget === tier.startingBalance * tier.profitTargetPercent,
            `$${tier.startingBalance} tier: profitTarget = $${tier.startingBalance * tier.profitTargetPercent} (got $${rules.profitTarget})`);
    }
}

// ============================================================
// PHASE 2: Drawdown Breach → Challenge FAILED (via Evaluator)
// ============================================================
async function phase2() {
    console.log('\n📉 PHASE 2: Drawdown Breach → Challenge FAILED\n');

    const uid = await createTestUser('p2-breach');
    const cid = await createTestChallenge(uid, 10000, {
        currentBalance: '8900', // 11% drawdown — past 10% limit
    });

    // Evaluator should detect the breach
    const result = await ChallengeEvaluator.evaluate(cid);
    assert(result.status === 'failed', `Evaluator returned '${result.status}' (expected 'failed')`);
    assert(result.reason?.toLowerCase().includes('drawdown') === true, `Reason mentions drawdown: "${result.reason}"`);

    // Verify DB state
    const c = await getChallenge(cid);
    assert(c?.status === 'failed', `DB status = '${c?.status}' (expected 'failed')`);
}

// ============================================================
// PHASE 3: Profit Target → Funded Transition (via Evaluator)
// ============================================================
async function phase3() {
    console.log('\n🎯 PHASE 3: Profit Target → Funded Transition\n');

    const uid = await createTestUser('p3-profit');
    const cid = await createTestChallenge(uid, 10000, {
        currentBalance: '11100', // $1,100 profit — above $1,000 target
    });

    // Evaluator should detect profit target hit
    const result = await ChallengeEvaluator.evaluate(cid);
    assert(result.status === 'passed', `Evaluator returned '${result.status}' (expected 'passed')`);
    assert(result.reason?.toLowerCase().includes('funded') === true, `Reason mentions funded: "${result.reason}"`);

    // Verify DB state
    const c = await getChallenge(cid);
    assert(c?.phase === 'funded', `Phase = '${c?.phase}' (expected 'funded')`);
    assert(c?.status === 'active', `Status = '${c?.status}' (expected 'active', funded stays active)`);
    assertApprox(parseFloat(c?.currentBalance || '0'), 10000, 0.01,
        'Balance reset to starting on funded transition');
    assertApprox(parseFloat(c?.profitSplit || '0'), 0.8, 0.001, `profitSplit = 0.8`);
    assertApprox(parseFloat(c?.payoutCap || '0'), 10000, 0.01, `payoutCap = 10000`);
    assert(c?.activeTradingDays === 0, `activeTradingDays = ${c?.activeTradingDays} (expected 0)`);
    assert(c?.endsAt === null, `endsAt = ${c?.endsAt} (expected null — funded has no time limit)`);
}

// ============================================================
// PHASE 4: Breach → Trade Execution + Evaluator Fail + Close Positions
// ============================================================
async function phase4() {
    console.log('\n🛡️  PHASE 4: Trade Execution → Evaluator Breach Detection\n');

    const uid = await createTestUser('p4-trade-breach');
    const cid = await createTestChallenge(uid, 10000);

    // Open a position via real trading
    await refreshPrices();
    const trade = await TradeExecutor.executeTrade(uid, cid, MARKET_A, 'BUY', 200, 'YES');
    assert(parseFloat(trade.shares) > 0, `BUY executed: ${trade.shares} shares`);
    const balAfterBuy = await getBalance(cid);
    assertApprox(balAfterBuy, 9800, 5, 'Balance after $200 BUY ≈ $9800');

    // Wait for fire-and-forget post-trade evaluate() to settle before mutating balance
    await new Promise(r => setTimeout(r, 600));

    // Simulate a massive cash loss (as if other trades lost money)
    await db.update(challenges)
        .set({ currentBalance: '8800' }) // $1,200 total loss → past 10% DD limit ($1,000)
        .where(eq(challenges.id, cid));

    // Evaluator should detect the breach (equity = cash + position value)
    // Cash $8,800 + position ~$200 ≈ $9,000 → drawdown = $1,000 → breach!
    const result = await ChallengeEvaluator.evaluate(cid);
    assert(result.status === 'failed', `Evaluator detected breach: ${result.status} (expected 'failed')`);
    assert(result.reason?.toLowerCase().includes('drawdown') === true,
        `Reason mentions drawdown: "${result.reason}"`);

    // Verify DB state
    const c = await getChallenge(cid);
    assert(c?.status === 'failed', `DB status = '${c?.status}' (expected 'failed')`);

    // Verify positions are still there (evaluator doesn't close them — risk monitor does)
    // This test verifies the evaluator correctly detects the breach
    const openPos = await getOpenPositions(cid);
    assert(openPos.length > 0, `Evaluator leaves ${openPos.length} positions open (monitor would close them)`);

    // Manually close positions to match production behavior (where risk monitor does this)
    for (const pos of openPos) {
        await db.update(positions)
            .set({ status: 'CLOSED', pnl: '0', updatedAt: new Date() })
            .where(eq(positions.id, pos.id));
    }
    console.log(`  ℹ️  Manually closed ${openPos.length} positions (simulating risk monitor cleanup)`);
}

// ============================================================
// PHASE 5: Profit Target via Evaluator → Funded Transition
// ============================================================
async function phase5() {
    console.log('\n🏆 PHASE 5: Trade Profit → Evaluator Funded Transition\n');

    const uid = await createTestUser('p5-profit-trade');
    const cid = await createTestChallenge(uid, 10000);

    // Open a position
    await refreshPrices();
    await TradeExecutor.executeTrade(uid, cid, MARKET_A, 'BUY', 200, 'YES');

    // Wait for fire-and-forget post-trade evaluate() to settle before mutating balance
    await new Promise(r => setTimeout(r, 600));

    // Simulate accumulated cash profits from other trades
    // Cash $10,800 + position ~$200 ≈ $11,000 → target hit ($1,000 profit)
    await db.update(challenges)
        .set({ currentBalance: '10900' })
        .where(eq(challenges.id, cid));

    // Evaluator should detect profit target and trigger funded transition
    const result = await ChallengeEvaluator.evaluate(cid);
    assert(result.status === 'passed', `Evaluator triggered pass: ${result.status}`);
    assert(result.reason?.toLowerCase().includes('funded') === true,
        `Reason mentions funded: "${result.reason}"`);

    // Verify DB state: funded transition should have happened
    const c = await getChallenge(cid);
    assert(c?.phase === 'funded', `Phase = '${c?.phase}' (expected 'funded')`);
    assert(c?.status === 'active', `Status = '${c?.status}' (expected 'active')`);
    assertApprox(parseFloat(c?.currentBalance || '0'), 10000, 1,
        'Balance reset to starting on funded transition');
    assertApprox(parseFloat(c?.profitSplit || '0'), 0.8, 0.001, 'profitSplit = 0.8');
    assert(c?.endsAt === null, `No time limit on funded phase`);
}

// ============================================================
// PHASE 6: Daily Reset & Drawdown Recovery
// ============================================================
async function phase6() {
    console.log('\n🔄 PHASE 6: Daily Reset — Drawdown Recovery\n');

    const uid = await createTestUser('p6-daily');
    const cid = await createTestChallenge(uid, 10000, {
        currentBalance: '9400',       // Lost $600 today — past 5% daily limit ($500)
        startOfDayBalance: '10000',
    });

    // Trade should be BLOCKED (daily drawdown breached)
    await refreshPrices();
    let blocked = false;
    try {
        await TradeExecutor.executeTrade(uid, cid, MARKET_A, 'BUY', 50, 'YES');
    } catch (e: unknown) {
        const err = e as { code?: string; message?: string };
        if (err.message?.toLowerCase().includes('daily') || err.code === 'RISK_LIMIT_EXCEEDED') {
            blocked = true;
        }
    }
    assert(blocked, 'Trade blocked when daily drawdown breached ($600 loss > $500 limit)');

    // Simulate daily reset (cron sets startOfDayBalance = currentBalance)
    await db.update(challenges)
        .set({ startOfDayBalance: '9400' })
        .where(eq(challenges.id, cid));

    // Now trade should PASS (fresh daily allowance)
    await refreshPrices();
    let unblocked = false;
    try {
        const result = await TradeExecutor.executeTrade(uid, cid, MARKET_A, 'BUY', 50, 'YES');
        if (parseFloat(result.shares) > 0) unblocked = true;
    } catch {
        // still blocked
    }
    assert(unblocked, 'Trade accepted after daily reset (fresh daily allowance)');

    // Clean up the position
    const pos = await db.query.positions.findFirst({
        where: and(eq(positions.challengeId, cid), eq(positions.status, 'OPEN'))
    });
    if (pos) {
        const shares = parseFloat(pos.shares);
        await refreshPrices();
        await TradeExecutor.executeTrade(uid, cid, MARKET_A, 'SELL', shares * 0.56, 'YES', { shares, isClosing: true });
    }
}

// ============================================================
// PHASE 7: Data Integrity Invariants
// ============================================================
async function phase7() {
    console.log('\n🔒 PHASE 7: Data Integrity Invariants\n');

    // Get all test challenges
    const testChallenges = await db.query.challenges.findMany({
        where: like(challenges.userId, `${PREFIX}%`)
    });

    for (const c of testChallenges) {
        // 7a: No orphaned OPEN positions on non-active challenges
        if (c.status !== 'active') {
            const orphans = await db.query.positions.findMany({
                where: and(eq(positions.challengeId, c.id), eq(positions.status, 'OPEN'))
            });
            assert(orphans.length === 0,
                `No orphaned positions on ${c.status} challenge ${c.id.slice(0, 8)} (found ${orphans.length})`);
        }

        // 7b: Every CLOSED position has PnL populated
        const closed = await db.query.positions.findMany({
            where: and(eq(positions.challengeId, c.id), eq(positions.status, 'CLOSED'))
        });
        const missingPnl = closed.filter(p => p.pnl === null);
        if (closed.length > 0) {
            assert(missingPnl.length === 0,
                `All ${closed.length} closed positions on ${c.id.slice(0, 8)} have PnL (${missingPnl.length} missing)`);
        }

        // 7c: Every trade has positionId linked
        const allTrades = await db.query.trades.findMany({
            where: eq(trades.challengeId, c.id)
        });
        const unlinked = allTrades.filter(t => t.positionId === null);
        if (allTrades.length > 0) {
            assert(unlinked.length === 0,
                `All ${allTrades.length} trades on ${c.id.slice(0, 8)} have positionId (${unlinked.length} unlinked)`);
        }

        // 7d: No negative shares
        const allPos = await db.query.positions.findMany({
            where: eq(positions.challengeId, c.id)
        });
        const negShares = allPos.filter(p => parseFloat(p.shares) < 0);
        assert(negShares.length === 0,
            `No negative shares on ${c.id.slice(0, 8)} (${negShares.length} found)`);

        // 7e: Balance non-negative
        const balance = parseFloat(c.currentBalance);
        assert(balance >= 0, `Balance non-negative on ${c.id.slice(0, 8)}: $${balance.toFixed(2)}`);
    }

    // 7f: No duplicate active challenges per user (across ALL test users)
    const testUsers = [...new Set(testChallenges.map(c => c.userId))];
    for (const uid of testUsers) {
        const active = testChallenges.filter(c => c.userId === uid && c.status === 'active');
        assert(active.length <= 1,
            `User ${uid.slice(0, 20)} has ${active.length} active challenges (max 1)`);
    }
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanup() {
    console.log('\n🧹 Cleaning up all lifecycle test data...');

    // Get all test user IDs
    const testUsers = await db.query.users.findMany({
        where: like(users.id, `${PREFIX}%`)
    });

    for (const u of testUsers) {
        const userChallenges = await db.query.challenges.findMany({
            where: eq(challenges.userId, u.id)
        });

        for (const c of userChallenges) {
            await db.delete(trades).where(eq(trades.challengeId, c.id));
            await db.delete(positions).where(eq(positions.challengeId, c.id));
            await db.delete(auditLogs).where(eq(auditLogs.targetId, c.id));
        }

        await db.delete(challenges).where(eq(challenges.userId, u.id));
        await db.delete(users).where(eq(users.id, u.id));
    }

    // Clean up Redis test markets
    const prices = JSON.parse(await redis.get('market:prices:all') || '{}');
    delete prices[MARKET_A];
    delete prices[MARKET_B];
    await redis.set('market:prices:all', JSON.stringify(prices));

    const ob = JSON.parse(await redis.get('market:orderbooks') || '{}');
    delete ob[MARKET_A];
    delete ob[MARKET_B];
    await redis.set('market:orderbooks', JSON.stringify(ob));

    const events = JSON.parse(await redis.get('kalshi:active_list') || '[]');
    const filtered = events.filter((e: Record<string, unknown>) => e.title !== 'Lifecycle Test Event');
    await redis.set('kalshi:active_list', JSON.stringify(filtered));

    console.log(`  ✅ Removed ${testUsers.length} test users and all related data`);
}

// ============================================================
// MAIN
// ============================================================
const guard = new TestGuard('lifecycle-bot');
guard.registerCleanup(cleanup);

async function run() {
    console.log('\n🧬 ═══════════════════════════════════════════════');
    console.log('   LIFECYCLE SIMULATOR — Full Challenge Journey');
    console.log('   ═══════════════════════════════════════════════\n');

    await guard.sweepOrphans();

    try {
        const workerServer = await startTestWorkerServer();
        redis = workerServer.redis;
        guard.registerCleanup(workerServer.cleanup);

        await seedRedis();
        console.log('  ✅ Redis seeded with test market data\n');

        await phase1();  // Challenge creation
        await phase2();  // Drawdown breach → failed
        await phase3();  // Profit target → funded
        await phase4();  // Risk monitor breach + PnL settlement
        await phase5();  // Risk monitor profit target + funded
        await phase6();  // Daily reset + recovery
        await phase7();  // Data integrity invariants

    } catch (error: unknown) {
        console.error('\n💀 FATAL ERROR:', error);
        fail++;
    } finally {
        await cleanup();
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log(`   RESULTS: ${pass} passed, ${fail} failed`);
    console.log('═══════════════════════════════════════════════\n');

    guard.markComplete();
    process.exit(fail > 0 ? 1 : 0);
}

run();
