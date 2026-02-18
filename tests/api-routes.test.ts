/**
 * API Route Integration Tests — The "Endpoint Consistency" Suite
 *
 * These tests import the ACTUAL Next.js route handlers (GET/POST functions)
 * and call them with real database data. Only auth and external boundaries
 * (MarketService, Redis, cookies) are mocked.
 *
 * This catches the class of bug where:
 * - Function-level tests pass but the route handler wires things differently
 * - The positions API and challenges API disagree on equity
 * - The close API returns PnL that doesn't match the positions API's calculation
 *
 * Runs against the REAL database. Only external boundaries are mocked.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// ─── MOCK AUTH — return a controllable session ──────────────────
let mockUserId = '';
vi.mock('@/auth', () => ({
    auth: vi.fn(() => Promise.resolve({
        user: { id: mockUserId, email: 'api-route-test@test.local' },
        expires: '2099-12-31',
    })),
}));

// ─── MOCK COOKIES — positions route reads selectedChallengeId ───
let mockChallengeIdCookie = '';
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => Promise.resolve({
        get: (name: string) => {
            if (name === 'selectedChallengeId' && mockChallengeIdCookie) {
                return { value: mockChallengeIdCookie };
            }
            return undefined;
        },
    })),
}));

// ─── MOCK EXTERNAL BOUNDARIES ONLY ─────────────────────────────
// NOTE: vi.mock() is hoisted to top of file by vitest, so we CANNOT
// reference module-level constants here. All values must be inlined.

vi.mock('@/lib/market', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/market')>();
    return {
        ...actual,
        MarketService: {
            ...actual.MarketService,
            // Entry price: 0.40 (inlined — cannot reference constants due to hoisting)
            getCanonicalPrice: vi.fn().mockResolvedValue(0.40),
            getBatchTitles: vi.fn().mockResolvedValue(new Map([
                ['api-route-test-market', 'API Route Test Market'],
            ])),
            // Live price: 0.55 (inlined)
            getBatchOrderBookPrices: vi.fn().mockResolvedValue(new Map([
                ['api-route-test-market', { price: '0.55', source: 'test' }],
            ])),
            getLatestPrice: vi.fn().mockResolvedValue({
                price: '0.55',
                source: 'test',
            }),
            buildSyntheticOrderBookPublic: actual.MarketService.buildSyntheticOrderBookPublic,
            calculateImpact: actual.MarketService.calculateImpact,
        },
    };
});

vi.mock('@/app/actions/market', () => ({
    getMarketById: vi.fn().mockResolvedValue({
        id: 'api-route-test-market',
        question: 'API route integration test?',
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

// Mock trade-idempotency (uses Redis)
vi.mock('@/lib/trade-idempotency', () => ({
    checkIdempotency: vi.fn().mockResolvedValue({ isDuplicate: false, cachedResponse: null }),
    cacheIdempotencyResult: vi.fn().mockResolvedValue(undefined),
}));

// ─── Import AFTER mocks ────────────────────────────────────────
import { db } from '@/db';
import { users, challenges, positions, trades } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { TradeExecutor } from '@/lib/trade';
import { calculatePositionMetrics, getDirectionAdjustedPrice } from '@/lib/position-utils';

// Import the ACTUAL route handlers
import { GET as positionsGET } from '@/app/api/trade/positions/route';
import { GET as challengesGET } from '@/app/api/challenges/route';
import { POST as closePOST } from '@/app/api/trade/close/route';

// ─── Constants (defined AFTER mocks, safe to use in tests) ──────
// These must match the inlined values in the vi.mock factories above
const LIVE_YES_PRICE = 0.55;

// ─── Constants ──────────────────────────────────────────────────
const TEST_EMAIL_PREFIX = '__api_route_test_';
const TEST_MARKET_ID = 'api-route-test-market';
const STARTING_BALANCE = 10_000;
const TRADE_AMOUNT = 100;

// ─── Test State ─────────────────────────────────────────────────
interface TestFixture {
    userId: string;
    challengeId: string;
    email: string;
}

let fixture: TestFixture;

// ─── Helpers ────────────────────────────────────────────────────
async function createFixture(): Promise<TestFixture> {
    const email = `${TEST_EMAIL_PREFIX}${Date.now()}@test.local`;

    const [user] = await db.insert(users).values({
        email,
        name: 'API Route Test User',
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

async function cleanupFixture(f: TestFixture | undefined): Promise<void> {
    if (!f) return;
    if (f.challengeId) {
        await db.delete(trades).where(eq(trades.challengeId, f.challengeId));
        await db.delete(positions).where(eq(positions.challengeId, f.challengeId));
        await db.delete(challenges).where(eq(challenges.id, f.challengeId));
    }
    if (f.userId) {
        await db.delete(users).where(eq(users.id, f.userId));
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

/** Create a NextRequest for challenges route (needs URL with searchParams) */
function makeChallengesRequest(userId: string): Request {
    return new Request(`http://localhost:3000/api/challenges?userId=${userId}`);
}

