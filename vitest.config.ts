import { defineConfig } from 'vitest/config';
import path from 'path';

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
        ],
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
