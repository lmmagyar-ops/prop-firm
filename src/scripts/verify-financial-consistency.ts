import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '@/db';
import { users, challenges, positions, trades } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { TradeExecutor } from '@/lib/trade';
import { MarketService } from '@/lib/market';
import { RiskEngine } from '@/lib/risk';
import { calculatePositionMetrics, getPortfolioValue } from '@/lib/position-utils';
import { startTestWorkerServer } from './lib/test-worker-server';
import { TestGuard } from './lib/test-guard';
import type Redis from 'ioredis';
let redis: InstanceType<typeof Redis>;

// ============================================================
// CONFIG
// ============================================================
const TEST_USER_ID = `verify-financial-${Date.now()}`;
const INITIAL_BALANCE = 5000; // $5K — matches Scout tier for risk limit testing
const TRADE_AMOUNT = 50;     // Small trade for Phase 1-3

const MARKET_A = 'test-financial-verify-alpha-001';
const MARKET_B = 'test-financial-verify-beta-002';

// Order book: tight spread for predictable slippage
const BID_PRICE = '0.55';
const ASK_PRICE = '0.57';
const MID_PRICE = '0.56';

// ============================================================
// COUNTERS & TRACKING
// ============================================================
let pass = 0;
let fail = 0;
let testChallengeId: string | null = null;

// ============================================================
// ASSERTION HELPERS
// ============================================================
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
        console.log(`  ✅ ${message} (${actual.toFixed(4)} ≈ ${expected.toFixed(4)}, Δ=${diff.toFixed(4)})`);
        pass++;
    } else {
        console.error(`  ❌ FAIL: ${message} (actual=${actual.toFixed(4)}, expected=${expected.toFixed(4)}, Δ=${diff.toFixed(4)} > tolerance=${tolerance})`);
        fail++;
    }
}

// ============================================================
// REDIS SEEDING
// ============================================================
async function seedRedis() {
    console.log('\n📡 Seeding Redis with test market data...');
    const now = Date.now();

    const pricesAll: Record<string, { price: string; asset_id: string; timestamp: number }> = {};
    pricesAll[MARKET_A] = { price: MID_PRICE, asset_id: MARKET_A, timestamp: now };
    pricesAll[MARKET_B] = { price: MID_PRICE, asset_id: MARKET_B, timestamp: now };

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

    const testEvents = [{
        title: "Financial Consistency Verification Event",
        volume: 50_000_000,
        categories: ["Crypto"],
        description: "Test event for financial consistency verification",
        image: "",
        endDate: new Date(Date.now() + 86400000).toISOString(),
        markets: [
            {
                id: MARKET_A,
                price: parseFloat(MID_PRICE),
                question: "Financial Test Alpha: Will BTC reach $100k?",
                volume: 50_000_000,
                outcomes: ["Yes", "No"]
            },
            {
                id: MARKET_B,
                price: parseFloat(MID_PRICE),
                question: "Financial Test Beta: Will ETH reach $5k?",
                volume: 50_000_000,
                outcomes: ["Yes", "No"]
            }
        ]
    }];

    await redis.set("market:prices:all", JSON.stringify(pricesAll));
    await redis.set("market:orderbooks", JSON.stringify(orderbooksAll));
    await redis.set("kalshi:active_list", JSON.stringify(testEvents));
    await redis.set("market:active_list", JSON.stringify(testEvents[0].markets.map(m => ({
        ...m,
        basePrice: m.price,
        currentPrice: m.price,
        platform: 'polymarket',
    }))));

    console.log('  ✅ Seeded market:prices:all, market:orderbooks, kalshi:active_list, market:active_list');
}

async function refreshPrices() {
    const now = Date.now();
    const pricesAll: Record<string, { price: string; asset_id: string; timestamp: number }> = {};
    pricesAll[MARKET_A] = { price: MID_PRICE, asset_id: MARKET_A, timestamp: now };
    pricesAll[MARKET_B] = { price: MID_PRICE, asset_id: MARKET_B, timestamp: now };
    await redis.set("market:prices:all", JSON.stringify(pricesAll));
}

