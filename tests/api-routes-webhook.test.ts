/**
 * API Route Integration Tests: Confirmo Payment Webhook
 * 
 * Tests the POST /api/webhooks/confirmo route handler.
 * Real: DB, getTierConfig, buildRulesConfig, PLANS
 * Mocked: CONFIRMO_CALLBACK_PASSWORD, logger
 * 
 * Key bugs this catches:
 * - Challenge created with wrong tier balance
 * - Duplicate webhook creates double challenges (invoice ID idempotency)
 * - Missing/invalid signature → 401
 * - Payment amount mismatch not caught
 * - Discount code not redeemed or double-redeemed
 * - Discount amount trusted from reference string instead of re-derived from DB
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import { users, challenges, discountCodes, discountRedemptions, paymentLogs } from '@/db/schema';
import { eq, like } from 'drizzle-orm';
import crypto from 'crypto';

// ─── MOCKS ─────────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    }),
}));

// ─── IMPORT ROUTE HANDLER ──────────────────────────────────
import { POST as webhookPost } from '@/app/api/webhooks/confirmo/route';

// ─── HELPERS ───────────────────────────────────────────────
const CALLBACK_PASSWORD = 'test-webhook-secret-123';

function sign(payload: string): string {
    return crypto.createHmac('sha256', CALLBACK_PASSWORD).update(payload).digest('hex');
}

let invoiceCounter = 0;
function makeInvoiceId(): string {
    return `inv-test-${Date.now()}-${++invoiceCounter}`;
}

function makeWebhookRequest(body: Record<string, unknown>, signature?: string): Request {
    const bodyStr = JSON.stringify(body);
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (signature !== undefined) {
        headers['confirmo-signature'] = signature;
    }
    return new Request('http://localhost:3000/api/webhooks/confirmo', {
        method: 'POST',
        headers,
        body: bodyStr,
    });
}

const TEST_EMAIL = 'webhook-test@test.local';

const fixture = {
    userId: '',
    discountId: '',
};

describe('API Routes: Confirmo Webhook', () => {
    beforeAll(async () => {
        process.env.CONFIRMO_CALLBACK_PASSWORD = CALLBACK_PASSWORD;

        // Clean stale data
        const staleUsers = await db.select({ id: users.id }).from(users)
            .where(like(users.email, 'webhook-test@%'));
        for (const u of staleUsers) {
            await db.delete(paymentLogs).where(eq(paymentLogs.userId, u.id));
            await db.delete(discountRedemptions).where(eq(discountRedemptions.userId, u.id));
            await db.delete(challenges).where(eq(challenges.userId, u.id));
            await db.delete(users).where(eq(users.id, u.id));
        }
        // Clean stale discount codes
        await db.delete(discountCodes).where(eq(discountCodes.code, 'TESTDISCOUNT50'));

        // Create test user
        const [user] = await db.insert(users).values({
            email: TEST_EMAIL,
            name: 'Webhook Test',
            passwordHash: 'test-hash',
            isActive: true,
        }).returning();
        fixture.userId = user.id;

        // Create a test discount code (matching actual schema)
        const [discount] = await db.insert(discountCodes).values({
            code: 'TESTDISCOUNT50',
            name: 'Test Discount',
            type: 'fixed_amount',
            value: '50.00',
            maxTotalUses: 10,
            currentUses: 0,
            active: true,
            validFrom: new Date('2020-01-01'),
        }).returning();
        fixture.discountId = discount.id;
    });

    beforeEach(async () => {
        // Clean challenges and payment logs before each test to avoid idempotency conflicts
        await db.delete(paymentLogs).where(eq(paymentLogs.userId, fixture.userId));
        await db.delete(discountRedemptions).where(eq(discountRedemptions.userId, fixture.userId));
        await db.delete(challenges).where(eq(challenges.userId, fixture.userId));
    });

    afterAll(async () => {
        await db.delete(paymentLogs).where(eq(paymentLogs.userId, fixture.userId));
        await db.delete(discountRedemptions).where(eq(discountRedemptions.userId, fixture.userId));
        await db.delete(challenges).where(eq(challenges.userId, fixture.userId));
        await db.delete(discountCodes).where(eq(discountCodes.id, fixture.discountId));
        await db.delete(users).where(eq(users.id, fixture.userId));
        delete process.env.CONFIRMO_CALLBACK_PASSWORD;
    });

    it('rejects requests with invalid signature', async () => {
        const body = {
            id: makeInvoiceId(),
            status: 'paid',
            reference: `${fixture.userId}:10k:polymarket`,
            amount: '149',
        };
        const response = await webhookPost(makeWebhookRequest(body, 'invalid-signature') as any);
        expect(response.status).toBe(401);
    });

    it('creates pending challenge on valid paid webhook', async () => {
        const body = {
            id: makeInvoiceId(),
            status: 'paid',
            reference: `${fixture.userId}:10k:polymarket`,
            amount: '149', // 10k tier price
        };
        const bodyStr = JSON.stringify(body);
        const sig = sign(bodyStr);

        const response = await webhookPost(makeWebhookRequest(body, sig) as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.received).toBe(true);

        // Verify challenge was created
        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.userId, fixture.userId),
        });
        expect(challenge).toBeDefined();
        expect(challenge!.status).toBe('pending');
        expect(challenge!.phase).toBe('challenge');
        expect(challenge!.platform).toBe('polymarket');

        // Verify 10k tier balance
        expect(parseFloat(challenge!.startingBalance)).toBe(10000);
        expect(parseFloat(challenge!.currentBalance)).toBe(10000);

        // Verify payment log was written with challengeId backfilled
        const log = await db.query.paymentLogs.findFirst({
            where: eq(paymentLogs.userId, fixture.userId),
        });
        expect(log).toBeDefined();
        expect(log!.status).toBe('paid');
        expect(log!.challengeId).toBe(challenge!.id);
        expect(parseFloat(log!.amountPaid)).toBe(149);
    });

    it('deduplicates webhook retries using invoice ID (not time window)', async () => {
        const invoiceId = makeInvoiceId();

        // First call — creates challenge and payment log
        const body = {
            id: invoiceId,
            status: 'paid',
            reference: `${fixture.userId}:10k:polymarket`,
            amount: '149',
        };
        const bodyStr = JSON.stringify(body);
        const sig = sign(bodyStr);

        await webhookPost(makeWebhookRequest(body, sig) as any);

        // Verify exactly 1 log row
        const logsBefore = await db.query.paymentLogs.findMany({
            where: eq(paymentLogs.userId, fixture.userId),
        });
        expect(logsBefore.length).toBe(1);

        // Second call with same invoice ID — should be deduplicated
        const response2 = await webhookPost(makeWebhookRequest(body, sig) as any);
        expect(response2.status).toBe(200);

        const data2 = await response2.json();
        expect(data2.deduplicated).toBe(true);

        // Still only 1 challenge and 1 log row
        const allChallenges = await db.query.challenges.findMany({
            where: eq(challenges.userId, fixture.userId),
        });
        expect(allChallenges.length).toBe(1);

        const logsAfter = await db.query.paymentLogs.findMany({
            where: eq(paymentLogs.userId, fixture.userId),
        });
        expect(logsAfter.length).toBe(1);
    });

    it('rejects underpayment (< 95% of tier price)', async () => {
        const body = {
            id: makeInvoiceId(),
            status: 'paid',
            reference: `${fixture.userId}:10k:polymarket`,
            amount: '50', // Way below $149 tier price
        };
        const bodyStr = JSON.stringify(body);
        const sig = sign(bodyStr);

        const response = await webhookPost(makeWebhookRequest(body, sig) as any);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toContain('Payment amount mismatch');
    });

    it('uses DB-derived discount amount, ignores inflated reference string value', async () => {
        // Reference claims discountAmount: 999 (attacker-supplied large value)
        // DB has value: 50 for TESTDISCOUNT50
        // Effective expected price should be $149 - $50 = $99, NOT $149 - $999 = 0
        const body = {
            id: makeInvoiceId(),
            status: 'paid',
            // discountAmount in ref is 999 (inflated), originalPrice is 149
            reference: `${fixture.userId}:10k:polymarket:TESTDISCOUNT50:999:149`,
            amount: '99', // $149 - $50 (DB value) = $99
        };
        const bodyStr = JSON.stringify(body);
        const sig = sign(bodyStr);

        const response = await webhookPost(makeWebhookRequest(body, sig) as any);
        expect(response.status).toBe(200);

        // Verify challenge was created (payment passed the re-derived amount check)
        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.userId, fixture.userId),
        });
        expect(challenge).toBeDefined();

        // Verify redemption used the DB-derived amount ($50), not the reference amount ($999)
        const redemption = await db.query.discountRedemptions.findFirst({
            where: eq(discountRedemptions.userId, fixture.userId),
        });
        expect(redemption).toBeDefined();
        expect(parseFloat(redemption!.discountAmount)).toBe(50); // DB value, not 999
        expect(redemption!.challengeId).toBe(challenge!.id); // Bug 5: challengeId populated
    });

    it('handles discount code redemption and increments usage', async () => {
        // Check initial discount usage
        const discountBefore = await db.query.discountCodes.findFirst({
            where: eq(discountCodes.id, fixture.discountId),
        });
        const usageBefore = discountBefore?.currentUses ?? 0;

        // Reference format: userId:tier:platform:discountCode:discountAmount:originalPrice
        const body = {
            id: makeInvoiceId(),
            status: 'paid',
            reference: `${fixture.userId}:10k:polymarket:TESTDISCOUNT50:50:149`,
            amount: '99', // $149 - $50 discount = $99
        };
        const bodyStr = JSON.stringify(body);
        const sig = sign(bodyStr);

        const response = await webhookPost(makeWebhookRequest(body, sig) as any);
        expect(response.status).toBe(200);

        // Verify challenge was created despite discounted price
        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.userId, fixture.userId),
        });
        expect(challenge).toBeDefined();
        expect(parseFloat(challenge!.startingBalance)).toBe(10000);

        // Verify discount was redeemed with correct amount and challengeId (Bug 5 fix)
        const redemption = await db.query.discountRedemptions.findFirst({
            where: eq(discountRedemptions.userId, fixture.userId),
        });
        expect(redemption).toBeDefined();
        expect(parseFloat(redemption!.discountAmount)).toBe(50);
        expect(redemption!.challengeId).toBe(challenge!.id);

        // Verify usage counter incremented
        const discountAfter = await db.query.discountCodes.findFirst({
            where: eq(discountCodes.id, fixture.discountId),
        });
        expect(discountAfter!.currentUses).toBe(usageBefore + 1);
    });

    it('ignores non-paid/confirmed statuses', async () => {
        const body = {
            id: makeInvoiceId(),
            status: 'pending',
            reference: `${fixture.userId}:10k:polymarket`,
            amount: '149',
        };
        const bodyStr = JSON.stringify(body);
        const sig = sign(bodyStr);

        const response = await webhookPost(makeWebhookRequest(body, sig) as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.received).toBe(true);

        // No challenge should be created for 'pending' status
        const allChallenges = await db.query.challenges.findMany({
            where: eq(challenges.userId, fixture.userId),
        });
        expect(allChallenges.length).toBe(0);
    });
});
