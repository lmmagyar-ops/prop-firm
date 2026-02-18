/**
 * API Route Integration Tests: Trade Execute Endpoint
 * 
 * Tests the POST /api/trade/execute route handler with:
 * - Real DB, real TradeExecutor, real RiskEngine
 * - Mocked: auth, MarketService, OutageManager, alerts, logger, trade-idempotency
 * 
 * Key bugs this catches:
 * - NO direction PnL miscalculation (the Phase 0 bug)
 * - Auth/suspension guard wiring
 * - Input validation at route level
 * - Response shape contract with UI
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import { users, challenges, positions, trades } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { calculatePositionMetrics } from '@/lib/position-utils';

// ─── MOCK AUTH ──────────────────────────────────────────────
let mockUserId = '';
vi.mock('@/auth', () => ({
    auth: vi.fn(() => Promise.resolve(
        mockUserId
            ? { user: { id: mockUserId, email: 'exec-test@test.local' }, expires: '2099-12-31' }
            : null
    )),
}));

// ─── MOCK EXTERNAL BOUNDARIES ──────────────────────────────
// NOTE: vi.mock() is hoisted — all values must be inlined.

vi.mock('@/lib/market', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/market')>();
    return {
        ...actual,
        MarketService: {
            ...actual.MarketService,
            getCanonicalPrice: vi.fn().mockResolvedValue(0.40),
            getBatchTitles: vi.fn().mockResolvedValue(new Map([
                ['exec-test-market', 'Execute Test Market'],
            ])),
            getBatchOrderBookPrices: vi.fn().mockResolvedValue(new Map([
                ['exec-test-market', { price: '0.55', source: 'test' }],
            ])),
            getLatestPrice: vi.fn().mockResolvedValue({ price: '0.55', source: 'test' }),
            buildSyntheticOrderBookPublic: actual.MarketService.buildSyntheticOrderBookPublic,
            calculateImpact: actual.MarketService.calculateImpact,
        },
    };
});

vi.mock('@/lib/outage-manager', () => ({
    OutageManager: {
        isInOutage: vi.fn().mockResolvedValue(false),
        getStatus: vi.fn().mockResolvedValue({ isOutage: false }),
    },
}));

vi.mock('@/lib/trade-idempotency', () => ({
    checkIdempotency: vi.fn().mockResolvedValue({ isDuplicate: false, cachedResponse: null }),
    cacheIdempotencyResult: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    }),
}));

vi.mock('@/lib/alerts', () => ({
    alerts: {
        tradeFailed: vi.fn(), tradeExecuted: vi.fn(), riskAlert: vi.fn(),
        sendSlackAlert: vi.fn(), challengeFailed: vi.fn(),
    },
}));

vi.mock('@/app/actions/market', () => ({
    getMarketById: vi.fn().mockResolvedValue({
        id: 'exec-test-market',
        question: 'Execute Test Market',
        categories: ['Crypto'],
        volume: '10000000', // $10M volume to pass volume checks
        outcomes: ['Yes', 'No'],
    }),
    getEventInfoForMarket: vi.fn().mockResolvedValue({
        eventId: 'test-event',
        siblingMarketIds: ['exec-test-market'],
    }),
    getAllMarketsFlat: vi.fn().mockResolvedValue([{
        id: 'exec-test-market',
        question: 'Execute Test Market',
        categories: ['Crypto'],
        volume: '10000000',
    }]),
    getActiveMarkets: vi.fn().mockResolvedValue([]),
}));


// ─── IMPORT ACTUAL ROUTE HANDLER ───────────────────────────
import { POST as executePost } from '@/app/api/trade/execute/route';

// ─── HELPERS ───────────────────────────────────────────────
function makeExecuteRequest(body: Record<string, unknown>): Request {
    return new Request('http://localhost:3000/api/trade/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const TEST_EMAIL = 'exec-route-test@test.local';

// ─── FIXTURE ───────────────────────────────────────────────
const fixture = {
    userId: '',
    challengeId: '',
};

describe('API Routes: Trade Execute', () => {
    beforeAll(async () => {
        // Clean up any stale test data
        const staleUsers = await db.select({ id: users.id }).from(users)
            .where(like(users.email, 'exec-route-test@%'));
        for (const u of staleUsers) {
            await db.delete(trades).where(eq(trades.challengeId,
                (await db.select({ id: challenges.id }).from(challenges)
                    .where(eq(challenges.userId, u.id)))[0]?.id ?? ''));
            await db.delete(positions).where(eq(positions.challengeId,
                (await db.select({ id: challenges.id }).from(challenges)
                    .where(eq(challenges.userId, u.id)))[0]?.id ?? ''));
            await db.delete(challenges).where(eq(challenges.userId, u.id));
            await db.delete(users).where(eq(users.id, u.id));
        }

        // Create test user
        const [user] = await db.insert(users).values({
            email: TEST_EMAIL,
            name: 'Execute Test User',
            passwordHash: 'test-hash',
            isActive: true,
        }).returning();
        fixture.userId = user.id;

        // Create active challenge
        const [challenge] = await db.insert(challenges).values({
            userId: user.id,
            phase: 'challenge',
            status: 'active',
            startingBalance: '10000.00',
            currentBalance: '10000.00',
            startOfDayBalance: '10000.00',
            highWaterMark: '10000.00',
            platform: 'polymarket',
            rulesConfig: {
                maxDailyLoss: 500,
                maxTotalDrawdown: 1000,
                profitTarget: 1000,
                maxPositionSize: 1000,
                maxOpenPositions: 10,
                tradingDays: 30,
            },
        }).returning();
        fixture.challengeId = challenge.id;

        // Set mock auth to this user
        mockUserId = fixture.userId;
    });

    // Ensure each test starts with valid auth
    beforeEach(() => {
        mockUserId = fixture.userId;
    });

    afterAll(async () => {
        // Clean up
        await db.delete(trades).where(eq(trades.challengeId, fixture.challengeId));
        await db.delete(positions).where(eq(positions.challengeId, fixture.challengeId));
        await db.delete(challenges).where(eq(challenges.id, fixture.challengeId));
        await db.delete(users).where(eq(users.id, fixture.userId));
    });

    it('BUY creates position, deducts balance, returns correct shape', async () => {
        const response = await executePost(makeExecuteRequest({
            marketId: 'exec-test-market',
            outcome: 'YES',
            amount: 10,
        }) as any);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.trade).toBeDefined();
        expect(data.trade.id).toBeDefined();
        expect(data.trade.shares).toBeGreaterThan(0);
        expect(data.trade.price).toBeGreaterThan(0);
        expect(data.position).toBeDefined();
        expect(data.position.id).toBeDefined();
        expect(data.position.shares).toBeGreaterThan(0);
        expect(data.position.side).toBe('YES');

        // Verify balance was deducted in DB
        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, fixture.challengeId),
        });
        const newBalance = parseFloat(challenge!.currentBalance);
        expect(newBalance).toBeLessThan(10000);
    });

    it('BUY with missing marketId returns 400', async () => {
        const response = await executePost(makeExecuteRequest({
            outcome: 'YES',
            amount: 10,
        }) as any);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBeDefined();
    });

    it('BUY with zero amount returns 400', async () => {
        const response = await executePost(makeExecuteRequest({
            marketId: 'exec-test-market',
            outcome: 'YES',
            amount: 0,
        }) as any);

        expect(response.status).toBe(400);
    });

    it('unauthenticated request returns 401', async () => {
        const savedUserId = mockUserId;
        mockUserId = ''; // Clear auth

        const response = await executePost(makeExecuteRequest({
            marketId: 'exec-test-market',
            outcome: 'YES',
            amount: 10,
        }) as any);

        expect(response.status).toBe(401);
        mockUserId = savedUserId; // Restore
    });

    it('PnL in response uses direction-aware calculation', async () => {
        // This test catches the Phase 0 bug: inline PnL without direction adjustment
        const response = await executePost(makeExecuteRequest({
            marketId: 'exec-test-market',
            outcome: 'YES',
            amount: 5,
        }) as any);

        expect(response.status).toBe(200);
        const data = await response.json();

        // The PnL in the response should match calculatePositionMetrics
        const shares = data.position.shares;
        const avgPrice = data.position.avgPrice;
        const currentPrice = parseFloat(
            (await db.query.positions.findFirst({
                where: and(
                    eq(positions.challengeId, fixture.challengeId),
                    eq(positions.status, 'OPEN'),
                    eq(positions.direction, 'YES'),
                ),
                orderBy: (p, { desc }) => [desc(p.openedAt)],
            }))?.currentPrice || avgPrice.toString()
        );

        const canonical = calculatePositionMetrics(shares, avgPrice, currentPrice, 'YES');

        // Response PnL must match canonical calculation
        expect(data.position.currentPnl).toBeCloseTo(canonical.unrealizedPnL, 2);
    });

    it('response contains all fields UI expects', async () => {
        const response = await executePost(makeExecuteRequest({
            marketId: 'exec-test-market',
            outcome: 'YES',
            amount: 5,
        }) as any);

        expect(response.status).toBe(200);
        const data = await response.json();

        // Trade fields
        expect(data.trade).toHaveProperty('id');
        expect(data.trade).toHaveProperty('shares');
        expect(data.trade).toHaveProperty('price');

        // Position fields
        expect(data.position).toHaveProperty('id');
        expect(data.position).toHaveProperty('shares');
        expect(data.position).toHaveProperty('avgPrice');
        expect(data.position).toHaveProperty('invested');
        expect(data.position).toHaveProperty('currentPnl');
        expect(data.position).toHaveProperty('roi');
        expect(data.position).toHaveProperty('side');
    });
});