// ============================================================
// SETUP
// ============================================================
async function setup(): Promise<string> {
    console.log('\n🏗️  Creating test user and challenge...');

    await db.insert(users).values({
        id: TEST_USER_ID,
        email: `fin-verify-${Date.now()}@test.com`,
        name: 'Financial Consistency Bot',
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
    console.log(`  ✅ User: ${TEST_USER_ID.slice(0, 25)}...`);
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

async function getBalance(challengeId: string): Promise<number> {
    const c = await db.query.challenges.findFirst({ where: eq(challenges.id, challengeId) });
    return parseFloat(c?.currentBalance || '0');
}

// ============================================================
// MAIN VERIFICATION
// ============================================================
const guard = new TestGuard('verify-financial-bot');
guard.registerCleanup(cleanup);

async function runVerification() {
    console.log('\n💰 ═══════════════════════════════════════════════');
    console.log('   FINANCIAL CONSISTENCY VERIFICATION');
    console.log('   Catches: value mismatches, sign bugs, slippage,');
    console.log('   misleading error messages, cross-widget sync');
    console.log('   ═══════════════════════════════════════════════\n');

    await guard.sweepOrphans();

    try {
        const workerServer = await startTestWorkerServer();
        redis = workerServer.redis;
        guard.registerCleanup(workerServer.cleanup);

        await seedRedis();
        const challengeId = await setup();

        // ════════════════════════════════════════════════════════════
        // PHASE 1: SHARE COUNT CONSISTENCY
        // Buy a position, then verify shares in the response match DB
        // ════════════════════════════════════════════════════════════
        console.log('\n📊 PHASE 1: Share Count Consistency\n');

        await refreshPrices();
        const buyTrade1 = await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_A, 'BUY', TRADE_AMOUNT, 'YES'
        );

        // Re-query the trade from DB to get the stored values
        const storedTrade1 = await db.query.trades.findFirst({
            where: eq(trades.id, buyTrade1.id)
        });
        assert(storedTrade1 !== undefined, 'Phase 1a: Trade exists in database');

        // Compare shares: trade response vs DB
        const responseShares = parseFloat(buyTrade1.shares);
        const dbShares = parseFloat(storedTrade1!.shares);
        assertApprox(responseShares, dbShares, 0.001,
            'Phase 1b: Trade response shares match DB shares');

        // Compare shares: DB trade vs DB position
        const dbPosition1 = await db.query.positions.findFirst({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.marketId, MARKET_A),
                eq(positions.status, 'OPEN')
            )
        });
        assert(dbPosition1 !== undefined, 'Phase 1c: Position exists in database');

        const positionShares = parseFloat(dbPosition1!.shares);
        assertApprox(responseShares, positionShares, 0.001,
            'Phase 1d: Trade response shares match position shares');

        // Compare entry price: trade vs position
        const tradeEntryPrice = parseFloat(buyTrade1.price);
        const positionEntryPrice = parseFloat(dbPosition1!.entryPrice);
        assertApprox(tradeEntryPrice, positionEntryPrice, 0.001,
            'Phase 1e: Trade entry price matches position entry price');

        console.log(`  ℹ️  Shares: response=${responseShares.toFixed(4)}, trade_db=${dbShares.toFixed(4)}, position_db=${positionShares.toFixed(4)}`);

        // ════════════════════════════════════════════════════════════
        // PHASE 2: PNL CALCULATION CONSISTENCY
        // Verify unrealized PnL is computed identically across paths
        // ════════════════════════════════════════════════════════════
        console.log('\n📉 PHASE 2: PnL Calculation Consistency\n');

        await refreshPrices();

        // Path A: Manual calculation
        const currentPriceData = await MarketService.getLatestPrice(MARKET_A);
        const rawCurrentPrice = currentPriceData ? parseFloat(currentPriceData.price) : parseFloat(MID_PRICE);
        const direction = (dbPosition1!.direction as 'YES' | 'NO') || 'YES';

        // Manual: (effectiveCurrentPrice - entryPrice) * shares
        const metrics = calculatePositionMetrics(
            positionShares,
            positionEntryPrice,
            rawCurrentPrice,
            direction
        );

        // Path B: getPortfolioValue (used by dashboard-service)
        const livePrices = new Map<string, { price: string; source?: string }>();
        livePrices.set(MARKET_A, { price: rawCurrentPrice.toString(), source: 'test' });
        const portfolio = getPortfolioValue([dbPosition1!], livePrices);
        const portfolioPnL = portfolio.positions[0]?.unrealizedPnL ?? NaN;

        assertApprox(metrics.unrealizedPnL, portfolioPnL, 0.01,
            'Phase 2a: calculatePositionMetrics PnL matches getPortfolioValue PnL');

        // Verify PnL sign is correct
        // Since we BUY at ask (0.57) and current mid is 0.56, PnL should be negative
        if (tradeEntryPrice > rawCurrentPrice) {
            assert(metrics.unrealizedPnL < 0,
                'Phase 2b: PnL sign is negative when entry > current (correct)');
        } else if (tradeEntryPrice < rawCurrentPrice) {
            assert(metrics.unrealizedPnL > 0,
                'Phase 2b: PnL sign is positive when entry < current (correct)');
        } else {
            assert(Math.abs(metrics.unrealizedPnL) < 0.01,
                'Phase 2b: PnL is ~zero when entry ≈ current (correct)');
        }

        // Verify PnL magnitude makes sense: |PnL| < tradeAmount
        assert(Math.abs(metrics.unrealizedPnL) < TRADE_AMOUNT,
            'Phase 2c: PnL magnitude is less than trade amount (sanity check)');

        console.log(`  ℹ️  Entry: $${tradeEntryPrice.toFixed(4)}, Current: $${rawCurrentPrice.toFixed(4)}, PnL: $${metrics.unrealizedPnL.toFixed(4)}`);

        // ════════════════════════════════════════════════════════════
        // PHASE 3: SELL PnL CROSS-CHECK
        // Sell position, then verify PnL across all storage locations
        // ════════════════════════════════════════════════════════════
        console.log('\n💸 PHASE 3: Sell PnL Cross-Check\n');

        await refreshPrices();

        // Get pre-sell unrealized PnL for reference
        const preSellPnL = metrics.unrealizedPnL;

        // Execute the sell
        const marketData = await MarketService.getLatestPrice(MARKET_A);
        const currentPrice = marketData ? parseFloat(marketData.price) : parseFloat(MID_PRICE);
        const effectivePrice = direction === 'NO' ? (1 - currentPrice) : currentPrice;
        const marketValue = positionShares * effectivePrice;

        const sellTrade = await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_A, 'SELL', marketValue, direction,
            { shares: positionShares, isClosing: true }
        );

        // Source 1: Re-query the sell trade from DB
        const storedSellTrade = await db.query.trades.findFirst({
            where: eq(trades.id, sellTrade.id)
        });
        const sellTradePnL = storedSellTrade?.realizedPnL ? parseFloat(storedSellTrade.realizedPnL) : null;

        assert(sellTradePnL !== null, 'Phase 3a: Sell trade has realizedPnL populated');

        // Source 2: Re-query the closed position
        const closedPosition = await db.query.positions.findFirst({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.marketId, MARKET_A),
                eq(positions.status, 'CLOSED')
            )
        });
        const positionPnL = closedPosition?.pnl ? parseFloat(closedPosition.pnl) : null;

        assert(positionPnL !== null, 'Phase 3b: Closed position has pnl populated');

        // Cross-check: sell trade PnL vs position PnL
        if (sellTradePnL !== null && positionPnL !== null) {
            assertApprox(sellTradePnL, positionPnL, 0.01,
                'Phase 3c: Sell trade realizedPnL matches position pnl');
        }

        // Verify PnL sign consistency
        if (sellTradePnL !== null) {
            // If entry > exit, PnL should be negative
            const sellPrice = parseFloat(sellTrade.price);
            if (tradeEntryPrice > sellPrice) {
                assert(sellTradePnL < 0,
                    'Phase 3d: PnL sign is negative when sold below entry price');
            } else if (tradeEntryPrice < sellPrice) {
                assert(sellTradePnL > 0,
                    'Phase 3d: PnL sign is positive when sold above entry price');
            }
        }

        console.log(`  ℹ️  Pre-sell unrealized: $${preSellPnL.toFixed(4)}, Sell trade PnL: $${sellTradePnL?.toFixed(4)}, Position PnL: $${positionPnL?.toFixed(4)}`);

        // ════════════════════════════════════════════════════════════
        // PHASE 4: ENTRY PRICE SPREAD AUDIT
        // Verify entry price is within order book bounds
        // ════════════════════════════════════════════════════════════
        console.log('\n📐 PHASE 4: Entry Price Spread Audit\n');

        await refreshPrices();

        // Open a new position for spread analysis
        const buyTrade2 = await TradeExecutor.executeTrade(
            TEST_USER_ID, challengeId, MARKET_B, 'BUY', TRADE_AMOUNT, 'YES'
        );

        const entryPrice2 = parseFloat(buyTrade2.price);
        const midPrice = parseFloat(MID_PRICE);
        const askPrice = parseFloat(ASK_PRICE);
        const bidPrice = parseFloat(BID_PRICE);

        // Entry should be at or near the ask side for a BUY
        assert(entryPrice2 >= bidPrice,
            'Phase 4a: Entry price is at or above bid price');
        assert(entryPrice2 <= parseFloat('0.65'), // some reasonable upper bound due to VWAP
            'Phase 4b: Entry price is below unreasonable upper bound');

        const spreadCostPct = ((entryPrice2 - midPrice) / midPrice * 100);
        const spreadCostDollar = (entryPrice2 - midPrice) * parseFloat(buyTrade2.shares);

        console.log(`  ℹ️  Mid: $${midPrice.toFixed(4)}, Entry: $${entryPrice2.toFixed(4)}, Ask: $${askPrice.toFixed(4)}`);
        console.log(`  ℹ️  Spread cost: ${spreadCostPct.toFixed(2)}% ($${spreadCostDollar.toFixed(2)})`);
        console.log(`  ℹ️  Immediate PnL on open: $${(-spreadCostDollar).toFixed(2)}`);

        // Informational: if spread > 5%, note it — not a failure, but worth flagging
        if (Math.abs(spreadCostPct) > 5) {
            console.log(`  ⚠️  WARNING: Spread cost exceeds 5% — user may see large immediate PnL`);
        }

        // ════════════════════════════════════════════════════════════
        // PHASE 5: RISK LIMIT BOUNDARY TESTS
        // Verify error messages cite correct limits
        // ════════════════════════════════════════════════════════════
        console.log('\n🛡️  PHASE 5: Risk Limit Boundary Tests\n');

        await refreshPrices();

        // Get preflight limits for the market
        const preflight = await RiskEngine.getPreflightLimits(challengeId, MARKET_B);

        console.log(`  ℹ️  Effective max: $${preflight.effectiveMax}, Binding: ${preflight.bindingConstraint}`);
        console.log(`  ℹ️  Per-event remaining: $${preflight.limits.perEventRemaining}`);
        console.log(`  ℹ️  Balance: $${preflight.limits.balance}`);

        assert(preflight.effectiveMax > 0, 'Phase 5a: Preflight reports positive effective max');

        // Try a trade OVER the limit — should be blocked
        const overLimitAmount = preflight.effectiveMax + 10;
        const overLimitResult = await RiskEngine.validateTrade(
            challengeId, MARKET_B, overLimitAmount, 0, 'YES'
        );

        assert(overLimitResult.allowed === false,
            `Phase 5b: Trade of $${overLimitAmount} correctly blocked (limit: $${preflight.effectiveMax})`);

        // Verify the error message references a reasonable dollar amount
        if (overLimitResult.reason) {
            // Extract dollar amounts from the error message
            const dollarAmounts = overLimitResult.reason.match(/\$[\d,]+/g);
            if (dollarAmounts && dollarAmounts.length > 0) {
                // The limit cited in the error should be close to effectiveMax
                const citedAmount = parseFloat(dollarAmounts[0].replace(/[\$,]/g, ''));
                // Allow some tolerance — the error might cite the per-event or volume limit
                assert(citedAmount > 0,
                    `Phase 5c: Error message cites a positive dollar limit ($${citedAmount})`);

                // The cited limit should not be larger than starting balance
                assert(citedAmount <= INITIAL_BALANCE,
                    `Phase 5d: Error message limit ($${citedAmount}) is ≤ starting balance ($${INITIAL_BALANCE})`);

                console.log(`  ℹ️  Error message: "${overLimitResult.reason}"`);
                console.log(`  ℹ️  Cited limit: $${citedAmount}, Actual effective max: $${preflight.effectiveMax}`);
            }

            // Extract percentage from the error message
            const pctMatch = overLimitResult.reason.match(/([\d.]+)%/);
            if (pctMatch) {
                const citedPct = parseFloat(pctMatch[1]);
                const actualPct = (preflight.effectiveMax / INITIAL_BALANCE) * 100;
                // The cited percentage should match what the user can actually trade
                assertApprox(citedPct, actualPct, 1.0,
                    `Phase 5e: Error message percentage (${citedPct}%) ≈ actual limit (${actualPct.toFixed(1)}%)`);
            }
        }

        // Try a trade AT the remaining capacity — should be allowed
        // (Only if remaining capacity is meaningful, i.e., > $1)
        const remainingCapacity = preflight.limits.perEventRemaining;
        if (remainingCapacity > 1) {
            await refreshPrices();
            const atLimitAmount = Math.min(remainingCapacity, preflight.effectiveMax);
            // Use a small amount within limits to verify it passes
            const safeAmount = Math.min(atLimitAmount, 25);
            const atLimitResult = await RiskEngine.validateTrade(
                challengeId, MARKET_B, safeAmount, 0, 'YES'
            );
            assert(atLimitResult.allowed === true,
                `Phase 5f: Trade of $${safeAmount} within limits is allowed`);
        }

        // ════════════════════════════════════════════════════════════
        // PHASE 6: EQUITY CALCULATION CROSS-CHECK
        // Verify equity computed via two independent paths matches
        // ════════════════════════════════════════════════════════════
        console.log('\n⚖️  PHASE 6: Equity Calculation Cross-Check\n');

        await refreshPrices();

        // Path A: Manual equity calculation (dashboard-service path)
        const currentBal = await getBalance(challengeId);
        const openPos = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.status, 'OPEN')
            )
        });
        const posMarketIds = openPos.map((p: { marketId: string }) => p.marketId);
        const batchPrices = posMarketIds.length > 0
            ? await MarketService.getBatchOrderBookPrices(posMarketIds)
            : new Map();
        const portfolioVal = getPortfolioValue(openPos, batchPrices);
        const equityPathA = currentBal + portfolioVal.totalValue;

        // Path B: Via preflight limits (risk engine path)
        const preflight2 = await RiskEngine.getPreflightLimits(challengeId, MARKET_B);
        // Equity = drawdownRemaining + equityFloor
        // equityFloor = startBalance * (1 - maxDrawdownPct)
        const maxDrawdownPct = 0.08; // from rulesConfig
        const equityFloor = INITIAL_BALANCE * (1 - maxDrawdownPct);
        const equityPathB = preflight2.limits.drawdownRemaining + equityFloor;

        assertApprox(equityPathA, equityPathB, 1.0,
            'Phase 6a: Dashboard equity path matches Risk engine equity path');

        // Verify equity is in reasonable range
        assert(equityPathA > 0 && equityPathA <= INITIAL_BALANCE * 1.5,
            'Phase 6b: Equity is in reasonable range (>0, <150% of start)');

        // Verify balance + portfolio value is coherent
        assert(currentBal >= 0,
            'Phase 6c: Cash balance is non-negative');
        assert(portfolioVal.totalValue >= 0,
            'Phase 6d: Portfolio value is non-negative');

        console.log(`  ℹ️  Cash: $${currentBal.toFixed(2)}, Portfolio: $${portfolioVal.totalValue.toFixed(2)}, Equity: $${equityPathA.toFixed(2)}`);
        console.log(`  ℹ️  Risk engine equity: $${equityPathB.toFixed(2)}`);

        // ════════════════════════════════════════════════════════════
        // CLEANUP: Close remaining positions before teardown
        // ════════════════════════════════════════════════════════════
        console.log('\n🧹 Closing remaining test positions...');
        const remainingPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.status, 'OPEN')
            )
        });
        for (const pos of remainingPositions) {
            await refreshPrices();
            const shares = parseFloat(pos.shares);
            const dir = (pos.direction as 'YES' | 'NO') || 'YES';
            const md = await MarketService.getLatestPrice(pos.marketId);
            const cp = md ? parseFloat(md.price) : parseFloat(MID_PRICE);
            const ep = dir === 'NO' ? (1 - cp) : cp;
            const mv = shares * ep;
            await TradeExecutor.executeTrade(
                TEST_USER_ID, challengeId, pos.marketId, 'SELL', mv, dir,
                { shares, isClosing: true }
            );
        }
        console.log(`  ✅ Closed ${remainingPositions.length} remaining positions`);

        // ════════════════════════════════════════════════════════════
        // RESULTS
        // ════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════');
        console.log(`   RESULTS: ${pass} passed, ${fail} failed`);
        console.log('═══════════════════════════════════════════════\n');

        if (fail > 0) {
            console.error('🔴 FINANCIAL CONSISTENCY VERIFICATION FAILED\n');
        } else {
            console.log('🟢 ALL FINANCIAL CONSISTENCY ASSERTIONS PASSED\n');
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
