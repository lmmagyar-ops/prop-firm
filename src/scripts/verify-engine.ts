import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '@/db';
import { users, challenges, positions, trades } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { TradeExecutor } from '@/lib/trade';
import { MarketService } from '@/lib/market';
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// ============================================================
// CONFIG - All test parameters in one place
// ============================================================
const TEST_USER_ID = `verify-bot-${Date.now()}`;
const INITIAL_BALANCE = 10000;
const TRADE_AMOUNT = 100; // $100 per trade

// Two test markets with known, deterministic prices
const MARKET_A = 'test-engine-verify-market-alpha-001';
const MARKET_B = 'test-engine-verify-market-beta-002';

// Price config: YES bid = 0.55, ask = 0.57
// A BUY YES at $100 should fill near ask side
// A SELL YES should fill near bid side
const BID_PRICE = '0.55';
const ASK_PRICE = '0.57';
const MID_PRICE = '0.56';

// ============================================================
// UTILITY
// ============================================================
let pass = 0;
let fail = 0;
let testChallengeId: string | null = null;

function assert(condition: boolean, message: string) {
    if (condition) {
        pass++;
        console.log(`  ✅ ${message}`);
    } else {
        fail++;
        console.error(`  ❌ FAILED: ${message}`);
    }
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string) {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
        pass++;
        console.log(`  ✅ ${message} (actual: ${actual.toFixed(2)}, expected: ${expected.toFixed(2)}, diff: ${diff.toFixed(4)})`);
    } else {
        fail++;
        console.error(`  ❌ FAILED: ${message} (actual: ${actual.toFixed(2)}, expected: ${expected.toFixed(2)}, diff: ${diff.toFixed(4)})`);
    }
}

async function assertRejects(fn: () => Promise<unknown>, expectedCode: string, message: string) {
    try {
        await fn();
        fail++;
        console.error(`  ❌ FAILED: ${message} (no error thrown)`);
    } catch (e: unknown) {
        const err = e as { code?: string; message?: string };
        if (err.code === expectedCode || err.message?.includes(expectedCode)) {
            pass++;
            console.log(`  ✅ ${message} (got ${err.code || expectedCode})`);
        } else {
            fail++;
            console.error(`  ❌ FAILED: ${message} (expected ${expectedCode}, got ${err.code || err.message})`);
        }
    }
}

// ============================================================
// REDIS SEEDING
// ============================================================
async function seedRedis() {
    console.log('\n📡 Seeding Redis with test market data...');
    const now = Date.now();

    // 1. Consolidated prices (MarketService.getLatestPrice reads this)
    const pricesAll: Record<string, { price: string; asset_id: string; timestamp: number }> = {};
    pricesAll[MARKET_A] = { price: MID_PRICE, asset_id: MARKET_A, timestamp: now };
    pricesAll[MARKET_B] = { price: MID_PRICE, asset_id: MARKET_B, timestamp: now };

    // 2. Order books (MarketService.getOrderBook reads this)
    const orderbooksAll: Record<string, { bids: Array<{ price: string; size: string }>; asks: Array<{ price: string; size: string }> }> = {};
    for (const mid of [MARKET_A, MARKET_B]) {
        orderbooksAll[mid] = {
            bids: [
                { price: BID_PRICE, size: "50000" },
                { price: "0.53", size: "50000" },
                { price: "0.51", size: "50000" }
            ],
            asks: [
                { price: ASK_PRICE, size: "50000" },
                { price: "0.59", size: "50000" },
                { price: "0.61", size: "50000" }
            ]
        };
    }

    // 3. Event lists (RiskEngine.getMarketById reads this)
    const testEvents = [{
        title: "Engine Verification Event",
        volume: 50_000_000,
        categories: ["Crypto"],
        description: "Test event for engine verification",
        image: "",
        endDate: new Date(Date.now() + 86400000).toISOString(),
        markets: [
            {
                id: MARKET_A,
                price: parseFloat(MID_PRICE),
                question: "Test Market Alpha: Will BTC reach $100k?",
                volume: 50_000_000,
                outcomes: ["Yes", "No"]
            },
            {
                id: MARKET_B,
                price: parseFloat(MID_PRICE),
                question: "Test Market Beta: Will ETH reach $5k?",
                volume: 50_000_000,
                outcomes: ["Yes", "No"]
            }
        ]
    }];

    await redis.set("market:prices:all", JSON.stringify(pricesAll));
    await redis.set("market:orderbooks", JSON.stringify(orderbooksAll));
    await redis.set("kalshi:active_list", JSON.stringify(testEvents));
    // Also seed market:active_list for getMarketById fallback
    await redis.set("market:active_list", JSON.stringify(testEvents[0].markets.map(m => ({
        ...m,
        basePrice: m.price,
        currentPrice: m.price,
        platform: 'polymarket',
    }))));

    console.log('  ✅ Seeded market:prices:all, market:orderbooks, kalshi:active_list, market:active_list');
}

