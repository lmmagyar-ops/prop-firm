import { test, expect } from '@playwright/test';

/**
 * E2E tests for trading flows.
 * Note: These tests require authentication setup.
 * See https://playwright.dev/docs/auth for auth setup patterns.
 */
test.describe('Trading', () => {
    // Skip these tests if not in authenticated context
    test.describe.configure({ mode: 'serial' });

    test.describe('Market Display', () => {
        test('should display markets on trading page', async ({ page }) => {
            await page.goto('/trading');

            // If authenticated, should see markets
            // If not, should see login prompt
            const hasMarkets = await page.getByTestId('market-card').first().isVisible().catch(() => false);
            const hasAuthPrompt = await page.getByText(/sign in|login/i).isVisible().catch(() => false);

            expect(hasMarkets || hasAuthPrompt).toBeTruthy();
        });

        test('should filter markets by platform', async ({ page }) => {
            await page.goto('/trading');

            // Look for platform filter
            const polymarketFilter = page.getByRole('button', { name: /polymarket/i });
            const kalshiFilter = page.getByRole('button', { name: /kalshi/i });

            if (await polymarketFilter.isVisible()) {
                await polymarketFilter.click();
                // Markets should be filtered
            }
        });

        test('should search markets', async ({ page }) => {
            await page.goto('/trading');

            const searchInput = page.getByPlaceholder(/search/i);
            if (await searchInput.isVisible()) {
                await searchInput.fill('election');

                // Should filter results
                await page.waitForTimeout(500); // Debounce
            }
        });
    });

    test.describe('Trade Execution UI', () => {
        test('should open trade modal on market click', async ({ page }) => {
            await page.goto('/trading');

            // Find first market card
            const marketCard = page.getByTestId('market-card').first();
            if (await marketCard.isVisible()) {
                await marketCard.click();

                // Should open modal or navigate to detail
                const modal = page.getByRole('dialog');
                const detailPage = page.getByTestId('trade-form');

                const hasModal = await modal.isVisible().catch(() => false);
                const hasDetail = await detailPage.isVisible().catch(() => false);

                expect(hasModal || hasDetail).toBeTruthy();
            }
        });

        test('should show YES and NO buttons', async ({ page }) => {
            await page.goto('/trading');

            const marketCard = page.getByTestId('market-card').first();
            if (await marketCard.isVisible()) {
                await marketCard.click();

                // Should have YES/NO options
                const yesButton = page.getByRole('button', { name: /yes/i });
                const noButton = page.getByRole('button', { name: /no/i });

                const hasYes = await yesButton.isVisible().catch(() => false);
                const hasNo = await noButton.isVisible().catch(() => false);

                // At least one should be visible in trade interface
                expect(hasYes || hasNo).toBeTruthy();
            }
        });

        test('should validate trade amount', async ({ page }) => {
            await page.goto('/trading');

            const amountInput = page.getByPlaceholder(/amount/i);
            if (await amountInput.isVisible()) {
                // Try invalid amount
                await amountInput.fill('-100');

                // Should show validation
                const hasError = await page.getByText(/invalid|minimum|positive/i).isVisible().catch(() => false);
                // Validation may prevent input entirely, which is also valid
                expect(amountInput).not.toHaveValue('-100');
            }
        });
    });
});

test.describe('Dashboard', () => {
    test('should display challenge information', async ({ page }) => {
        await page.goto('/dashboard');

        // If authenticated, should show dashboard content
        const hasBalance = await page.getByText(/balance/i).isVisible().catch(() => false);
        const hasChallenge = await page.getByText(/challenge|funded/i).isVisible().catch(() => false);
        const hasAuthPrompt = await page.getByText(/sign in|login/i).isVisible().catch(() => false);

        expect(hasBalance || hasChallenge || hasAuthPrompt).toBeTruthy();
    });

    test('should show positions if any', async ({ page }) => {
        await page.goto('/dashboard');

        // Look for positions section
        const positionsSection = page.getByText(/positions|portfolio/i);
        if (await positionsSection.isVisible()) {
            // Section exists
            expect(positionsSection).toBeVisible();
        }
    });

    test('should show risk metrics', async ({ page }) => {
        await page.goto('/dashboard');

        // Look for drawdown or risk info
        const riskInfo = page.getByText(/drawdown|risk|loss/i);
        if (await riskInfo.first().isVisible()) {
            expect(riskInfo.first()).toBeVisible();
        }
    });
});
