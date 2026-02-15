import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '@/db';
import { users, challenges, positions, trades } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { TradeExecutor } from '@/lib/trade';
import { getPrivateProfileData } from '@/lib/profile-service';
import { startTestWorkerServer } from './lib/test-worker-server';
import { TestGuard } from './lib/test-guard';
import type Redis from 'ioredis';
let redis: InstanceType<typeof Redis>;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
// MarketService has a 5-second in-memory cache (MARKET_DATA_CACHE_TTL)
// We must wait >5s after changing prices in Redis before executing trades
const CACHE_BUST_DELAY = 6000;

// ============================================================
// CONFIG
// ============================================================
const TEST_USER_ID = `verify-winrate-${Date.now()}`;
const INITIAL_BALANCE = 5000;
const TRADE_AMOUNT = 50;

const MARKET_A = 'test-winrate-alpha-001';
const MARKET_B = 'test-winrate-beta-002';

// ============================================================
// COUNTERS
// ============================================================
let pass = 0;
let fail = 0;
let testChallengeId: string | null = null;

function assert(condition: boolean, message: string) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        pass++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        fail++;
    }
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string) {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
        console.log(`  ✅ ${message} (${actual.toFixed(2)} ≈ ${expected.toFixed(2)}, Δ=${diff.toFixed(2)})`);
        pass++;
    } else {
        console.error(`  ❌ FAIL: ${message} (actual=${actual.toFixed(2)}, expected=${expected.toFixed(2)}, Δ=${diff.toFixed(2)})`);
        fail++;
    }
}

// ============================================================
// REDIS SEEDING — price is configurable per call
// ============================================================
async function seedRedis(priceA: string, priceB: string) {
    const now = Date.now();

    const pricesAll: Record<string, { price: string; asset_id: string; timestamp: number }> = {};
    pricesAll[MARKET_A] = { price: priceA, asset_id: MARKET_A, timestamp: now };
    pricesAll[MARKET_B] = { price: priceB, asset_id: MARKET_B, timestamp: now };

    // Build orderbooks centered on each price
    const makeBook = (mid: string) => ({
        bids: [
            { price: (parseFloat(mid) - 0.01).toFixed(2), size: "50000" },
            { price: (parseFloat(mid) - 0.03).toFixed(2), size: "50000" },
        ],
        asks: [
            { price: (parseFloat(mid) + 0.01).toFixed(2), size: "50000" },
            { price: (parseFloat(mid) + 0.03).toFixed(2), size: "50000" },
        ],
    });

    const orderbooksAll: Record<string, ReturnType<typeof makeBook>> = {};
    orderbooksAll[MARKET_A] = makeBook(priceA);
    orderbooksAll[MARKET_B] = makeBook(priceB);

    const testEvents = [{
        title: "Win Rate Verification Event",
        volume: 50_000_000,
        categories: ["Crypto"],
        description: "Test event for win rate E2E",
        image: "",
        endDate: new Date(Date.now() + 86400000).toISOString(),
        markets: [
            { id: MARKET_A, price: parseFloat(priceA), question: "WinRate Test Alpha", volume: 50_000_000, outcomes: ["Yes", "No"] },
            { id: MARKET_B, price: parseFloat(priceB), question: "WinRate Test Beta", volume: 50_000_000, outcomes: ["Yes", "No"] },
        ],
    }];

    await redis.set("market:prices:all", JSON.stringify(pricesAll));
    await redis.set("market:orderbooks", JSON.stringify(orderbooksAll));
    await redis.set("kalshi:active_list", JSON.stringify(testEvents));
    await redis.set("market:active_list", JSON.stringify(testEvents[0].markets.map(m => ({
        ...m, basePrice: m.price, currentPrice: m.price, platform: 'polymarket',
    }))));
}

// ============================================================
// SETUP
// ============================================================
async function setup(): Promise<string> {
    console.log('\n🏗️  Creating test user and challenge...');

    await db.insert(users).values({
        id: TEST_USER_ID,
        email: `winrate-e2e-${Date.now()}@test.com`,
        name: 'Win Rate E2E Bot',
        role: 'client',
    });

    const [challenge] = await db.insert(challenges).values({
        userId: TEST_USER_ID,
        status: 'active',
        phase: 'challenge',
        platform: 'polymarket',
        rulesConfig: {
            maxDailyDrawdownPercent: 0.04,
            maxTotalDrawdownPercent: 0.08,
            maxPositionSizePercent: 0.05,
            maxCategoryExposurePercent: 0.10,
            maxVolumeImpactPercent: 0.10,
            minMarketVolume: 100_000,
        },
        startingBalance: INITIAL_BALANCE.toString(),
        currentBalance: INITIAL_BALANCE.toString(),
        startOfDayBalance: INITIAL_BALANCE.toString(),
        startedAt: new Date(),
    }).returning();

    testChallengeId = challenge.id;
    console.log(`  ✅ User: ${TEST_USER_ID.slice(0, 30)}...`);
    console.log(`  ✅ Challenge: ${challenge.id.slice(0, 8)}... | Balance: $${INITIAL_BALANCE}`);
    return challenge.id;
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    if (testChallengeId) {
        await db.delete(trades).where(eq(trades.challengeId, testChallengeId));
        await db.delete(positions).where(eq(positions.challengeId, testChallengeId));
        await db.delete(challenges).where(eq(challenges.id, testChallengeId));
    }
    await db.delete(users).where(eq(users.id, TEST_USER_ID));
    if (redis) {
        await redis.del("market:prices:all");
        await redis.del("market:orderbooks");
        await redis.del("kalshi:active_list");
        await redis.del("market:active_list");
    }
    console.log('  ✅ All test data removed');
}

