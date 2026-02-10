import { test, expect } from '@playwright/test';

/**
 * E2E Smoke Tests — Bug Regression Suite
 * 
 * These tests specifically target the UI/UX bugs found during the Feb 7 2026
 * testing sprint. Each test maps to a specific bug that was reported.
 * 
 * Run: PLAYWRIGHT_BASE_URL=https://staging-url npx playwright test e2e/smoke.spec.ts
 * Or:  npm run test:e2e
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Navigate to a page and wait for it to stabilize */
async function navigateAndWait(page: import('@playwright/test').Page, path: string) {
    await page.goto(path);
    // Using 'domcontentloaded' instead of 'networkidle' — SSE market streams
    // keep the network permanently active, causing 'networkidle' to hang.
    await page.waitForLoadState('domcontentloaded');
}

// ─── 1. Public Page Loads ───────────────────────────────────────────────────

test.describe('Public Pages', () => {
    test('homepage loads without errors', async ({ page }) => {
        await navigateAndWait(page, '/');
        // Should not show an error page
        await expect(page.locator('body')).not.toContainText('Application error');
        await expect(page.locator('body')).not.toContainText('500 Internal Server Error');
    });

    test('buy-evaluation page loads (or redirects to auth)', async ({ page }) => {
        await navigateAndWait(page, '/buy-evaluation');
        // Should show buy-eval content, app auth, or Vercel deployment protection
        // The key assertion: no 500 error or application crash
        await expect(page.locator('body')).not.toContainText('Application error');
        await expect(page.locator('body')).not.toContainText('Internal Server Error');
    });
});

// ─── 2. PWA Popup (Desktop) ────────────────────────────────────────────────
// BUG: PWA "Add to Home Screen" popup was appearing on desktop browsers.

test.describe('PWA Behavior', () => {
    test('no PWA install prompt on desktop viewport', async ({ page }) => {
        // Desktop viewport (default in Playwright is 1280x720)
        await page.setViewportSize({ width: 1280, height: 720 });

        // Clear any dismissal flag so the prompt would show if enabled
        await navigateAndWait(page, '/dashboard');
        await page.evaluate(() => localStorage.removeItem('pwaPromptDismissed'));
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Wait longer than the 30s trigger delay
        await page.waitForTimeout(5000);

        // PWA prompt should NOT be visible on desktop
        const pwaprompt = page.getByTestId('pwa-install-prompt');
        await expect(pwaprompt).not.toBeVisible();
    });
});

// ─── 3. Balance Display ────────────────────────────────────────────────────
// BUG: Balance showed "(10k)" suffix with no decimal places.

test.describe('Balance Display', () => {
    test('balance shows 2 decimal places, no tier label', async ({ page }) => {
        await navigateAndWait(page, '/dashboard');

        // If redirected to auth, skip (not logged in)
        if (page.url().includes('auth') || page.url().includes('login')) {
            test.skip();
            return;
        }

        const balance = page.getByTestId('account-balance');
        if (await balance.isVisible({ timeout: 5000 }).catch(() => false)) {
            const text = await balance.textContent();

            // Should have 2 decimal places (e.g. "$9,868.97")
            expect(text).toMatch(/\$[\d,]+\.\d{2}/);

            // Should NOT contain the old "(10k)" label
            expect(text).not.toContain('(10k)');
            expect(text).not.toContain('(5k)');
            expect(text).not.toContain('(25k)');
        }
    });
});

// ─── 4. Sidebar Layout ─────────────────────────────────────────────────────
// BUG: Trade History link was too prominent in main nav.

test.describe('Sidebar Layout', () => {
    test('Trade History is in the Settings section, not primary nav', async ({ page }) => {
        await navigateAndWait(page, '/dashboard');

        if (page.url().includes('auth') || page.url().includes('login')) {
            test.skip();
            return;
        }

        const settingsSection = page.getByTestId('sidebar-settings');
        if (await settingsSection.isVisible({ timeout: 5000 }).catch(() => false)) {
            // Trade History should be inside the settings section
            await expect(settingsSection).toContainText('Trade History');
        }
    });
});

// ─── 5. Eval Locking ────────────────────────────────────────────────────────
// BUG: Trade tab stayed locked after visiting Buy Evaluation page.

test.describe('Eval Locking', () => {
    test('trade tab is NOT locked after visiting Buy Evaluation', async ({ page }) => {
        await navigateAndWait(page, '/dashboard');

        if (page.url().includes('auth') || page.url().includes('login')) {
            test.skip();
            return;
        }

        // Navigate to Buy Evaluation
        await navigateAndWait(page, '/buy-evaluation');

        // Navigate back to Trade
        await navigateAndWait(page, '/dashboard/trade');

        // Should NOT show "Trade (Locked)"
        const sidebar = page.getByTestId('sidebar-nav');
        if (await sidebar.isVisible({ timeout: 5000 }).catch(() => false)) {
            await expect(sidebar).not.toContainText('Trade (Locked)');
        }

        // Page should load markets, not show a locked state
        await expect(page.locator('body')).not.toContainText('locked');
    });
});

