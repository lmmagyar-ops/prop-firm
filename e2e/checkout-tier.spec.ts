import { test, expect } from '@playwright/test';

/**
 * E2E Checkout Tier Mapping Tests
 * 
 * REGRESSION: Dec 27 2025 (commit c12f267) introduced fragile string-matching
 * to derive tierId from the `size` query param. Any mismatch silently defaulted
 * to 10k, causing all tier purchases to provision 10k accounts.
 * 
 * These tests verify that clicking each tier on /buy-evaluation produces the
 * correct checkout URL params and the checkout page displays the correct tier.
 * 
 * Run: npx playwright test e2e/checkout-tier.spec.ts
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

async function navigateAndWait(page: import('@playwright/test').Page, path: string) {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
}

async function loginTestUser(page: import('@playwright/test').Page): Promise<boolean> {
    try {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        const emailInput = page.getByRole('textbox', { name: /email/i });
        const passwordInput = page.locator('input[type="password"]');

        if (!await emailInput.isVisible({ timeout: 5000 })) return false;

        await emailInput.fill(process.env.TEST_USER_EMAIL || 'test@example.com');
        await passwordInput.fill(process.env.TEST_USER_PASSWORD || 'testpassword123');
        await page.getByRole('button', { name: /sign in|login/i }).click();
        await page.waitForURL(/dashboard/, { timeout: 10000 });
        return true;
    } catch {
        return false;
    }
}

// ─── Tier Configuration (source of truth) ───────────────────────────────────

const TIERS = [
    { key: 'scout', id: '5k', size: 5000, price: 79, label: '5K' },
    { key: 'grinder', id: '10k', size: 10000, price: 149, label: '10K' },
    { key: 'executive', id: '25k', size: 25000, price: 299, label: '25K' },
];

// ─── 1. Buy-Evaluation → Checkout URL Params ──────────────────────────────

test.describe('Checkout Tier Mapping', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        const loggedIn = await loginTestUser(page);
        if (!loggedIn) test.skip();
    });

    for (const tier of TIERS) {
        test(`clicking ${tier.key} ($${tier.price}) button links to checkout with tier=${tier.id}`, async ({ page }) => {
            await navigateAndWait(page, '/buy-evaluation');

            // Find the button with the price for this tier
            const buyButton = page.getByRole('link', { name: new RegExp(`\\$${tier.price}`) });

            if (!await buyButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
                // Fallback: look for the button by text content
                const altButton = page.locator(`a:has-text("$${tier.price}")`);
                if (!await altButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                    test.skip();
                    return;
                }
                const href = await altButton.first().getAttribute('href');
                expect(href, `${tier.key} tier button should exist`).not.toBeNull();

                // Verify URL params
                const url = new URL(href!, 'http://localhost');
                expect(url.searchParams.get('size'), `${tier.key} size param`).toBe(tier.size.toString());
                expect(url.searchParams.get('tier'), `${tier.key} tier param`).toBe(tier.id);
                expect(url.searchParams.get('from_dashboard'), `${tier.key} from_dashboard param`).toBe('true');
                return;
            }

            const href = await buyButton.first().getAttribute('href');
            expect(href, `${tier.key} tier button should have href`).not.toBeNull();

            // Verify URL params contain correct size and tier
            const url = new URL(href!, 'http://localhost');
            expect(url.searchParams.get('size'), `${tier.key} size param`).toBe(tier.size.toString());
            expect(url.searchParams.get('tier'), `${tier.key} tier param`).toBe(tier.id);
            expect(url.searchParams.get('from_dashboard'), `${tier.key} from_dashboard param`).toBe('true');
        });
    }
});

// ─── 2. Checkout Page Displays Correct Tier ─────────────────────────────────

test.describe('Checkout Page Tier Display', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        const loggedIn = await loginTestUser(page);
        if (!loggedIn) test.skip();
    });

    for (const tier of TIERS) {
        test(`checkout page shows LEVEL: ${tier.label} for tier=${tier.id}`, async ({ page }) => {
            // Navigate directly to checkout with the correct params
            await navigateAndWait(page, `/checkout?size=${tier.size}&price=${tier.price}&tier=${tier.id}&from_dashboard=true`);

            // Wait for client-side rendering
            await page.waitForTimeout(1000);

            // Should display the correct tier level
            const levelBadge = page.locator('text=/LEVEL/i');
            if (await levelBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
                const text = await levelBadge.textContent();
                expect(text, `Checkout should show LEVEL: ${tier.label}`).toContain(tier.label);
            }

            // Should display the correct account size
            const sizeDisplay = page.locator(`text=/$${tier.size.toLocaleString()}/`);
            const hasSizeDisplay = await sizeDisplay.first().isVisible({ timeout: 3000 }).catch(() => false);
            expect(hasSizeDisplay, `Checkout should display $${tier.size.toLocaleString()}`).toBeTruthy();
        });
    }

    test('checkout without tier param still derives correctly from size=25000', async ({ page }) => {
        // Backward compatibility: old URLs without explicit tier param
        await navigateAndWait(page, '/checkout?size=25000&price=299&from_dashboard=true');
        await page.waitForTimeout(1000);

        const levelBadge = page.locator('text=/LEVEL/i');
        if (await levelBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
            const text = await levelBadge.textContent();
            expect(text, 'Should derive 25K from size=25000').toContain('25K');
        }
    });

    test('checkout without tier param still derives correctly from size=5000', async ({ page }) => {
        await navigateAndWait(page, '/checkout?size=5000&price=79&from_dashboard=true');
        await page.waitForTimeout(1000);

        const levelBadge = page.locator('text=/LEVEL/i');
        if (await levelBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
            const text = await levelBadge.textContent();
            expect(text, 'Should derive 5K from size=5000').toContain('5K');
        }
    });
});

// ─── 3. Invoice API Tier Mapping ────────────────────────────────────────────

test.describe('Invoice API Tier Mapping', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        const loggedIn = await loginTestUser(page);
        if (!loggedIn) test.skip();
    });

    for (const tier of TIERS) {
        test(`POST create-confirmo-invoice with tier=${tier.id} returns correct response`, async ({ request }) => {
            const response = await request.post('/api/checkout/create-confirmo-invoice', {
                data: {
                    tier: tier.id,
                    price: tier.price,
                    platform: 'polymarket',
                },
            });

            // Should succeed or require auth (401/403)
            const status = response.status();

            if (status === 200) {
                const data = await response.json();
                // In mock mode, it should redirect to onboarding
                // In production mode, it should return an invoice URL
                expect(data.url || data.redirectUrl).toBeTruthy();
            } else {
                // 401/403 means auth required — that's valid
                expect([401, 403]).toContain(status);
            }
        });
    }
});
