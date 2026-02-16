/**
 * End-to-End Integration Test — The "Mat Test"
 *
 * This test does exactly what Mat does on his first login:
 * Creates a user → starts a challenge → BUYs a position → SELLs it back.
 *
 * Everything runs against the REAL database. Only external API boundaries
 * (Polymarket Gamma API, Redis caches) are mocked. The trade engine, risk
 * engine, balance manager, and position manager all run for real.
 *
 * This catches the class of bug where 966 unit tests pass but a real user's
 * first trade breaks — Drizzle schema mismatches, transaction ordering bugs,
 * type coercion (string "10000" vs number 10000), FK violations, etc.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// ─── Mock EXTERNAL boundaries ONLY ────────────────────────────────
// These must be declared before any imports that use them.

// 1. MarketService — hits Gamma API / Redis
vi.mock('@/lib/market', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/market')>();
    return {
        ...actual,
        MarketService: {
            ...actual.MarketService,
            // Mock only the external-facing methods
            getCanonicalPrice: vi.fn().mockResolvedValue(0.65),
            getBatchTitles: vi.fn().mockResolvedValue(new Map([
                ['test-market-integration', 'Integration Test Market'],
            ])),
            getBatchOrderBookPrices: vi.fn().mockResolvedValue(new Map()),
            // Keep the REAL implementations for pure functions
            buildSyntheticOrderBookPublic: actual.MarketService.buildSyntheticOrderBookPublic,
            calculateImpact: actual.MarketService.calculateImpact,
        },
    };
});

// 2. Market actions — hit Gamma API / Redis for risk engine
vi.mock('@/app/actions/market', () => ({
    getMarketById: vi.fn().mockResolvedValue({
        id: 'test-market-integration',
        question: 'Will integration test pass?',
        categories: ['test'],
        volume: 50_000_000,   // $50M — well above minimum
        volume24hr: 1_000_000, // $1M/day
        active: true,
    }),
    getAllMarketsFlat: vi.fn().mockResolvedValue([]),
    getActiveMarkets: vi.fn().mockResolvedValue([]),
    getEventInfoForMarket: vi.fn().mockResolvedValue(null), // Single-market event (no siblings)
}));

// 3. Outage manager — hits Redis
vi.mock('@/lib/outage-manager', () => ({
    OutageManager: {
        getOutageStatus: vi.fn().mockResolvedValue({ isOutage: false }),
    },
}));

// 4. Logger — prevent console noise during tests
vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

// 5. Alerts — prevent external notifications
vi.mock('@/lib/alerts', () => ({
    alerts: { tradeFailed: vi.fn(), anomaly: vi.fn() },
}));

// 6. Invariant — use real logic but suppress Sentry
vi.mock('@/lib/invariant', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/invariant')>();
    return {
        ...actual,
        // Keep invariant working (it throws on violation — that's what we want)
        // But suppress any Sentry/external calls
    };
});

// ─── Import AFTER mocks are set up ──────────────────────────────
import { db } from '@/db';
import { users, challenges, positions, trades } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { TradeExecutor } from '@/lib/trade';

// ─── Constants ──────────────────────────────────────────────────
const TEST_EMAIL_PREFIX = '__integration_test_';
const TEST_EMAIL = `${TEST_EMAIL_PREFIX}${Date.now()}@test.local`;
const TEST_MARKET_ID = 'test-market-integration';
const STARTING_BALANCE = 10_000;
const TRADE_AMOUNT = 50; // $50 BUY

// ─── Test State ─────────────────────────────────────────────────
let testUserId: string;
let testChallengeId: string;
let buyShares: number;

// ─── Test Suite ─────────────────────────────────────────────────

describe('Integration: Full Trade Round-Trip', () => {

    // ── SETUP: Create test user + challenge directly in DB ──────
    beforeAll(async () => {
        // Clean up any stale test data from crashed previous runs
        const staleUsers = await db
            .select({ id: users.id })
            .from(users)
            .where(like(users.email, `${TEST_EMAIL_PREFIX}%`));

        for (const user of staleUsers) {
            // FK-safe: delete trades → positions → challenges → user
            const userChallenges = await db
                .select({ id: challenges.id })
                .from(challenges)
                .where(eq(challenges.userId, user.id));

            for (const c of userChallenges) {
                await db.delete(trades).where(eq(trades.challengeId, c.id));
                await db.delete(positions).where(eq(positions.challengeId, c.id));
                await db.delete(challenges).where(eq(challenges.id, c.id));
            }
            await db.delete(users).where(eq(users.id, user.id));
        }

        // Insert test user (minimal — only required fields)
        const [testUser] = await db.insert(users).values({
            email: TEST_EMAIL,
            name: 'Integration Test User',
        }).returning();

        testUserId = testUser.id;

        // Create challenge with default rules (same as ChallengeManager.createChallenge)
        const [testChallenge] = await db.insert(challenges).values({
            userId: testUserId,
            phase: 'challenge',
            status: 'active',
            startingBalance: STARTING_BALANCE.toString(),
            currentBalance: STARTING_BALANCE.toString(),
            highWaterMark: STARTING_BALANCE.toString(),
            startOfDayBalance: STARTING_BALANCE.toString(),
            rulesConfig: {
                tier: '10k',
                startingBalance: STARTING_BALANCE,
                profitTarget: 1000,
                maxDrawdown: 800,
                maxTotalDrawdownPercent: 0.08,
                maxDailyDrawdownPercent: 0.04,
                maxPositionSizePercent: 0.05,
                maxCategoryExposurePercent: 0.10,
                lowVolumeThreshold: 10_000_000,
                lowVolumeMaxPositionPercent: 0.025,
                maxVolumeImpactPercent: 0.10,
                minMarketVolume: 100_000,
                maxDrawdownPercent: 0.08,
                dailyLossPercent: 0.04,
                profitTargetPercent: 0.10,
                durationDays: 60,
                profitSplit: 0.7,
            },
            startedAt: new Date(),
            endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        }).returning();

        testChallengeId = testChallenge.id;
    });

    // ── TEARDOWN: Remove all test data ──────────────────────────
    afterAll(async () => {
        // Delete in FK-safe order: trades → positions → challenges → users
        // (trades FK to challenges is NOT cascade-delete)
        if (testChallengeId) {
            await db.delete(trades).where(eq(trades.challengeId, testChallengeId));
            await db.delete(positions).where(eq(positions.challengeId, testChallengeId));
            await db.delete(challenges).where(eq(challenges.id, testChallengeId));
        }
        if (testUserId) {
            await db.delete(users).where(eq(users.id, testUserId));
        }

        // Belt-and-suspenders: clean any stragglers from crashed runs
        const staleUsers = await db
            .select({ id: users.id })
            .from(users)
            .where(like(users.email, `${TEST_EMAIL_PREFIX}%`));

        for (const user of staleUsers) {
            // Get their challenges to clean trades/positions first
            const userChallenges = await db
                .select({ id: challenges.id })
                .from(challenges)
                .where(eq(challenges.userId, user.id));

            for (const c of userChallenges) {
                await db.delete(trades).where(eq(trades.challengeId, c.id));
                await db.delete(positions).where(eq(positions.challengeId, c.id));
                await db.delete(challenges).where(eq(challenges.id, c.id));
            }
            await db.delete(users).where(eq(users.id, user.id));
        }
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 1: BUY — Execute a trade and verify DB state
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    it('BUY: creates position, deducts balance, records trade', async () => {
        const result = await TradeExecutor.executeTrade(
            testUserId,
            testChallengeId,
            TEST_MARKET_ID,
            'BUY',
            TRADE_AMOUNT,
            'YES'
        );

        // ── VERIFY: Trade row exists ──────────────────────────
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();

        const [tradeRow] = await db
            .select()
            .from(trades)
            .where(eq(trades.id, result.id));

        expect(tradeRow).toBeDefined();
        expect(tradeRow.type).toBe('BUY');
        expect(tradeRow.direction).toBe('YES');
        expect(tradeRow.marketId).toBe(TEST_MARKET_ID);
        expect(tradeRow.marketTitle).toBe('Integration Test Market');
        expect(tradeRow.positionId).not.toBeNull();

        // ── VERIFY: Shares × Price ≈ Amount (no phantom PnL) ─
        const tradeShares = parseFloat(tradeRow.shares);
        const tradePrice = parseFloat(tradeRow.price);
        const tradeAmount = parseFloat(tradeRow.amount);

        expect(tradeShares).toBeGreaterThan(0);
        expect(tradePrice).toBeGreaterThan(0);
        expect(tradePrice).toBeLessThan(1);
        expect(Math.abs(tradeShares * tradePrice - tradeAmount)).toBeLessThan(1.0);

        // Save for SELL test
        buyShares = tradeShares;

        // ── VERIFY: Position created ──────────────────────────
        const [positionRow] = await db
            .select()
            .from(positions)
            .where(and(
                eq(positions.challengeId, testChallengeId),
                eq(positions.marketId, TEST_MARKET_ID),
                eq(positions.status, 'OPEN')
            ));

        expect(positionRow).toBeDefined();
        expect(parseFloat(positionRow.shares)).toBeCloseTo(tradeShares, 2);
        expect(positionRow.direction).toBe('YES');

        // ── VERIFY: Balance decreased ─────────────────────────
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, testChallengeId));

        const newBalance = parseFloat(challenge.currentBalance);
        expect(newBalance).toBeLessThan(STARTING_BALANCE);
        expect(newBalance).toBeGreaterThan(STARTING_BALANCE - TRADE_AMOUNT - 5); // Allow slippage
        expect(newBalance).toBeLessThanOrEqual(STARTING_BALANCE - TRADE_AMOUNT + 1);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 2: SELL — Close position and verify round-trip
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    it('SELL: closes position, credits balance, records realized PnL', async () => {
        // Sell all shares we just bought
        const result = await TradeExecutor.executeTrade(
            testUserId,
            testChallengeId,
            TEST_MARKET_ID,
            'SELL',
            TRADE_AMOUNT, // Amount is ignored when shares provided
            'YES',
            { shares: buyShares }
        );

        // ── VERIFY: Trade row exists ──────────────────────────
        expect(result).toBeDefined();

        const [sellTradeRow] = await db
            .select()
            .from(trades)
            .where(eq(trades.id, result.id));

        expect(sellTradeRow).toBeDefined();
        expect(sellTradeRow.type).toBe('SELL');
        expect(sellTradeRow.direction).toBe('YES');
        expect(sellTradeRow.positionId).not.toBeNull();
        expect(sellTradeRow.realizedPnL).not.toBeNull();

        // ── VERIFY: Position closed ───────────────────────────
        const openPositions = await db
            .select()
            .from(positions)
            .where(and(
                eq(positions.challengeId, testChallengeId),
                eq(positions.marketId, TEST_MARKET_ID),
                eq(positions.status, 'OPEN')
            ));

        expect(openPositions).toHaveLength(0);

        const closedPositions = await db
            .select()
            .from(positions)
            .where(and(
                eq(positions.challengeId, testChallengeId),
                eq(positions.marketId, TEST_MARKET_ID),
                eq(positions.status, 'CLOSED')
            ));

        expect(closedPositions).toHaveLength(1);
        expect(closedPositions[0].closedAt).not.toBeNull();
        expect(closedPositions[0].pnl).not.toBeNull();

        // ── VERIFY: Balance ≈ starting (spread cost only) ─────
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, testChallengeId));

        const finalBalance = parseFloat(challenge.currentBalance);

        // Round-trip at same price → PnL should be near zero
        // Allow up to $2 for spread cost on a $50 trade
        expect(Math.abs(finalBalance - STARTING_BALANCE)).toBeLessThan(2.0);

        // Absolutely no phantom PnL — balance should NOT be higher than starting
        // (buying and selling at the same price can only lose the spread)
        expect(finalBalance).toBeLessThanOrEqual(STARTING_BALANCE + 0.01);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 3: Verify trade count and linking
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    it('has exactly 2 trades, both linked to the same position', async () => {
        const allTrades = await db
            .select()
            .from(trades)
            .where(eq(trades.challengeId, testChallengeId));

        expect(allTrades).toHaveLength(2);

        const buyTrade = allTrades.find(t => t.type === 'BUY');
        const sellTrade = allTrades.find(t => t.type === 'SELL');

        expect(buyTrade).toBeDefined();
        expect(sellTrade).toBeDefined();

        // Both trades must reference the same position
        expect(buyTrade!.positionId).toBe(sellTrade!.positionId);
        expect(buyTrade!.positionId).not.toBeNull();
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 4: Balance reconciliation — the accounting identity
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    it('balance reconciliation: startingBalance - buys + sells = currentBalance', async () => {
        // This is the #1 financial integrity check.
        // If this fails, money appeared or disappeared.
        const allTrades = await db
            .select()
            .from(trades)
            .where(eq(trades.challengeId, testChallengeId));

        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, testChallengeId));

        const startingBalance = parseFloat(challenge.startingBalance);
        const currentBalance = parseFloat(challenge.currentBalance);

        // Sum all BUY amounts (money out)
        const totalBuys = allTrades
            .filter(t => t.type === 'BUY')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // Sum all SELL proceeds: shares × exit price
        const totalSellProceeds = allTrades
            .filter(t => t.type === 'SELL')
            .reduce((sum, t) => sum + parseFloat(t.shares) * parseFloat(t.price), 0);

        // THE ACCOUNTING IDENTITY:
        // currentBalance = startingBalance - totalBuys + totalSellProceeds
        const expectedBalance = startingBalance - totalBuys + totalSellProceeds;

        expect(currentBalance).toBeCloseTo(expectedBalance, 1); // Within $0.1
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 5: SELL without position → must throw
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    it('SELL with no position throws PositionNotFoundError', async () => {
        await expect(
            TradeExecutor.executeTrade(
                testUserId,
                testChallengeId,
                'nonexistent-market-xyz',
                'SELL',
                50,
                'YES',
                { shares: 10 }
            )
        ).rejects.toThrow('not found');
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 6: BUY exceeding balance → must throw
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    it('BUY exceeding balance throws InsufficientFundsError', async () => {
        await expect(
            TradeExecutor.executeTrade(
                testUserId,
                testChallengeId,
                TEST_MARKET_ID,
                'BUY',
                999_999,  // Way more than $10,000 balance
                'YES'
            )
        ).rejects.toThrow('Insufficient funds');
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 7: BUY on near-resolved market → must throw
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    it('BUY on near-resolved market (≥95¢) throws MARKET_RESOLVED', async () => {
        // Override the canonical price mock for this test only
        const { MarketService } = await import('@/lib/market');
        vi.mocked(MarketService.getCanonicalPrice).mockResolvedValueOnce(0.97);

        await expect(
            TradeExecutor.executeTrade(
                testUserId,
                testChallengeId,
                TEST_MARKET_ID,
                'BUY',
                50,
                'YES'
            )
        ).rejects.toThrow('nearly resolved');
    });
});

