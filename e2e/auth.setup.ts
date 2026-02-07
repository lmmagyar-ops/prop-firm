import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Auth Setup — Runs once before all tests that need authentication.
 * 
 * Logs in via the /login page and saves the browser session to a file.
 * All subsequent tests reuse this session without logging in again.
 * 
 * Required env vars:
 *   E2E_USER_EMAIL    — Test account email
 *   E2E_USER_PASSWORD — Test account password
 * 
 * Usage:
 *   E2E_USER_EMAIL=test@example.com E2E_USER_PASSWORD=secret npm run test:e2e
 */

const authFile = '.auth/user.json';

setup('authenticate', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
        console.warn(
            '⚠️  E2E_USER_EMAIL and E2E_USER_PASSWORD not set — auth-gated tests will be skipped.'
        );
        // Create an empty auth file so Playwright doesn't crash
        fs.mkdirSync(path.dirname(authFile), { recursive: true });
        fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
        return;
    }

    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill in credentials
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);

    // Click Sign In
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect to dashboard (successful login)
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Save the authenticated session
    await page.context().storageState({ path: authFile });
    console.log('✅ Auth session saved to', authFile);
});
