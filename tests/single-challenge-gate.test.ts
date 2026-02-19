/**
 * Single-Challenge Gate Tests
 * 
 * REGRESSION: Feb 18 2026 — checkout mock path cancelled active challenges
 * when buying a new one, causing Mat's evaluations to "disappear."
 * 
 * These tests verify the behavioral contract:
 *   1. User with active challenge CANNOT buy another (checkout returns 400)
 *   2. User with NO active challenge CAN buy (checkout creates one)
 *   3. Server action returns existing challenge instead of creating duplicate
 *   4. Confirmo webhook skips creation when active challenge exists
 * 
 * Real: DB (users, challenges)
 * Mocked: auth, logger, CONFIRMO_API_KEY (unset = mock path)
 * 
 * Run: npx vitest run tests/single-challenge-gate.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { db } from '@/db';
import { users, challenges, trades, positions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// ─── MOCKS ─────────────────────────────────────────────────
let mockUserId = '';

vi.mock('@/auth', () => ({
    auth: vi.fn(() => Promise.resolve({
        user: { id: mockUserId, email: 'gate-test@test.local' }
    })),
}));

vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    }),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

// Ensure mock path is used (no CONFIRMO_API_KEY)
delete process.env.CONFIRMO_API_KEY;

// ─── IMPORTS (after mocks) ─────────────────────────────────
import { POST as checkoutPOST } from '@/app/api/checkout/create-confirmo-invoice/route';
import { POST as confirmoPOST } from '@/app/api/webhooks/confirmo/route';
import { createChallengeAction } from '@/app/actions/challenges';

// ─── HELPERS ───────────────────────────────────────────────
const TEST_EMAIL = 'gate-test@test.local';

function makeCheckoutRequest(tier = '10k'): Request {
    return new Request('http://localhost:3000/api/checkout/create-confirmo-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, platform: 'polymarket' }),
    });
}

function makeConfirmoWebhook(userId: string, tier = '10k'): Request {
    return new Request('http://localhost:3000/api/webhooks/confirmo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: 'paid',
            reference: `${userId}:${tier}:polymarket`,
            amount: '149',
        }),
    });
}

// ─── FIXTURE ───────────────────────────────────────────────
const fixture = { userId: '' };

describe('Single-Challenge Gate', () => {
    beforeAll(async () => {
        // Clean stale test data
        const staleUsers = await db.select({ id: users.id }).from(users)
            .where(eq(users.email, TEST_EMAIL));
        for (const u of staleUsers) {
            await db.delete(trades).where(eq(trades.challengeId, u.id));
            await db.delete(positions).where(eq(positions.challengeId, u.id));
            await db.delete(challenges).where(eq(challenges.userId, u.id));
            await db.delete(users).where(eq(users.id, u.id));
        }

        // Create test user
        const [user] = await db.insert(users).values({
            email: TEST_EMAIL,
            name: 'Gate Test User',
            passwordHash: 'test-hash',
            isActive: true,
        }).returning();
        fixture.userId = user.id;
        mockUserId = user.id;
    });

    afterEach(async () => {
        // Clean challenges between tests
        await db.delete(challenges).where(eq(challenges.userId, fixture.userId));
    });

    afterAll(async () => {
        await db.delete(challenges).where(eq(challenges.userId, fixture.userId));
        await db.delete(users).where(eq(users.id, fixture.userId));
    });

    // ─── CHECKOUT ROUTE ────────────────────────────────────
    describe('Checkout API (mock path)', () => {
        it('creates a challenge when user has none', async () => {
            const res = await checkoutPOST(makeCheckoutRequest() as any);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.invoiceUrl).toBeDefined();

            // Verify challenge was created
            const userChallenges = await db.query.challenges.findMany({
                where: and(
                    eq(challenges.userId, fixture.userId),
                    eq(challenges.status, 'active')
                ),
            });
            expect(userChallenges).toHaveLength(1);
        });

        it('returns 400 when user already has an active challenge', async () => {
            // Seed an active challenge
            await db.insert(challenges).values({
                userId: fixture.userId,
                phase: 'challenge',
                status: 'active',
                startingBalance: '10000.00',
                currentBalance: '10000.00',
                startOfDayBalance: '10000.00',
                highWaterMark: '10000.00',
                rulesConfig: {},
                platform: 'polymarket',
                startedAt: new Date(),
                endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            });

            // Try to buy another
            const res = await checkoutPOST(makeCheckoutRequest('25k') as any);
            expect(res.status).toBe(400);

            const data = await res.json();
            expect(data.error).toMatch(/already have an active evaluation/i);

            // Verify original challenge was NOT cancelled
            const userChallenges = await db.query.challenges.findMany({
                where: and(
                    eq(challenges.userId, fixture.userId),
                    eq(challenges.status, 'active')
                ),
            });
            expect(userChallenges).toHaveLength(1);
            expect(parseFloat(userChallenges[0].startingBalance)).toBe(10000); // Original, not 25k
        });

        it('does NOT cancel existing challenge (regression: Mat bug)', async () => {
            // Seed an active challenge
            const [original] = await db.insert(challenges).values({
                userId: fixture.userId,
                phase: 'challenge',
                status: 'active',
                startingBalance: '5000.00',
                currentBalance: '4800.00', // Simulates trading activity
                startOfDayBalance: '5000.00',
                highWaterMark: '5000.00',
                rulesConfig: {},
                platform: 'polymarket',
                startedAt: new Date(),
                endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }).returning();

            // Attempt second purchase
            await checkoutPOST(makeCheckoutRequest('10k') as any);

            // Original challenge must still be active
            const challenge = await db.query.challenges.findFirst({
                where: eq(challenges.id, original.id),
            });
            expect(challenge!.status).toBe('active');
            expect(parseFloat(challenge!.currentBalance)).toBe(4800); // Balance preserved
        });
    });

    // ─── SERVER ACTION ─────────────────────────────────────
    describe('createChallengeAction', () => {
        it('returns existing challenge instead of creating duplicate', async () => {
            // Seed an active challenge
            const [existing] = await db.insert(challenges).values({
                userId: fixture.userId,
                phase: 'challenge',
                status: 'active',
                startingBalance: '10000.00',
                currentBalance: '10000.00',
                startOfDayBalance: '10000.00',
                highWaterMark: '10000.00',
                rulesConfig: {},
                platform: 'polymarket',
                startedAt: new Date(),
                endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }).returning();

            // Call action — should return existing, not create new
            const result = await createChallengeAction('10k');
            expect(result.success).toBe(true);
            expect(result.challengeId).toBe(existing.id);

            // Still only 1 challenge
            const count = await db.query.challenges.findMany({
                where: and(
                    eq(challenges.userId, fixture.userId),
                    eq(challenges.status, 'active')
                ),
            });
            expect(count).toHaveLength(1);
        });
    });

    // ─── CONFIRMO WEBHOOK ──────────────────────────────────
    describe('Confirmo webhook', () => {
        it('skips challenge creation when user already has active challenge', async () => {
            // Seed an active challenge
            await db.insert(challenges).values({
                userId: fixture.userId,
                phase: 'challenge',
                status: 'active',
                startingBalance: '10000.00',
                currentBalance: '10000.00',
                startOfDayBalance: '10000.00',
                highWaterMark: '10000.00',
                rulesConfig: {},
                platform: 'polymarket',
                startedAt: new Date(),
                endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            });

            // Fire webhook — should NOT create a second challenge
            await confirmoPOST(makeConfirmoWebhook(fixture.userId) as any);

            // Still only 1 active challenge
            const active = await db.query.challenges.findMany({
                where: and(
                    eq(challenges.userId, fixture.userId),
                    eq(challenges.status, 'active')
                ),
            });
            expect(active).toHaveLength(1);
        });
    });
});
