import { defineConfig } from 'vitest/config';
import path from 'path';

// Detect CI environment (GitHub Actions, etc.)
const isCI = process.env.CI === 'true';

export default defineConfig({
    test: {
        globals: true,
        include: [
            'tests/**/*.test.ts',      // New prop firm tests
            'tests/**/*.test.tsx',
            'src/**/*.test.ts',        // Opus's trading engine tests
            'src/**/*.test.tsx',
        ],
        exclude: [
            'node_modules/**',
            '.next/**',
            'e2e/**',  // Playwright tests - run via npx playwright test
            // In CI: Skip heavy simulation tests (run locally or in nightly job)
            ...(isCI ? ['tests/simulation/**'] : []),
        ],
        // Reasonable timeout for CI (increased for position limit tests)
        testTimeout: isCI ? 120000 : 60000,
        hookTimeout: isCI ? 30000 : 30000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            exclude: [
                'node_modules/',
                '*.config.*',
                'src/components/ui/**',
                '.next/**',
                'drizzle/**',
                'e2e/**'
            ]
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
