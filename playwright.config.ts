import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for PropFirm.
 * 
 * Usage:
 *   npm run test:e2e              # Smoke tests only (Chromium, ~30s)
 *   npm run test:e2e:all          # Full suite, all browsers
 *   PLAYWRIGHT_BASE_URL=https://staging.example.com npm run test:e2e
 * 
 * Auth:
 *   E2E_USER_EMAIL=...  E2E_USER_PASSWORD=... npm run test:e2e
 *   If credentials are set, tests will run authenticated.
 *   If not, auth-gated tests will skip gracefully.
 */

const authFile = '.auth/user.json';

export default defineConfig({
    testDir: './e2e',

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,

    /* Opt out of parallel tests on CI */
    workers: process.env.CI ? 1 : undefined,

    /* Reporter to use */
    reporter: process.env.CI ? 'github' : 'html',

    /* Shared settings for all the projects below */
    use: {
        /* Base URL — defaults to localhost, override with PLAYWRIGHT_BASE_URL */
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

        /* Collect trace when retrying the failed test */
        trace: 'on-first-retry',

        /* Screenshot on failure */
        screenshot: 'only-on-failure',

        /* Vercel Deployment Protection bypass — required for staging previews
         * Set VERCEL_AUTOMATION_BYPASS_SECRET in Vercel Project Settings > Deployment Protection
         * Then pass it as an env var when running tests */
        ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
            ? {
                extraHTTPHeaders: {
                    'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
                },
            }
            : {}),
    },

    /* Default: Chromium-only for fast CI. Set PLAYWRIGHT_ALL_BROWSERS=true for full matrix. */
    projects: [
        // Auth setup — runs first, saves session for other projects
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
        },

        // Default: Chromium-only
        ...(process.env.PLAYWRIGHT_ALL_BROWSERS
            ? [
                {
                    name: 'chromium',
                    use: { ...devices['Desktop Chrome'], storageState: authFile },
                    dependencies: ['setup'],
                },
                {
                    name: 'firefox',
                    use: { ...devices['Desktop Firefox'], storageState: authFile },
                    dependencies: ['setup'],
                },
                {
                    name: 'webkit',
                    use: { ...devices['Desktop Safari'], storageState: authFile },
                    dependencies: ['setup'],
                },
                {
                    name: 'Mobile Chrome',
                    use: { ...devices['Pixel 5'], storageState: authFile },
                    dependencies: ['setup'],
                },
                {
                    name: 'Mobile Safari',
                    use: { ...devices['iPhone 12'], storageState: authFile },
                    dependencies: ['setup'],
                },
            ]
            : [
                {
                    name: 'chromium',
                    use: { ...devices['Desktop Chrome'], storageState: authFile },
                    dependencies: ['setup'],
                },
            ]),
    ],

    /* Run local dev server if no PLAYWRIGHT_BASE_URL is set */
    ...(process.env.PLAYWRIGHT_BASE_URL
        ? {}
        : {
            webServer: {
                command: 'npm run dev',
                url: 'http://localhost:3000',
                reuseExistingServer: true,
                timeout: 120 * 1000,
            },
        }),
});
