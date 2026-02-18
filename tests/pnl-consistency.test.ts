/**
 * PnL Consistency Behavioral Tests
 *
 * These tests verify that every PnL calculation path in the system
 * produces identical results for the same inputs. This is the class
 * of bug where 7 inline copies of direction-adjustment diverge.
 *
 * Strategy: Create a real position in the DB, then run every calculation
 * path (positions API, evaluator, risk-monitor's equity, getPortfolioValue)
 * and assert they all agree.
 *
 * Runs against the REAL database. Only external boundaries are mocked.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// ─── Mock EXTERNAL boundaries ONLY ────────────────────────────────
vi.mock('@/lib/market', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/market')>();
    return {
        ...actual,
        MarketService: {
            ...actual.MarketService,
            getCanonicalPrice: vi.fn().mockResolvedValue(0.40),
            getBatchTitles: vi.fn().mockResolvedValue(new Map([
                ['pnl-consistency-market', 'PnL Consistency Test Market'],
            ])),
            getBatchOrderBookPrices: vi.fn().mockResolvedValue(new Map([
                ['pnl-consistency-market', { price: '0.55', source: 'test' }],
            ])),
            buildSyntheticOrderBookPublic: actual.MarketService.buildSyntheticOrderBookPublic,
            calculateImpact: actual.MarketService.calculateImpact,
        },
    };
});

vi.mock('@/app/actions/market', () => ({
    getMarketById: vi.fn().mockResolvedValue({
        id: 'pnl-consistency-market',
        question: 'PnL consistency test?',
        categories: ['test'],
        volume: 50_000_000,
        volume24hr: 1_000_000,
        active: true,
    }),
    getAllMarketsFlat: vi.fn().mockResolvedValue([]),
    getActiveMarkets: vi.fn().mockResolvedValue([]),
    getEventInfoForMarket: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/outage-manager', () => ({
    OutageManager: {
        getOutageStatus: vi.fn().mockResolvedValue({ isOutage: false, isGraceWindow: false }),
    },
}));

vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

vi.mock('@/lib/alerts', () => ({
    alerts: { tradeFailed: vi.fn(), anomaly: vi.fn() },
}));

// ─── Import AFTER mocks ────────────────────────────────────────────
import { db } from '@/db';
import { users, challenges, positions, trades } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { TradeExecutor } from '@/lib/trade';
import { ChallengeEvaluator } from '@/lib/evaluator';
import {
    calculatePositionMetrics,
    getDirectionAdjustedPrice,
    getPortfolioValue,
} from '@/lib/position-utils';

// ─── Constants ──────────────────────────────────────────────────────
const TEST_EMAIL_PREFIX = '__pnl_consistency_test_';
const TEST_MARKET_ID = 'pnl-consistency-market';
const STARTING_BALANCE = 10_000;
const TRADE_AMOUNT = 100; // $100

// Live YES price returned by mock (must match mock above)
const LIVE_YES_PRICE = 0.55;
// Entry price returned by mock (must match getCanonicalPrice mock)
const ENTRY_YES_PRICE = 0.40;

// ─── Test State ─────────────────────────────────────────────────────
interface TestFixture {
    userId: string;
    challengeId: string;
    email: string;
}

let yesFixture: TestFixture;
let noFixture: TestFixture;

// ─── Helpers ────────────────────────────────────────────────────────
async function createFixture(direction: 'YES' | 'NO'): Promise<TestFixture> {
    const email = `${TEST_EMAIL_PREFIX}${direction.toLowerCase()}_${Date.now()}@test.local`;

    const [user] = await db.insert(users).values({
        email,
        name: `PnL Test ${direction}`,
    }).returning();

    const [challenge] = await db.insert(challenges).values({
        userId: user.id,
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

    return { userId: user.id, challengeId: challenge.id, email };
}

async function cleanupFixture(fixture: TestFixture | undefined): Promise<void> {
    if (!fixture) return;
    if (fixture.challengeId) {
        await db.delete(trades).where(eq(trades.challengeId, fixture.challengeId));
        await db.delete(positions).where(eq(positions.challengeId, fixture.challengeId));
        await db.delete(challenges).where(eq(challenges.id, fixture.challengeId));
    }
    if (fixture.userId) {
        await db.delete(users).where(eq(users.id, fixture.userId));
    }
}

async function cleanupStaleData(): Promise<void> {
    const staleUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(like(users.email, `${TEST_EMAIL_PREFIX}%`));

    for (const user of staleUsers) {
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
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUITE 1: YES direction — all PnL paths must agree
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('PnL Consistency: YES direction', () => {
    beforeAll(async () => {
        await cleanupStaleData();
        yesFixture = await createFixture('YES');

        // BUY a YES position
        await TradeExecutor.executeTrade(
            yesFixture.userId,
            yesFixture.challengeId,
            TEST_MARKET_ID,
            'BUY',
            TRADE_AMOUNT,
            'YES'
        );
    });

    afterAll(async () => {
        await cleanupFixture(yesFixture);
        await cleanupStaleData();
    });

    it('calculatePositionMetrics and getPortfolioValue agree on unrealized PnL', async () => {
        const [pos] = await db.select().from(positions).where(
            and(
                eq(positions.challengeId, yesFixture.challengeId),
                eq(positions.status, 'OPEN')
            )
        );

        const shares = parseFloat(pos.shares);
        const entryPrice = parseFloat(pos.entryPrice);

        // Path 1: calculatePositionMetrics (the canonical function)
        const metrics = calculatePositionMetrics(shares, entryPrice, LIVE_YES_PRICE, 'YES');

        // Path 2: getPortfolioValue (used by dashboard-service)
        const portfolio = getPortfolioValue(
            [pos],
            new Map([[TEST_MARKET_ID, { price: LIVE_YES_PRICE.toString() }]])
        );

        // They MUST agree
        expect(portfolio.positions).toHaveLength(1);
        expect(portfolio.positions[0].unrealizedPnL).toBeCloseTo(metrics.unrealizedPnL, 4);
        expect(portfolio.positions[0].positionValue).toBeCloseTo(metrics.positionValue, 4);
        expect(portfolio.positions[0].effectivePrice).toBeCloseTo(metrics.effectiveCurrentPrice, 4);
    });

    it('evaluator equity matches cash + calculatePositionMetrics value', async () => {
        const [pos] = await db.select().from(positions).where(
            and(
                eq(positions.challengeId, yesFixture.challengeId),
                eq(positions.status, 'OPEN')
            )
        );

        const [challenge] = await db.select().from(challenges).where(
            eq(challenges.id, yesFixture.challengeId)
        );

        const shares = parseFloat(pos.shares);
        const entryPrice = parseFloat(pos.entryPrice);
        const cashBalance = parseFloat(challenge.currentBalance);

        // Path 1: Direct calculation
        const metrics = calculatePositionMetrics(shares, entryPrice, LIVE_YES_PRICE, 'YES');
        const expectedEquity = cashBalance + metrics.positionValue;

        // Path 2: Evaluator (runs the full evaluate() path)
        const evalResult = await ChallengeEvaluator.evaluate(yesFixture.challengeId);

        // They MUST agree
        expect(evalResult.equity).toBeDefined();
        expect(evalResult.equity!).toBeCloseTo(expectedEquity, 1);
    });

    it('YES direction: effectivePrice equals raw price (no adjustment)', () => {
        const adjusted = getDirectionAdjustedPrice(0.55, 'YES');
        expect(adjusted).toBe(0.55);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUITE 2: NO direction — the historical source of bugs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('PnL Consistency: NO direction', () => {
    beforeAll(async () => {
        noFixture = await createFixture('NO');

        // BUY a NO position
        await TradeExecutor.executeTrade(
            noFixture.userId,
            noFixture.challengeId,
            TEST_MARKET_ID,
            'BUY',
            TRADE_AMOUNT,
            'NO'
        );
    });

    afterAll(async () => {
        await cleanupFixture(noFixture);
        await cleanupStaleData();
    });

    it('NO direction: effectivePrice equals 1 - rawPrice', () => {
        const adjusted = getDirectionAdjustedPrice(0.55, 'NO');
        expect(adjusted).toBeCloseTo(0.45, 10);
    });

    it('calculatePositionMetrics and getPortfolioValue agree for NO positions', async () => {
        const [pos] = await db.select().from(positions).where(
            and(
                eq(positions.challengeId, noFixture.challengeId),
                eq(positions.status, 'OPEN')
            )
        );

        const shares = parseFloat(pos.shares);
        const entryPrice = parseFloat(pos.entryPrice);

        // Path 1: calculatePositionMetrics
        const metrics = calculatePositionMetrics(shares, entryPrice, LIVE_YES_PRICE, 'NO');

        // Path 2: getPortfolioValue
        const portfolio = getPortfolioValue(
            [pos],
            new Map([[TEST_MARKET_ID, { price: LIVE_YES_PRICE.toString() }]])
        );

        // They MUST agree — this is the exact bug that existed before consolidation
        expect(portfolio.positions).toHaveLength(1);
        expect(portfolio.positions[0].unrealizedPnL).toBeCloseTo(metrics.unrealizedPnL, 4);
        expect(portfolio.positions[0].positionValue).toBeCloseTo(metrics.positionValue, 4);
    });

    it('evaluator equity matches cash + calculatePositionMetrics for NO positions', async () => {
        const [pos] = await db.select().from(positions).where(
            and(
                eq(positions.challengeId, noFixture.challengeId),
                eq(positions.status, 'OPEN')
            )
        );

        const [challenge] = await db.select().from(challenges).where(
            eq(challenges.id, noFixture.challengeId)
        );

        const shares = parseFloat(pos.shares);
        const entryPrice = parseFloat(pos.entryPrice);
        const cashBalance = parseFloat(challenge.currentBalance);

        // Path 1: Direct calculation
        const metrics = calculatePositionMetrics(shares, entryPrice, LIVE_YES_PRICE, 'NO');
        const expectedEquity = cashBalance + metrics.positionValue;

        // Path 2: Evaluator
        const evalResult = await ChallengeEvaluator.evaluate(noFixture.challengeId);

        expect(evalResult.equity).toBeDefined();
        expect(evalResult.equity!).toBeCloseTo(expectedEquity, 1);
    });

    it('NO position entry price is stored as (1 - yesPrice) in DB', async () => {
        // This verifies the DB convention: entry price for NO positions
        // is ALREADY direction-adjusted. If this changes, everything breaks.
        const [pos] = await db.select().from(positions).where(
            and(
                eq(positions.challengeId, noFixture.challengeId),
                eq(positions.status, 'OPEN')
            )
        );

        const entryPrice = parseFloat(pos.entryPrice);

        // For a NO position at YES price 0.40, entry should be stored as 0.60
        expect(entryPrice).toBeCloseTo(1 - ENTRY_YES_PRICE, 2);
    });
});