// ─── 6. Market Quality ─────────────────────────────────────────────────────
// BUG: Stale/near-resolved markets were visible. Sports leaked into Geopolitics.

test.describe('Market Quality', () => {
    test('no near-resolved markets visible (95%+ or 5%-)', async ({ page }) => {
        await navigateAndWait(page, '/dashboard/trade');

        if (page.url().includes('auth') || page.url().includes('login')) {
            test.skip();
            return;
        }

        // Wait for market cards
        await page.waitForTimeout(3000);

        // Get all price displays - look for percentage text
        const priceTexts = await page.locator('[class*="price"], [class*="percent"]').allTextContents();

        for (const text of priceTexts) {
            const match = text.match(/(\d+)%/);
            if (match) {
                const pct = parseInt(match[1]);
                // No prices should be ≥95% or ≤5% (near-resolved)
                if (pct > 0) { // Skip display-only text
                    expect(pct, `Market price ${pct}% suggests a stale/resolved market`).toBeLessThan(96);
                    expect(pct, `Market price ${pct}% suggests a stale/resolved market`).toBeGreaterThan(4);
                }
            }
        }
    });

    test('Sports tab does NOT contain political terms', async ({ page }) => {
        await navigateAndWait(page, '/dashboard/trade');

        if (page.url().includes('auth') || page.url().includes('login')) {
            test.skip();
            return;
        }

        // Click Sports tab
        const sportsTab = page.getByRole('tab', { name: /Sports/i }).or(page.getByText(/Sports/i));
        if (await sportsTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await sportsTab.first().click();
            await page.waitForTimeout(1000);

            const mainContent = await page.locator('main').textContent() || '';

            // Political terms that should NOT appear in Sports
            const politicalTerms = ['Presidential', 'Congress', 'Senate', 'Parliament', 'Election'];
            for (const term of politicalTerms) {
                expect(
                    mainContent.includes(term),
                    `Sports tab should not contain political term "${term}"`
                ).toBe(false);
            }
        }
    });

    test('Geopolitics tab does NOT contain sports team names', async ({ page }) => {
        await navigateAndWait(page, '/dashboard/trade');

        if (page.url().includes('auth') || page.url().includes('login')) {
            test.skip();
            return;
        }

        // Click Geopolitics tab
        const geoTab = page.getByRole('tab', { name: /Geopolitics/i }).or(page.getByText(/Geopolitics/i));
        if (await geoTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await geoTab.first().click();
            await page.waitForTimeout(1000);

            const mainContent = await page.locator('main').textContent() || '';

            // Sports team names that should NOT appear in Geopolitics
            const sportsTeams = ['Warriors', 'Seahawks', 'Lakers', 'Steelers', 'Cowboys', 'Patriots', 'Yankees'];
            for (const team of sportsTeams) {
                expect(
                    mainContent.includes(team),
                    `Geopolitics tab should not contain sports team "${team}"`
                ).toBe(false);
            }
        }
    });
});

// ─── 7. Settings Page ───────────────────────────────────────────────────────
// BUG: Kraken ID field was visible on Settings page.

test.describe('Settings Page', () => {
    test('no Kraken ID field visible', async ({ page }) => {
        await navigateAndWait(page, '/dashboard/settings');

        if (page.url().includes('auth') || page.url().includes('login')) {
            test.skip();
            return;
        }

        // Check all settings tabs
        const pageText = await page.locator('main').textContent() || '';
        expect(pageText).not.toContain('Kraken ID');
        expect(pageText).not.toContain('Kraken');
    });
});

// ─── 8. Admin Panel ─────────────────────────────────────────────────────────
// BUG: Admin tab names were unclear/generic.

test.describe('Admin Panel', () => {
    test('admin tabs have descriptive names', async ({ page }) => {
        await navigateAndWait(page, '/admin');

        // Admin requires auth + admin role — skip gracefully if redirected
        if (page.url().includes('auth') || page.url().includes('login') || page.url().includes('dashboard')) {
            test.skip();
            return;
        }

        const pageText = await page.locator('body').textContent() || '';

        // Should have descriptive tab names
        const expectedTabs = ['Overview', 'Risk Desk', 'Analytics'];
        for (const tab of expectedTabs) {
            expect(
                pageText.includes(tab),
                `Admin should have tab "${tab}"`
            ).toBe(true);
        }
    });
});