// ============================================================
// REFRESH PRICES (re-seed with fresh timestamps to avoid staleness)
// ============================================================
async function refreshPrices() {
    const now = Date.now();
    const pricesAll: Record<string, { price: string; asset_id: string; timestamp: number }> = {};
    pricesAll[MARKET_A] = { price: MID_PRICE, asset_id: MARKET_A, timestamp: now };
    pricesAll[MARKET_B] = { price: MID_PRICE, asset_id: MARKET_B, timestamp: now };
    await redis.set("market:prices:all", JSON.stringify(pricesAll));
}

// ============================================================
// TEST SETUP
// ============================================================
async function setup(): Promise<string> {
    console.log('\n🏗️  Creating test user and challenge...');

    // Create test user
    await db.insert(users).values({
        id: TEST_USER_ID,
        email: `verify-${Date.now()}@test.com`,
        name: 'Engine Verification Bot',
        role: 'client',
    });

    // Create challenge with proper rules config
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
    console.log(`  ✅ User: ${TEST_USER_ID.slice(0, 20)}...`);
    console.log(`  ✅ Challenge: ${challenge.id.slice(0, 8)}... | Balance: $${INITIAL_BALANCE}`);

    return challenge.id;
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanup() {
    console.log('\n🧹 Cleaning up test data...');

    if (testChallengeId) {
        // Delete trades first (FK constraint)
        await db.delete(trades).where(eq(trades.challengeId, testChallengeId));
        // Delete positions
        await db.delete(positions).where(eq(positions.challengeId, testChallengeId));
        // Delete challenge
        await db.delete(challenges).where(eq(challenges.id, testChallengeId));
    }
    // Delete test user
    await db.delete(users).where(eq(users.id, TEST_USER_ID));

    // Clean up Redis test data
    await redis.del("market:prices:all");
    await redis.del("market:orderbooks");
    await redis.del("kalshi:active_list");
    await redis.del("market:active_list");

    console.log('  ✅ All test data removed');
}

// ============================================================
// GET BALANCE
// ============================================================
async function getBalance(challengeId: string): Promise<number> {
    const c = await db.query.challenges.findFirst({ where: eq(challenges.id, challengeId) });
    return parseFloat(c?.currentBalance || '0');
}

// ============================================================
// MAIN TEST
// ============================================================
async function runVerification() {
    console.log('\n🧪 ═══════════════════════════════════════════════');
    console.log('   TRADE ENGINE ROUND-TRIP VERIFICATION');
    console.log('   ═══════════════════════════════════════════════\n');

    try {
        // ---- PHASE 0: Setup ----
        await seedRedis();
        const challengeId = await setup();

        // ---- PHASE 1: Open Trades ----
        console.log('\n📈 PHASE 1: Opening positions...\n');

        // Trade 1: BUY YES on Market A ($100)
        await refreshPrices();
        const buyTrade1 = await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_A, 'BUY', TRADE_AMOUNT, 'YES'
        );
        const balance1 = await getBalance(challengeId);
        console.log(`  Trade 1: BUY YES @ ${buyTrade1.price} | ${buyTrade1.shares} shares | Balance: $${balance1.toFixed(2)}`);
        assertApprox(balance1, INITIAL_BALANCE - TRADE_AMOUNT, 0.01, 'Balance deducted $100 after BUY 1');

        // Trade 2: BUY NO on Market B ($100)
        await refreshPrices();
        const buyTrade2 = await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_B, 'BUY', TRADE_AMOUNT, 'NO'
        );
        const balance2 = await getBalance(challengeId);
        console.log(`  Trade 2: BUY NO @ ${buyTrade2.price} | ${buyTrade2.shares} shares | Balance: $${balance2.toFixed(2)}`);
        assertApprox(balance2, INITIAL_BALANCE - (TRADE_AMOUNT * 2), 0.01, 'Balance deducted $200 total after BUY 2');

        // Verify positions were created
        const openPositions = await db.query.positions.findMany({
            where: and(eq(positions.challengeId, challengeId), eq(positions.status, 'OPEN'))
        });
        assert(openPositions.length === 2, `2 open positions created (got ${openPositions.length})`);

        // ---- PHASE 2: Close All Positions ----
        console.log('\n📉 PHASE 2: Closing all positions...\n');

        for (let i = 0; i < openPositions.length; i++) {
            const pos = openPositions[i];
            const shares = parseFloat(pos.shares);
            const direction = (pos.direction as 'YES' | 'NO') || 'YES';

            // Refresh prices to avoid staleness
            await refreshPrices();

            // Get current market price for the sell
            const marketData = await MarketService.getLatestPrice(pos.marketId);
            const currentPrice = marketData ? parseFloat(marketData.price) : parseFloat(MID_PRICE);
            const effectivePrice = direction === 'NO' ? (1 - currentPrice) : currentPrice;
            const marketValue = shares * effectivePrice;

            const sellTrade = await TradeExecutor.executeTrade(
                TEST_USER_ID,
                challengeId,
                pos.marketId,
                'SELL',
                marketValue,
                direction,
                { shares, isClosing: true }
            );

            const balanceAfterClose = await getBalance(challengeId);
            // Re-query from DB since executeTrade returns the initial insert (before PnL update)
            const updatedTrade = await db.query.trades.findFirst({ where: eq(trades.id, sellTrade.id) });
            const pnl = updatedTrade?.realizedPnL ? parseFloat(updatedTrade.realizedPnL) : null;

            console.log(`  Close ${i + 1}: SELL ${direction} | ${shares.toFixed(2)} shares | PnL: $${pnl?.toFixed(2) ?? 'null'} | Balance: $${balanceAfterClose.toFixed(2)}`);
            assert(pnl !== null, `realizedPnL is populated (not null) for close ${i + 1}`);
        }

        // ---- PHASE 3: Verify Final State ----
        console.log('\n🔍 PHASE 3: Verifying final state...\n');

        const finalBalance = await getBalance(challengeId);

        // Since we buy and sell at the same order book prices, PnL should be close to $0
        // BUT: slippage from walking the order book means BUY fills at ASK, SELL fills at BID
        // So actual PnL per trade ≈ shares * (bidPrice - askPrice) = negative spread cost
        // This is expected and correct — the test verifies the math, not zero PnL
        const totalBuys = 2;
        const totalSells = openPositions.length;
        const expectedTradeCount = totalBuys + totalSells;

        // Check all positions are CLOSED
        const remainingOpen = await db.query.positions.findMany({
            where: and(eq(positions.challengeId, challengeId), eq(positions.status, 'OPEN'))
        });
        assert(remainingOpen.length === 0, `All positions closed (${remainingOpen.length} remaining)`);

        // Check trade count
        const allTrades = await db.query.trades.findMany({
            where: eq(trades.challengeId, challengeId)
        });
        assert(allTrades.length === expectedTradeCount, `${expectedTradeCount} trades recorded (got ${allTrades.length})`);

        // Check realizedPnL on SELL trades
        const sellTrades = allTrades.filter(t => t.type === 'SELL');
        const pnlPopulated = sellTrades.every(t => t.realizedPnL !== null);
        assert(pnlPopulated, `All SELL trades have realizedPnL populated`);

        // Check positionId is linked on ALL trades (Fix #2 from schema audit)
        const posIdPopulated = allTrades.every(t => t.positionId !== null);
        assert(posIdPopulated, `All trades have positionId linked`);

        // Check positions.pnl is populated on CLOSED positions (Fix #1 from schema audit)
        const closedPositions = await db.query.positions.findMany({
            where: and(eq(positions.challengeId, challengeId), eq(positions.status, 'CLOSED'))
        });
        const posPnlPopulated = closedPositions.every(p => p.pnl !== null && p.pnl !== '0');
        assert(posPnlPopulated, `All closed positions have pnl populated`);

        // Check balance math: final balance should be LESS than starting (spread cost)
        // but within a reasonable range ($0-$20 loss from spread)
        const balanceDiff = finalBalance - INITIAL_BALANCE;
        console.log(`  Balance change: $${balanceDiff.toFixed(2)} (spread cost)`);
        assert(Math.abs(balanceDiff) < 50, `Balance change within $50 tolerance (got $${balanceDiff.toFixed(2)})`);

        // ---- PHASE 4: Stats Verification (direct DB, no Next.js dependency) ----
        console.log('\n📊 PHASE 4: Verifying trade stats...\n');

        // Re-query trades with PnL values (they may have been updated after initial insert)
        const freshTrades = await db.query.trades.findMany({
            where: eq(trades.challengeId, challengeId)
        });
        const freshSells = freshTrades.filter(t => t.type === 'SELL');

        assert(freshTrades.length === expectedTradeCount, `${expectedTradeCount} trades in DB (got ${freshTrades.length})`);

        // Verify PnL sum
        const sumPnL = freshSells.reduce((sum, t) => sum + parseFloat(t.realizedPnL || '0'), 0);
        const balanceFromPnL = INITIAL_BALANCE + sumPnL;
        assertApprox(finalBalance, balanceFromPnL, 0.01, `Final balance ($${finalBalance.toFixed(2)}) matches start + PnL ($${balanceFromPnL.toFixed(2)})`);

        // Verify win/loss classification
        const winCount = freshSells.filter(t => parseFloat(t.realizedPnL || '0') > 0).length;
        const lossCount = freshSells.filter(t => parseFloat(t.realizedPnL || '0') <= 0).length;
        console.log(`  Wins: ${winCount}, Losses: ${lossCount}`);
        console.log(`  Total PnL: $${sumPnL.toFixed(2)}`);
        console.log(`  Spread cost: $${(INITIAL_BALANCE - finalBalance).toFixed(2)}`);

        // ---- PHASE 5: Edge Case Trades ----
        console.log('\n🔬 PHASE 5: Edge case trades (add-to-position, partial close)...\n');

        // Use a fresh market for this phase to avoid interference
        const MARKET_C = MARKET_A; // Re-use market A (positions were closed)
        const phase5Start = await getBalance(challengeId);

        // 5a: Open a position
        await refreshPrices();
        const edgeBuy1 = await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_C, 'BUY', TRADE_AMOUNT, 'YES'
        );
        const bal5a = await getBalance(challengeId);
        assertApprox(bal5a, phase5Start - TRADE_AMOUNT, 0.01, 'Phase 5a: First BUY deducted $100');

        // 5b: Add to position (BUY again on same market + direction)
        await refreshPrices();
        const edgeBuy2 = await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_C, 'BUY', TRADE_AMOUNT, 'YES'
        );
        const bal5b = await getBalance(challengeId);
        assertApprox(bal5b, phase5Start - (TRADE_AMOUNT * 2), 0.01, 'Phase 5b: Second BUY deducted another $100');

        // Verify position was combined, not duplicated
        const combinedPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.marketId, MARKET_C),
                eq(positions.direction, 'YES'),
                eq(positions.status, 'OPEN')
            )
        });
        assert(combinedPositions.length === 1, `Add-to-position: still 1 open position (got ${combinedPositions.length})`);
        const combinedShares = parseFloat(combinedPositions[0].shares);
        const expectedCombinedShares = parseFloat(edgeBuy1.shares) + parseFloat(edgeBuy2.shares);
        assertApprox(combinedShares, expectedCombinedShares, 0.01, `Combined shares: ${combinedShares.toFixed(2)} ≈ ${expectedCombinedShares.toFixed(2)}`);

        // 5c: Partial close (sell half the shares)
        const halfShares = combinedShares / 2;
        await refreshPrices();
        const marketDataForPartial = await MarketService.getLatestPrice(MARKET_C);
        const partialPrice = marketDataForPartial ? parseFloat(marketDataForPartial.price) : parseFloat(MID_PRICE);
        const partialValue = halfShares * partialPrice;

        const partialSell = await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_C, 'SELL', partialValue, 'YES',
            { shares: halfShares, isClosing: false }
        );

        // Position should still be OPEN with half the shares
        const afterPartial = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.marketId, MARKET_C),
                eq(positions.direction, 'YES'),
                eq(positions.status, 'OPEN')
            )
        });
        assert(afterPartial.length === 1, 'Partial close: position still OPEN');
        const remainingShares = parseFloat(afterPartial[0].shares);
        assertApprox(remainingShares, halfShares, 0.5, `Remaining shares: ${remainingShares.toFixed(2)} ≈ ${halfShares.toFixed(2)}`);

        // Verify realizedPnL on partial sell
        const partialTradeDb = await db.query.trades.findFirst({ where: eq(trades.id, partialSell.id) });
        assert(partialTradeDb?.realizedPnL !== null, 'Partial close: realizedPnL populated');
        assert(partialTradeDb?.positionId !== null, 'Partial close: positionId linked');

        // 5d: Close remainder
        await refreshPrices();
        const remainMarketData = await MarketService.getLatestPrice(MARKET_C);
        const remainPrice = remainMarketData ? parseFloat(remainMarketData.price) : parseFloat(MID_PRICE);
        const remainValue = remainingShares * remainPrice;

        await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_C, 'SELL', remainValue, 'YES',
            { shares: remainingShares, isClosing: true }
        );

        // Position should now be CLOSED
        const afterFullClose = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.marketId, MARKET_C),
                eq(positions.direction, 'YES'),
                eq(positions.status, 'OPEN')
            )
        });
        assert(afterFullClose.length === 0, 'Full close: no open positions remaining');

        // Verify the closed position has pnl set
        const closedPos = await db.query.positions.findFirst({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.marketId, MARKET_C),
                eq(positions.direction, 'YES'),
                eq(positions.status, 'CLOSED')
            )
        });
        // We have 2 closed positions for this market now (one from Phase 2, one from Phase 5)
        // Just check the latest one
        assert(closedPos !== undefined, 'Closed position exists in DB');

        // ---- PHASE 6: Risk Engine Rejection Tests ----
        console.log('\n🛡️  PHASE 6: Risk engine rejection tests...\n');

        // 6a: Insufficient funds — try to buy more than remaining balance
        const currentBal = await getBalance(challengeId);
        await refreshPrices();
        await assertRejects(
            () => TradeExecutor.executeTrade(
                TEST_USER_ID, challengeId, MARKET_A, 'BUY', currentBal + 1000, 'YES'
            ),
            'INSUFFICIENT_FUNDS',
            `Insufficient funds rejected (tried $${(currentBal + 1000).toFixed(0)} with $${currentBal.toFixed(0)} balance)`
        );

        // 6b: SELL without position — try to sell on a market with no position
        const FAKE_MARKET = 'nonexistent-market-for-rejection-test';
        // Seed fake market data in Redis so it passes market data AND order book checks
        const now = Date.now();
        const pricesAll: Record<string, { price: string; asset_id: string; timestamp: number }> = {};
        pricesAll[MARKET_A] = { price: MID_PRICE, asset_id: MARKET_A, timestamp: now };
        pricesAll[MARKET_B] = { price: MID_PRICE, asset_id: MARKET_B, timestamp: now };
        pricesAll[FAKE_MARKET] = { price: MID_PRICE, asset_id: FAKE_MARKET, timestamp: now };
        await redis.set("market:prices:all", JSON.stringify(pricesAll));

        // Also seed the order book for FAKE_MARKET
        const existingOrderbooks = JSON.parse(await redis.get("market:orderbooks") || '{}');
        existingOrderbooks[FAKE_MARKET] = {
            bids: [
                { price: BID_PRICE, size: "50000" },
                { price: "0.53", size: "50000" }
            ],
            asks: [
                { price: ASK_PRICE, size: "50000" },
                { price: "0.59", size: "50000" }
            ]
        };
        await redis.set("market:orderbooks", JSON.stringify(existingOrderbooks));

        await assertRejects(
            () => TradeExecutor.executeTrade(
                TEST_USER_ID, challengeId, FAKE_MARKET, 'SELL', 50, 'YES',
                { shares: 10, isClosing: true }
            ),
            'POSITION_NOT_FOUND',
            'SELL without position rejected'
        );

        // 6c: Per-event exposure limit — buy > 5% of starting balance ($10,000 * 0.05 = $500)
        // Our rulesConfig has maxPositionSizePercent: 0.05, so max per event = $500
        await refreshPrices();
        await assertRejects(
            () => TradeExecutor.executeTrade(
                TEST_USER_ID, challengeId, MARKET_A, 'BUY', 501, 'YES'
            ),
            'RISK_LIMIT_EXCEEDED',
            'Per-event exposure limit ($501 > $500 max) rejected'
        );

        // Verify balance didn't change from rejected trades
        const balAfterRejections = await getBalance(challengeId);
        assertApprox(balAfterRejections, currentBal, 0.01, 'Balance unchanged after rejected trades');

        // ---- PHASE 7: Balance Invariants ----
        console.log('\n🔒 PHASE 7: Balance invariants...\n');

        // 7a: Balance never negative
        const finalBal = await getBalance(challengeId);
        assert(finalBal >= 0, `Balance is non-negative ($${finalBal.toFixed(2)})`);

        // 7b: No position has negative shares
        const allPositions = await db.query.positions.findMany({
            where: eq(positions.challengeId, challengeId)
        });
        const negativeShares = allPositions.filter(p => parseFloat(p.shares) < 0);
        assert(negativeShares.length === 0, `No positions with negative shares (found ${negativeShares.length})`);

        // 7c: Every trade has positionId linked
        const allTradesPhase7 = await db.query.trades.findMany({
            where: eq(trades.challengeId, challengeId)
        });
        const unlinkedTrades = allTradesPhase7.filter(t => t.positionId === null);
        assert(unlinkedTrades.length === 0, `All ${allTradesPhase7.length} trades have positionId (${unlinkedTrades.length} unlinked)`);

        // 7d: Every CLOSED position has pnl populated
        const closedPositions7 = allPositions.filter(p => p.status === 'CLOSED');
        const missingPnl = closedPositions7.filter(p => p.pnl === null);
        assert(missingPnl.length === 0, `All ${closedPositions7.length} closed positions have pnl (${missingPnl.length} missing)`);

        // 7e: PnL reconciliation — final balance should equal starting + sum of all realized PnL
        const allSells = allTradesPhase7.filter(t => t.type === 'SELL');
        const totalPnL = allSells.reduce((sum, t) => sum + parseFloat(t.realizedPnL || '0'), 0);
        const expectedBalance = INITIAL_BALANCE + totalPnL;
        assertApprox(finalBal, expectedBalance, 0.05, `PnL reconciliation: $${finalBal.toFixed(2)} ≈ $${INITIAL_BALANCE} + $${totalPnL.toFixed(2)}`);

        // ---- RESULTS ----
        console.log('\n═══════════════════════════════════════════════');
        console.log(`   RESULTS: ${pass} passed, ${fail} failed`);
        console.log('═══════════════════════════════════════════════\n');

        if (fail > 0) {
            console.error('🔴 VERIFICATION FAILED\n');
        } else {
            console.log('🟢 ALL ASSERTIONS PASSED\n');
        }

    } catch (error) {
        console.error('\n💥 FATAL ERROR during verification:\n', error);
        fail++;
    } finally {
        // ALWAYS clean up, even on failure
        await cleanup();
        redis.disconnect();
        process.exit(fail > 0 ? 1 : 0);
    }
}

runVerification();