// ============================================================
// MAIN
// ============================================================
const guard = new TestGuard('verify-winrate-bot');
guard.registerCleanup(cleanup);

async function runVerification() {
    console.log('\n🎯 ═══════════════════════════════════════════════');
    console.log('   WIN RATE E2E ROUND-TRIP VERIFICATION');
    console.log('   Traces: DB trade records → profile-service');
    console.log('   → tradingWinRate calculation → UI display');
    console.log('   ═══════════════════════════════════════════════\n');

    await guard.sweepOrphans();

    try {
        const workerServer = await startTestWorkerServer();
        redis = workerServer.redis;
        guard.registerCleanup(workerServer.cleanup);

        const challengeId = await setup();

        // ════════════════════════════════════════════════════════════
        // PHASE A: BASELINE — no trades yet
        // ════════════════════════════════════════════════════════════
        console.log('\n📊 PHASE A: Baseline — No Trades\n');

        await seedRedis('0.56', '0.56');
        const baselineProfile = await getPrivateProfileData(TEST_USER_ID);

        assert(baselineProfile !== null, 'Phase A1: Profile data returned for test user');
        assert(baselineProfile!.metrics.tradingWinRate === null,
            `Phase A2: Win rate is null with no trades (got: ${baselineProfile!.metrics.tradingWinRate})`);
        console.log(`  ℹ️  tradingWinRate = ${baselineProfile!.metrics.tradingWinRate} → UI shows "—"`);

        // ════════════════════════════════════════════════════════════
        // PHASE B: ONE WINNING TRADE — win rate → 100%
        // ════════════════════════════════════════════════════════════
        console.log('\n📈 PHASE B: Winning Trade → 100% Win Rate\n');

        // BUY at 0.56
        await seedRedis('0.56', '0.56');
        const buyTrade1 = await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_A, 'BUY', TRADE_AMOUNT, 'YES'
        );
        const shares1 = parseFloat(buyTrade1.shares);
        const entryPrice1 = parseFloat(buyTrade1.price);
        console.log(`  ℹ️  BUY: ${shares1.toFixed(2)} shares @ $${entryPrice1.toFixed(4)}`);

        // Bump price UP to 0.70 for a profitable exit
        await seedRedis('0.70', '0.56');
        console.log(`  ⏳ Waiting ${CACHE_BUST_DELAY / 1000}s for MarketService cache to expire...`);
        await sleep(CACHE_BUST_DELAY);
        const sellPrice1 = 0.70;
        const sellValue1 = shares1 * sellPrice1;

        const sellTrade1 = await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_A, 'SELL', sellValue1, 'YES',
            { shares: shares1, isClosing: true }
        );

        // Verify DB has a SELL trade with positive PnL
        const dbSellTrade1 = await db.query.trades.findFirst({
            where: eq(trades.id, sellTrade1.id),
        });
        const pnl1 = parseFloat(dbSellTrade1!.realizedPnL || '0');
        assert(dbSellTrade1!.type === 'SELL', 'Phase B1: Trade type is SELL in DB');
        assert(pnl1 > 0, `Phase B2: Realized PnL is positive (${pnl1.toFixed(4)})`);
        console.log(`  ℹ️  SELL: ${shares1.toFixed(2)} shares @ $${sellPrice1.toFixed(4)}, PnL = $${pnl1.toFixed(4)}`);

        // Call profile-service — win rate should be 100%
        const afterWinProfile = await getPrivateProfileData(TEST_USER_ID);
        assert(afterWinProfile!.metrics.tradingWinRate !== null,
            'Phase B3: Win rate is no longer null after a SELL trade');
        assertApprox(afterWinProfile!.metrics.tradingWinRate!, 100, 0.01,
            'Phase B4: Win rate is 100% after 1 winning trade');
        console.log(`  ℹ️  tradingWinRate = ${afterWinProfile!.metrics.tradingWinRate} → UI shows "100.0%"`);

        // ════════════════════════════════════════════════════════════
        // PHASE C: ONE LOSING TRADE — win rate → 50%
        // ════════════════════════════════════════════════════════════
        console.log('\n📉 PHASE C: Losing Trade → 50% Win Rate\n');

        // BUY at 0.56
        await seedRedis('0.56', '0.56');
        const buyTrade2 = await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_B, 'BUY', TRADE_AMOUNT, 'YES'
        );
        const shares2 = parseFloat(buyTrade2.shares);
        const entryPrice2 = parseFloat(buyTrade2.price);
        console.log(`  ℹ️  BUY: ${shares2.toFixed(2)} shares @ $${entryPrice2.toFixed(4)}`);

        // Drop price to 0.40 for a losing exit
        await seedRedis('0.56', '0.40');
        console.log(`  ⏳ Waiting ${CACHE_BUST_DELAY / 1000}s for MarketService cache to expire...`);
        await sleep(CACHE_BUST_DELAY);
        const sellPrice2 = 0.40;
        const sellValue2 = shares2 * sellPrice2;

        const sellTrade2 = await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_B, 'SELL', sellValue2, 'YES',
            { shares: shares2, isClosing: true }
        );

        // Verify DB has a SELL trade with negative PnL
        const dbSellTrade2 = await db.query.trades.findFirst({
            where: eq(trades.id, sellTrade2.id),
        });
        const pnl2 = parseFloat(dbSellTrade2!.realizedPnL || '0');
        assert(dbSellTrade2!.type === 'SELL', 'Phase C1: Trade type is SELL in DB');
        assert(pnl2 < 0, `Phase C2: Realized PnL is negative (${pnl2.toFixed(4)})`);
        console.log(`  ℹ️  SELL: ${shares2.toFixed(2)} shares @ $${sellPrice2.toFixed(4)}, PnL = $${pnl2.toFixed(4)}`);

        // Call profile-service — win rate should be 50%
        const afterLossProfile = await getPrivateProfileData(TEST_USER_ID);
        assert(afterLossProfile!.metrics.tradingWinRate !== null,
            'Phase C3: Win rate is not null after 2 SELL trades');
        assertApprox(afterLossProfile!.metrics.tradingWinRate!, 50, 0.01,
            'Phase C4: Win rate is 50% after 1 win + 1 loss');
        console.log(`  ℹ️  tradingWinRate = ${afterLossProfile!.metrics.tradingWinRate} → UI shows "50.0%"`);

        // ════════════════════════════════════════════════════════════
        // PHASE D: DB CROSS-REFERENCE
        // ════════════════════════════════════════════════════════════
        console.log('\n🔍 PHASE D: DB Cross-Reference Audit\n');

        const allDbTrades = await db.query.trades.findMany({
            where: eq(trades.challengeId, challengeId),
        });
        const sellTradesInDb = allDbTrades.filter(t => t.type === 'SELL');
        const buyTradesInDb = allDbTrades.filter(t => t.type === 'BUY');

        assert(buyTradesInDb.length === 2, `Phase D1: 2 BUY trades in DB (got ${buyTradesInDb.length})`);
        assert(sellTradesInDb.length === 2, `Phase D2: 2 SELL trades in DB (got ${sellTradesInDb.length})`);

        // Manual win rate calculation
        const winningCount = sellTradesInDb.filter(t => parseFloat(t.realizedPnL || '0') > 0).length;
        const manualWinRate = (winningCount / sellTradesInDb.length) * 100;

        assertApprox(manualWinRate, afterLossProfile!.metrics.tradingWinRate!, 0.01,
            `Phase D3: Manual DB calc (${manualWinRate}%) matches profile-service (${afterLossProfile!.metrics.tradingWinRate}%)`);

        // Verify each trade has correct type marker
        for (const t of allDbTrades) {
            if (t.type === 'SELL') {
                assert(t.realizedPnL !== null, `Phase D4: SELL trade ${t.id.slice(0, 8)} has realizedPnL`);
            }
        }

        console.log(`  ℹ️  Total trades: ${allDbTrades.length} (${buyTradesInDb.length} BUY, ${sellTradesInDb.length} SELL)`);
        console.log(`  ℹ️  Winning: ${winningCount}, Losing: ${sellTradesInDb.length - winningCount}`);
        console.log(`  ℹ️  Manual win rate: ${manualWinRate}%, Profile-service: ${afterLossProfile!.metrics.tradingWinRate}%`);

        // ════════════════════════════════════════════════════════════
        // RESULTS
        // ════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════');
        console.log(`   RESULTS: ${pass} passed, ${fail} failed`);
        console.log('═══════════════════════════════════════════════\n');

        if (fail > 0) {
            console.error('🔴 WIN RATE E2E VERIFICATION FAILED\n');
        } else {
            console.log('🟢 ALL WIN RATE E2E ASSERTIONS PASSED\n');
        }

    } catch (error) {
        console.error('\n💥 FATAL ERROR during verification:\n', error);
        fail++;
    } finally {
        await cleanup();
        if (redis) redis.disconnect();
        guard.markComplete();
        process.exit(fail > 0 ? 1 : 0);
    }
}

runVerification();
