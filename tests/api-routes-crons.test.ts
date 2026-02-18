/**
 * API Route Integration Tests: Operational Crons
 * 
 * Tests: daily-reset, balance-audit, daily-fees
 * Real: DB (challenges, trades, positions)
 * Mocked: CRON_SECRET, logger, runFeeSweep
 * 
 * Key bugs this catches:
 * - Daily reset finalizes wrong challenges
 * - Balance audit doesn't detect balance corruption
 * - Cron endpoints accessible without secret
 * - Idempotent daily reset runs twice
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import { users, challenges, trades, positions } from '@/db/schema';
import { eq, like } from 'drizzle-orm';

// ─── MOCKS ─────────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    }),
}));

vi.mock('@/workers/fees', () => ({
    runFeeSweep: vi.fn().mockResolvedValue(undefined),
}));

// ─── IMPORT ROUTE HANDLERS ─────────────────────────────────
import { GET as dailyResetGet } from '@/app/api/cron/daily-reset/route';
import { GET as balanceAuditGet } from '@/app/api/cron/balance-audit/route';
import { GET as dailyFeesGet } from '@/app/api/cron/daily-fees/route';

// ─── HELPERS ───────────────────────────────────────────────
const CRON_SECRET = 'test-cron-secret-456';

function makeCronRequest(url: string, includeAuth = true): Request {
    const headers: Record<string, string> = {};
    if (includeAuth) {
        headers['authorization'] = `Bearer ${CRON_SECRET}`;
    }
    return new Request(`http://localhost:3000${url}`, {
        method: 'GET',
        headers,
    });
}

const TEST_EMAIL = 'cron-test@test.local';

const fixture = {
    userId: '',
    activeChallengeId: '',
    pendingFailureChallengeId: '',
};

describe('API Routes: Operational Crons', () => {
    beforeAll(async () => {
        process.env.CRON_SECRET = CRON_SECRET;

        // Clean stale data
        const staleUsers = await db.select({ id: users.id }).from(users)
            .where(like(users.email, 'cron-test@%'));
        for (const u of staleUsers) {
            await db.delete(trades).where(eq(trades.challengeId, u.id));
            await db.delete(positions).where(eq(positions.challengeId, u.id));
            await db.delete(challenges).where(eq(challenges.userId, u.id));
            await db.delete(users).where(eq(users.id, u.id));
        }

        // Create test user
        const [user] = await db.insert(users).values({
            email: TEST_EMAIL,
            name: 'Cron Test',
            passwordHash: 'test-hash',
            isActive: true,
        }).returning();
        fixture.userId = user.id;
    });

    beforeEach(async () => {
        // Clean challenges before each test
        const userChallenges = await db.query.challenges.findMany({
            where: eq(challenges.userId, fixture.userId),
        });
        for (const c of userChallenges) {
            await db.delete(trades).where(eq(trades.challengeId, c.id));
            await db.delete(positions).where(eq(positions.challengeId, c.id));
        }
        await db.delete(challenges).where(eq(challenges.userId, fixture.userId));
    });

    afterAll(async () => {
        const userChallenges = await db.query.challenges.findMany({
            where: eq(challenges.userId, fixture.userId),
        });
        for (const c of userChallenges) {
            await db.delete(trades).where(eq(trades.challengeId, c.id));
            await db.delete(positions).where(eq(positions.challengeId, c.id));
        }
        await db.delete(challenges).where(eq(challenges.userId, fixture.userId));
        await db.delete(users).where(eq(users.id, fixture.userId));
        delete process.env.CRON_SECRET;
    });

    // ─── DAILY RESET ───────────────────────────────────────
    describe('GET /cron/daily-reset', () => {
        it('rejects without CRON_SECRET', async () => {
            const response = await dailyResetGet(makeCronRequest('/api/cron/daily-reset', false) as any);
            expect(response.status).toBe(401);
        });

        it('finalizes pending failures → status = failed', async () => {
            // Create active challenge with pendingFailureAt set (simulates daily loss breach)
            const [challenge] = await db.insert(challenges).values({
                userId: fixture.userId,
                phase: 'challenge',
                status: 'active',
                startingBalance: '10000.00',
                currentBalance: '9200.00',
                startOfDayBalance: '10000.00',
                highWaterMark: '10000.00',
                platform: 'polymarket',
                rulesConfig: {},
                pendingFailureAt: new Date(Date.now() - 60_000), // 1 min ago
            }).returning();

            const response = await dailyResetGet(makeCronRequest('/api/cron/daily-reset') as any);
            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.stats.failed).toBe(1);

            // Verify challenge is now failed
            const updated = await db.query.challenges.findFirst({
                where: eq(challenges.id, challenge.id),
            });
            expect(updated!.status).toBe('failed');
            expect(updated!.endsAt).not.toBeNull();
        });

        it('snapshots start-of-day balance for active challenges', async () => {
            // Create active challenge with profit
            const [challenge] = await db.insert(challenges).values({
                userId: fixture.userId,
                phase: 'challenge',
                status: 'active',
                startingBalance: '10000.00',
                currentBalance: '10500.00',
                startOfDayBalance: '10000.00', // Old SOD
                highWaterMark: '10500.00',
                platform: 'polymarket',
                rulesConfig: {},
            }).returning();

            const response = await dailyResetGet(makeCronRequest('/api/cron/daily-reset') as any);
            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data.stats.reset).toBe(1);

            // Verify SOD was updated to current balance
            const updated = await db.query.challenges.findFirst({
                where: eq(challenges.id, challenge.id),
            });
            expect(parseFloat(updated!.startOfDayBalance!)).toBe(10500);
            expect(updated!.lastDailyResetAt).not.toBeNull();
        });

        it('is idempotent — skips already-reset challenges', async () => {
            // Create challenge already reset today
            const [challenge] = await db.insert(challenges).values({
                userId: fixture.userId,
                phase: 'challenge',
                status: 'active',
                startingBalance: '10000.00',
                currentBalance: '10500.00',
                startOfDayBalance: '10500.00',
                highWaterMark: '10500.00',
                platform: 'polymarket',
                rulesConfig: {},
                lastDailyResetAt: new Date(), // Already reset today
            }).returning();

            const response = await dailyResetGet(makeCronRequest('/api/cron/daily-reset') as any);
            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data.stats.skipped).toBeGreaterThanOrEqual(1);
            expect(data.stats.reset).toBeGreaterThanOrEqual(0);
        });
    });

    // ─── BALANCE AUDIT ─────────────────────────────────────
    describe('GET /cron/balance-audit', () => {
        it('rejects without CRON_SECRET', async () => {
            const response = await balanceAuditGet(makeCronRequest('/api/cron/balance-audit', false) as any);
            expect(response.status).toBe(401);
        });

        it('detects balance discrepancy', async () => {
            // Create challenge where stored balance doesn't match trade history
            const [challenge] = await db.insert(challenges).values({
                userId: fixture.userId,
                phase: 'challenge',
                status: 'active',
                startingBalance: '10000.00',
                currentBalance: '25000.00', // WRONG — should be lower
                startOfDayBalance: '25000.00',
                highWaterMark: '25000.00',
                platform: 'polymarket',
                rulesConfig: {},
            }).returning();

            // Insert a BUY trade that deducted $500
            await db.insert(trades).values({
                challengeId: challenge.id,
                marketId: 'audit-test-market',
                type: 'BUY',
                direction: 'YES',
                price: '0.50',
                amount: '500.00',
                shares: '1000.00',
            });

            const response = await balanceAuditGet(makeCronRequest('/api/cron/balance-audit') as any);
            expect(response.status).toBe(200);

            const data = await response.json();
            // Should flag the $15500 discrepancy ($25000 stored vs $9500 calculated)
            expect(data.summary.alertsFound).toBeGreaterThan(0);
            expect(data.summary.status).toBe('ALERTS_FOUND');

            const alert = data.alerts.find((a: { challengeId: string }) => a.challengeId === challenge.id);
            expect(alert).toBeDefined();
            expect(alert.isSuspicious).toBe(true);
            // Discrepancy = 25000 - (10000 - 500) = 15500 → matches $15K ghost credit pattern
            expect(Math.abs(alert.discrepancy)).toBeGreaterThan(1);
        });

        it('reports HEALTHY when balances match', async () => {
            // Create challenge with correct balance matching trade history
            const [challenge] = await db.insert(challenges).values({
                userId: fixture.userId,
                phase: 'challenge',
                status: 'active',
                startingBalance: '10000.00',
                currentBalance: '9500.00', // Correct: 10000 - 500
                startOfDayBalance: '9500.00',
                highWaterMark: '10000.00',
                platform: 'polymarket',
                rulesConfig: {},
            }).returning();

            // Insert a BUY trade that matches the balance reduction
            await db.insert(trades).values({
                challengeId: challenge.id,
                marketId: 'audit-test-market-2',
                type: 'BUY',
                direction: 'YES',
                price: '0.50',
                amount: '500.00',
                shares: '1000.00',
            });

            const response = await balanceAuditGet(makeCronRequest('/api/cron/balance-audit') as any);
            expect(response.status).toBe(200);

            const data = await response.json();
            // The only active challenge should be healthy
            const result = data.allResults.find((r: { challengeId: string }) => r.challengeId === challenge.id);
            expect(result).toBeDefined();
            expect(result.isSuspicious).toBe(false);
            expect(Math.abs(result.discrepancy)).toBeLessThanOrEqual(1);
        });
    });

    // ─── DAILY FEES ────────────────────────────────────────
    describe('GET /cron/daily-fees', () => {
        it('calls runFeeSweep and returns success', async () => {
            // daily-fees only checks CRON_SECRET in production, so we test the success path
            const response = await dailyFeesGet(makeCronRequest('/api/cron/daily-fees') as any);
            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.message).toContain('Fee sweep completed');
        });
    });
});