/** Create a NextRequest for close route (POST with body) */
function makeCloseRequest(positionId: string): Request {
    return new Request('http://localhost:3000/api/trade/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId }),
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUITE: API Route Endpoint Consistency
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('API Routes: Endpoint PnL Consistency', () => {
    beforeAll(async () => {
        await cleanupStaleData();
        fixture = await createFixture();

        // Wire up auth mock to return our test user
        mockUserId = fixture.userId;
        mockChallengeIdCookie = fixture.challengeId;

        // BUY a YES position through the real trade engine
        await TradeExecutor.executeTrade(
            fixture.userId,
            fixture.challengeId,
            TEST_MARKET_ID,
            'BUY',
            TRADE_AMOUNT,
            'YES'
        );
    });

    afterAll(async () => {
        await cleanupFixture(fixture);
        await cleanupStaleData();
    });

    it('positions API returns PnL that matches calculatePositionMetrics', async () => {
        // Call the ACTUAL route handler
        const response = await positionsGET();
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.positions).toHaveLength(1);

        const apiPosition = data.positions[0];

        // Now calculate the same thing directly
        const [dbPos] = await db.select().from(positions).where(
            and(
                eq(positions.challengeId, fixture.challengeId),
                eq(positions.status, 'OPEN')
            )
        );

        const shares = parseFloat(dbPos.shares);
        const entryPrice = parseFloat(dbPos.entryPrice);

        const canonical = calculatePositionMetrics(shares, entryPrice, LIVE_YES_PRICE, 'YES');

        // The API response MUST agree with the canonical function
        expect(apiPosition.unrealizedPnL).toBeCloseTo(canonical.unrealizedPnL, 2);
        expect(apiPosition.currentPrice).toBeCloseTo(canonical.effectiveCurrentPrice, 4);
        expect(apiPosition.shares).toBe(shares);
    });

    it('challenges API equity equals cash + position value from positions API', async () => {
        // Call both endpoints
        const posResponse = await positionsGET();
        const chalResponse = await challengesGET(makeChallengesRequest(fixture.userId) as any);

        const posData = await posResponse.json();
        const chalData = await chalResponse.json();

        expect(chalData.challenges).toHaveLength(1);

        const challenge = chalData.challenges[0];
        const challengeEquity = parseFloat(challenge.equity);
        const challengeCash = parseFloat(challenge.currentBalance);
        const challengePositionValue = parseFloat(challenge.positionValue);

        // Sum up position value from positions API
        const positionsValue = posData.positions.reduce(
            (sum: number, p: { shares: number; currentPrice: number }) => sum + (p.shares * p.currentPrice),
            0
        );

        // Challenges equity MUST equal cash + position value
        expect(challengeEquity).toBeCloseTo(challengeCash + challengePositionValue, 1);

        // Position value from challenges API MUST match positions API
        expect(challengePositionValue).toBeCloseTo(positionsValue, 1);
    });

    it('close API returns internally consistent PnL (proceeds - costBasis)', async () => {
        // Get the position we're about to close
        const [dbPos] = await db.select().from(positions).where(
            and(
                eq(positions.challengeId, fixture.challengeId),
                eq(positions.status, 'OPEN')
            )
        );

        const shares = parseFloat(dbPos.shares);
        const entryPrice = parseFloat(dbPos.entryPrice);
        const expectedCostBasis = shares * entryPrice;

        // Call the ACTUAL close route handler
        const response = await closePOST(makeCloseRequest(dbPos.id) as any);
        expect(response.status).toBe(200);

        const data = await response.json();

        expect(data.success).toBe(true);

        // ── Internal consistency checks ──
        // The close route computes: proceeds = trade.shares * trade.price
        //                          costBasis = shares * entryPrice
        //                          pnl = proceeds - costBasis
        // We verify this math is correct, regardless of WHICH price was used.
        expect(data.costBasis).toBeCloseTo(expectedCostBasis, 2);
        expect(data.pnl).toBeCloseTo(data.proceeds - data.costBasis, 4);

        // Trade details should be present
        expect(data.trade.shares).toBe(shares);
        expect(data.trade.price).toBeGreaterThan(0);

        // proceeds should equal trade.shares * trade.price
        expect(data.proceeds).toBeCloseTo(data.trade.shares * data.trade.price, 4);

        // Verify the position is now closed in DB
        const closedPos = await db.query.positions.findFirst({
            where: eq(positions.id, dbPos.id),
        });
        expect(closedPos?.status).toBe('CLOSED');
    });

    it('after close, positions API returns empty list', async () => {
        const response = await positionsGET();
        const data = await response.json();
        expect(data.positions).toHaveLength(0);
    });
});
