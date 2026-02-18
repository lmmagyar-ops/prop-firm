/**
 * API Route Integration Tests: Settlement Cron
 * 
 * Tests the GET /api/cron/settlement route handler.
 * Real: DB, BalanceManager, settlement transaction logic
 * Mocked: PolymarketOracle, logger, CRON_SECRET
 * 
 * Key bugs this catches:
 * - NO direction settlement math (L73-93 in settlement.ts)
 * - Balance not credited after settlement
 * - Position not closed
 * - SELL trade audit record not created
 * - Missing CRON_SECRET → 401
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/db';
import { users, challenges, positions, trades } from '@/db/schema';
import { eq, like } from 'drizzle-orm';

// ─── MOCKS ─────────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    }),
}));

// Mock the oracle to return resolved markets
const mockResolutions = new Map<string, { isResolved: boolean; winningOutcome: string; resolutionPrice?: number }>();

vi.mock('@/lib/polymarket-oracle', () => ({
    PolymarketOracle: {
        batchGetResolutionStatus: vi.fn().mockImplementation(async () => mockResolutions),
    },
}));

vi.mock('@/lib/alerts', () => ({
    alerts: {
        tradeFailed: vi.fn(), tradeExecuted: vi.fn(), riskAlert: vi.fn(),
        sendSlackAlert: vi.fn(), challengeFailed: vi.fn(),
    },
}));

// ─── IMPORT ROUTE HANDLER ──────────────────────────────────
import { GET as settlementGet } from '@/app/api/cron/settlement/route';

// ─── HELPERS ───────────────────────────────────────────────
function makeSettlementRequest(cronSecret?: string): Request {
    const headers: Record<string, string> = {};
    if (cronSecret) {
        headers['authorization'] = `Bearer ${cronSecret}`;
    }
    return new Request('http://localhost:3000/api/cron/settlement', {
        method: 'GET',
        headers,
    }) as any;
}

const TEST_EMAIL = 'settlement-test@test.local';
const CRON_SECRET = 'test-cron-secret';

// ─── FIXTURE ───────────────────────────────────────────────
const fixture = {
    userId: '',
    challengeId: '',
    yesPositionId: '',
    noPositionId: '',
};

describe('API Routes: Settlement Cron', () => {
    beforeAll(async () => {
        // Set CRON_SECRET for auth check
        process.env.CRON_SECRET = CRON_SECRET;

        // Clean stale data
        const staleUsers = await db.select({ id: users.id }).from(users)
            .where(like(users.email, 'settlement-test@%'));
        for (const u of staleUsers) {
            const userChallenges = await db.select({ id: challenges.id }).from(challenges)
                .where(eq(challenges.userId, u.id));
            for (const c of userChallenges) {
                await db.delete(trades).where(eq(trades.challengeId, c.id));
                await db.delete(positions).where(eq(positions.challengeId, c.id));
            }
            await db.delete(challenges).where(eq(challenges.userId, u.id));
            await db.delete(users).where(eq(users.id, u.id));
        }

        // Create test user
        const [user] = await db.insert(users).values({
            email: TEST_EMAIL,
            name: 'Settlement Test',
            passwordHash: 'test-hash',
            isActive: true,
        }).returning();
        fixture.userId = user.id;

        // Create active challenge with known balance
        const [challenge] = await db.insert(challenges).values({
            userId: user.id,
            phase: 'challenge',
            status: 'active',
            startingBalance: '10000.00',
            currentBalance: '9000.00', // Spent $1000 on positions
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

        // Create a YES position (bought YES at 0.40, 25 shares = $10 cost)
        const [yesPos] = await db.insert(positions).values({
            challengeId: challenge.id,
            marketId: 'settlement-yes-market',
            direction: 'YES',
            entryPrice: '0.40',
            currentPrice: '0.40',
            shares: '25',
            sizeAmount: '10.00',
            status: 'OPEN',
        }).returning();
        fixture.yesPositionId = yesPos.id;

        // Create a NO position (bought NO at 0.35, 20 shares = $7 cost)
        const [noPos] = await db.insert(positions).values({
            challengeId: challenge.id,
            marketId: 'settlement-no-market',
            direction: 'NO',
            entryPrice: '0.35',
            currentPrice: '0.35',
            shares: '20',
            sizeAmount: '7.00',
            status: 'OPEN',
        }).returning();
        fixture.noPositionId = noPos.id;
    });

    afterAll(async () => {
        await db.delete(trades).where(eq(trades.challengeId, fixture.challengeId));
        await db.delete(positions).where(eq(positions.challengeId, fixture.challengeId));
        await db.delete(challenges).where(eq(challenges.id, fixture.challengeId));
        await db.delete(users).where(eq(users.id, fixture.userId));
        delete process.env.CRON_SECRET;
    });

    it('rejects requests without valid CRON_SECRET', async () => {
        const response = await settlementGet(makeSettlementRequest('wrong-secret') as any);
        expect(response.status).toBe(401);
    });

    it('settles YES position when YES wins — credits full proceeds', async () => {
        // Set up oracle: YES won with resolution price 1
        mockResolutions.clear();
        mockResolutions.set('settlement-yes-market', {
            isResolved: true,
            winningOutcome: 'Yes',
            resolutionPrice: 1,
        });

        // Record balance before
        const before = await db.query.challenges.findFirst({
            where: eq(challenges.id, fixture.challengeId),
        });
        const balanceBefore = parseFloat(before!.currentBalance);

        const response = await settlementGet(makeSettlementRequest(CRON_SECRET) as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.positionsSettled).toBeGreaterThanOrEqual(1);

        // Verify position was closed
        const closedPos = await db.query.positions.findFirst({
            where: eq(positions.id, fixture.yesPositionId),
        });
        expect(closedPos!.status).toBe('CLOSED');

        // YES won: settlement price = 1, entry was 0.40
        // proceeds = 25 shares * 1.00 = $25
        // pnl = 25 * (1.00 - 0.40) = $15
        const proceeds = 25 * 1.0;
        expect(parseFloat(closedPos!.pnl!)).toBeCloseTo(15, 1);

        // Verify balance was credited
        const after = await db.query.challenges.findFirst({
            where: eq(challenges.id, fixture.challengeId),
        });
        const balanceAfter = parseFloat(after!.currentBalance);
        expect(balanceAfter).toBeCloseTo(balanceBefore + proceeds, 1);

        // Verify SELL trade audit record was created
        const sellTrade = await db.query.trades.findFirst({
            where: eq(trades.positionId, fixture.yesPositionId),
        });
        expect(sellTrade).toBeDefined();
        expect(sellTrade!.type).toBe('SELL');
        expect(sellTrade!.closureReason).toBe('market_settlement');
    });

    it('settles NO position when NO wins — credits correct proceeds', async () => {
        // Set up oracle: YES lost (NO won) with resolution price 0
        mockResolutions.clear();
        mockResolutions.set('settlement-no-market', {
            isResolved: true,
            winningOutcome: 'No',
            resolutionPrice: 0,
        });

        // Record balance before
        const before = await db.query.challenges.findFirst({
            where: eq(challenges.id, fixture.challengeId),
        });
        const balanceBefore = parseFloat(before!.currentBalance);

        const response = await settlementGet(makeSettlementRequest(CRON_SECRET) as any);
        expect(response.status).toBe(200);

        // Verify NO position was closed
        const closedPos = await db.query.positions.findFirst({
            where: eq(positions.id, fixture.noPositionId),
        });
        expect(closedPos!.status).toBe('CLOSED');

        // NO won: settlement price for NO = 1 - 0 = 1, entry was 0.35
        // proceeds = 20 shares * 1.00 = $20
        // pnl = 20 * (1.00 - 0.35) = $13
        const proceeds = 20 * 1.0;
        expect(parseFloat(closedPos!.pnl!)).toBeCloseTo(13, 1);

        // Verify balance was credited
        const after = await db.query.challenges.findFirst({
            where: eq(challenges.id, fixture.challengeId),
        });
        const balanceAfter = parseFloat(after!.currentBalance);
        expect(balanceAfter).toBeCloseTo(balanceBefore + proceeds, 1);
    });

    it('returns empty result when no open positions exist', async () => {
        // Both positions are now CLOSED from previous tests
        mockResolutions.clear();

        const response = await settlementGet(makeSettlementRequest(CRON_SECRET) as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.positionsSettled).toBe(0);
    });
});
