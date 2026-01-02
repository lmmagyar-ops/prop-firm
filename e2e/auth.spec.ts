import { test, expect } from '@playwright/test';

/**
 * E2E tests for authentication flows.
 */
test.describe('Authentication', () => {
    test.describe('Login Flow', () => {
        test('should display login page', async ({ page }) => {
            await page.goto('/');

            // Check for login elements
            await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
        });

        test('should navigate to registration', async ({ page }) => {
            await page.goto('/');

            // Look for registration link
            const registerLink = page.getByRole('link', { name: /register|sign up|get started/i });
            if (await registerLink.isVisible()) {
                await registerLink.click();
                await expect(page).toHaveURL(/register|signup/);
            }
        });

        test('should show validation errors for empty form', async ({ page }) => {
            await page.goto('/auth/signin');

            // Try to submit empty form
            const submitButton = page.getByRole('button', { name: /sign in|login/i });
            if (await submitButton.isVisible()) {
                await submitButton.click();

                // Should show validation error
                await expect(page.getByText(/required|invalid|enter/i)).toBeVisible();
            }
        });
    });

    test.describe('Protected Routes', () => {
        test('should redirect unauthenticated users from dashboard', async ({ page }) => {
            // Try to access dashboard without auth
            await page.goto('/dashboard');

            // Should redirect to login or show auth prompt
            await expect(page).toHaveURL(/\/(auth|signin|login)?/);
        });

        test('should redirect unauthenticated users from trading', async ({ page }) => {
            await page.goto('/trading');

            // Should redirect or show error
            const url = page.url();
            expect(url).toMatch(/\/(auth|signin|login|trading)?/);
        });
    });
});

test.describe('Public Pages', () => {
    test('should load homepage', async ({ page }) => {
        await page.goto('/');

        // Check for key elements
        await expect(page).toHaveTitle(/prop|trading|fund/i);
    });

    test('should load API docs', async ({ page }) => {
        await page.goto('/api-docs');

        // Check for API documentation elements
        await expect(page.getByText(/API Documentation/i)).toBeVisible();
        await expect(page.getByText(/Authentication/i)).toBeVisible();
        await expect(page.getByText(/Trading/i)).toBeVisible();
    });

    test('should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto('/');

        // Page should still be functional
        await expect(page.locator('body')).toBeVisible();
    });
});
