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
 * Optional env vars:
 *   VERCEL_AUTOMATION_BYPASS_SECRET — Bypass Vercel Deployment Protection
 * 
 * Usage:
 *   E2E_USER_EMAIL=test@example.com E2E_USER_PASSWORD=secret npm run test:e2e
 */

const authFile = '.auth/user.json';

setup('authenticate', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

    if (!email || !password) {
        console.warn(
            '⚠️  E2E_USER_EMAIL and E2E_USER_PASSWORD not set — auth-gated tests will be skipped.'
        );
        // Create an empty auth file so Playwright doesn't crash
        fs.mkdirSync(path.dirname(authFile), { recursive: true });
        fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
        return;
    }

    // If Vercel Deployment Protection is enabled, we need to set the bypass cookie
    // BEFORE navigating. The extraHTTPHeaders approach doesn't survive redirects.
    if (bypassSecret) {
        const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
        const url = new URL(baseURL);
        await page.context().addCookies([{
            name: 'x-vercel-protection-bypass',
            value: bypassSecret,
            domain: url.hostname,
            path: '/',
        }]);
        console.warn('🔑 Vercel bypass cookie set for', url.hostname);
    }

    // Navigate to login page
    // NOTE: Using 'domcontentloaded' instead of 'networkidle' because the staging
    // site has persistent SSE connections (market price streams) that prevent
    // networkidle from ever resolving.
    const loginUrl = bypassSecret
        ? `/login?x-vercel-protection-bypass=${bypassSecret}`
        : '/login';
    await page.goto(loginUrl);
    await page.waitForLoadState('domcontentloaded');

    // Wait for login form to be ready
    await page.locator('#email').waitFor({ state: 'visible', timeout: 15000 });

    // Fill in credentials
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);

    // Click Sign In
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect to dashboard (successful login)
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Save the authenticated session
    await page.context().storageState({ path: authFile });
    console.warn('✅ Auth session saved to', authFile);
});
