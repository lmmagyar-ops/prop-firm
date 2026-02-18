/**
 * API Route Integration Tests: Payout Routes
 * 
 * Tests the payout/request (POST) and payout/eligibility (GET) route handlers.
 * Real: DB, challenge ownership verification
 * Mocked: auth, PayoutService, logger
 * 
 * Key bugs this catches:
 * - Non-funded challenge can request payout
 * - User can request payout on someone else's challenge
 * - Missing fields not caught at route level
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import { users, challenges } from '@/db/schema';
import { eq, like } from 'drizzle-orm';

// ─── MOCK AUTH ──────────────────────────────────────────────
let mockUserId = '';
vi.mock('@/auth', () => ({
    auth: vi.fn(() => Promise.resolve(
        mockUserId
            ? { user: { id: mockUserId, email: 'payout-test@test.local' }, expires: '2099-12-31' }
            : null
    )),
}));

vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    }),
}));

// Mock PayoutService — we test the route wiring, not the payout math
vi.mock('@/lib/payout-service', () => ({
    PayoutService: {
        requestPayout: vi.fn().mockResolvedValue({
            id: 'test-payout-id',
            amount: '1000.00',
            status: 'pending',
        }),
        checkEligibility: vi.fn().mockResolvedValue({
            eligible: true,
            netProfit: 500,
            tradingDays: 5,
            reason: null,
        }),
        calculatePayout: vi.fn().mockResolvedValue({
            grossProfit: 500,
            profitSplit: 0.80,
            netPayout: 400,
        }),
    },
}));

// ─── IMPORT ROUTE HANDLERS ─────────────────────────────────
import { POST as payoutRequestPost } from '@/app/api/payout/request/route';
import { GET as payoutEligibilityGet } from '@/app/api/payout/eligibility/route';

// ─── HELPERS ───────────────────────────────────────────────
function makePayoutRequest(body: Record<string, unknown>): Request {
    return new Request('http://localhost:3000/api/payout/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

function makeEligibilityRequest(challengeId: string): Request {
    return new Request(`http://localhost:3000/api/payout/eligibility?challengeId=${challengeId}`, {
        method: 'GET',
    });
}

const TEST_EMAIL = 'payout-test@test.local';

const fixture = {
    userId: '',
    fundedChallengeId: '',
    challengeChallengeId: '',
    otherUserId: '',
};

describe('API Routes: Payout', () => {
    beforeAll(async () => {
        // Clean stale data
        const staleUsers = await db.select({ id: users.id }).from(users)
            .where(like(users.email, 'payout-test@%'));
        for (const u of staleUsers) {
            await db.delete(challenges).where(eq(challenges.userId, u.id));
            await db.delete(users).where(eq(users.id, u.id));
        }

        // Create test user
        const [user] = await db.insert(users).values({
            email: TEST_EMAIL,
            name: 'Payout Test',
            passwordHash: 'test-hash',
            isActive: true,
        }).returning();
        fixture.userId = user.id;

        // Create another user (for ownership tests)
        const [otherUser] = await db.insert(users).values({
            email: 'payout-test-other@test.local',
            name: 'Other User',
            passwordHash: 'test-hash',
            isActive: true,
        }).returning();
        fixture.otherUserId = otherUser.id;

        // Create funded challenge
        const [funded] = await db.insert(challenges).values({
            userId: user.id,
            phase: 'funded',
            status: 'active',
            startingBalance: '10000.00',
            currentBalance: '10500.00',
            startOfDayBalance: '10500.00',
            highWaterMark: '10500.00',
            platform: 'polymarket',
            rulesConfig: {},
        }).returning();
        fixture.fundedChallengeId = funded.id;

        // Create challenge-phase challenge (not funded, status=pending to avoid unique active constraint)
        const [challenge] = await db.insert(challenges).values({
            userId: user.id,
            phase: 'challenge',
            status: 'pending',
            startingBalance: '10000.00',
            currentBalance: '10000.00',
            startOfDayBalance: '10000.00',
            highWaterMark: '10000.00',
            platform: 'polymarket',
            rulesConfig: {},
        }).returning();
        fixture.challengeChallengeId = challenge.id;

        mockUserId = fixture.userId;
    });

    beforeEach(() => {
        mockUserId = fixture.userId;
    });

    afterAll(async () => {
        await db.delete(challenges).where(eq(challenges.userId, fixture.userId));
        await db.delete(challenges).where(eq(challenges.userId, fixture.otherUserId));
        await db.delete(users).where(eq(users.id, fixture.userId));
        await db.delete(users).where(eq(users.id, fixture.otherUserId));
    });

    // ─── Payout Request ────────────────────────────────────
    describe('POST /payout/request', () => {
        it('returns 401 without auth', async () => {
            mockUserId = '';
            const response = await payoutRequestPost(makePayoutRequest({
                challengeId: fixture.fundedChallengeId,
                walletAddress: '0x1234567890abcdef',
            }) as any);
            expect(response.status).toBe(401);
        });

        it('returns 400 without challengeId', async () => {
            const response = await payoutRequestPost(makePayoutRequest({
                walletAddress: '0x1234567890abcdef',
            }) as any);
            expect(response.status).toBe(400);
        });

        it('returns 400 for invalid network', async () => {
            const response = await payoutRequestPost(makePayoutRequest({
                challengeId: fixture.fundedChallengeId,
                walletAddress: '0x1234567890abcdef',
                network: 'INVALID',
            }) as any);
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain('Invalid network');
        });

        it('returns 404 for non-existent challenge', async () => {
            const response = await payoutRequestPost(makePayoutRequest({
                challengeId: '00000000-0000-0000-0000-000000000000',
                walletAddress: '0x1234567890abcdef',
            }) as any);
            expect(response.status).toBe(404);
        });

        it('returns 400 for non-funded challenge', async () => {
            const response = await payoutRequestPost(makePayoutRequest({
                challengeId: fixture.challengeChallengeId,
                walletAddress: '0x1234567890abcdef',
            }) as any);
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain('funded');
        });

        it('returns 404 when accessing another user\'s challenge', async () => {
            // Create a funded challenge for the other user
            const [otherChallenge] = await db.insert(challenges).values({
                userId: fixture.otherUserId,
                phase: 'funded',
                status: 'active',
                startingBalance: '10000.00',
                currentBalance: '10500.00',
                startOfDayBalance: '10500.00',
                highWaterMark: '10500.00',
                platform: 'polymarket',
                rulesConfig: {},
            }).returning();

            const response = await payoutRequestPost(makePayoutRequest({
                challengeId: otherChallenge.id,
                walletAddress: '0x1234567890abcdef',
            }) as any);
            // Should be 404 since ownership check fails (WHERE userId = current user)
            expect(response.status).toBe(404);

            await db.delete(challenges).where(eq(challenges.id, otherChallenge.id));
        });

        it('succeeds for funded challenge with valid data', async () => {
            const response = await payoutRequestPost(makePayoutRequest({
                challengeId: fixture.fundedChallengeId,
                walletAddress: '0x1234567890abcdef',
                network: 'POLYGON',
            }) as any);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.payout).toBeDefined();
            expect(data.message).toContain('Pending');
        });
    });

    // ─── Payout Eligibility ────────────────────────────────
    describe('GET /payout/eligibility', () => {
        it('returns 401 without auth', async () => {
            mockUserId = '';
            const response = await payoutEligibilityGet(
                makeEligibilityRequest(fixture.fundedChallengeId) as any
            );
            expect(response.status).toBe(401);
        });

        it('returns 400 without challengeId', async () => {
            const response = await payoutEligibilityGet(
                new Request('http://localhost:3000/api/payout/eligibility') as any
            );
            expect(response.status).toBe(400);
        });

        it('returns 400 for non-funded challenge', async () => {
            const response = await payoutEligibilityGet(
                makeEligibilityRequest(fixture.challengeChallengeId) as any
            );
            expect(response.status).toBe(400);
        });

        it('returns eligibility for funded challenge', async () => {
            const response = await payoutEligibilityGet(
                makeEligibilityRequest(fixture.fundedChallengeId) as any
            );
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.challengeId).toBe(fixture.fundedChallengeId);
            expect(data.phase).toBe('funded');
            expect(data.eligibility).toBeDefined();
            expect(data.eligibility.eligible).toBe(true);
            expect(data.calculation).toBeDefined();
            expect(data.calculation.netPayout).toBe(400);
        });
    });
});
