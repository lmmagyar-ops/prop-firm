/**
 * Environment Validation Guard — Behavioral Tests
 *
 * Tests what the guard DOES (crashes or warns), not how it's wired.
 * 
 * Pattern: Override process.env per-test, call validateEnvironment(),
 * assert on the returned { valid, missing, warnings } shape.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We import only the pure function — the auto-run block is skipped in test mode.
import { validateEnvironment } from '@/config/env';

describe('Environment Validation Guard', () => {
    const ORIGINAL_ENV = { ...process.env };

    beforeEach(() => {
        // Start each test with a clean slate
        vi.unstubAllEnvs();
    });

    afterEach(() => {
        // Restore original env
        process.env = { ...ORIGINAL_ENV };
    });

    // ─── Required vars ──────────────────────────────────────────────

    it('reports missing when DATABASE_URL is absent', () => {
        delete process.env.DATABASE_URL;

        const result = validateEnvironment();

        expect(result.valid).toBe(false);
        expect(result.missing).toContain('DATABASE_URL');
    });

    it('reports valid when all required vars are set', () => {
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

        const result = validateEnvironment();

        expect(result.valid).toBe(true);
        expect(result.missing).toHaveLength(0);
    });

    it('reports valid even if only required vars are set (warned vars optional)', () => {
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
        // Intentionally NOT setting RESEND_API_KEY, CONFIRMO_API_KEY, etc.

        const result = validateEnvironment();

        expect(result.valid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    // ─── Warned vars ────────────────────────────────────────────────

    it('warns but does not invalidate when RESEND_API_KEY is missing', () => {
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
        delete process.env.RESEND_API_KEY;

        const result = validateEnvironment();

        expect(result.valid).toBe(true);
        expect(result.warnings.some(w => w.includes('RESEND_API_KEY'))).toBe(true);
    });

    it('warns about CONFIRMO_API_KEY with correct impact message', () => {
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
        delete process.env.CONFIRMO_API_KEY;

        const result = validateEnvironment();

        expect(result.valid).toBe(true);
        expect(result.warnings.some(w => w.includes('mock mode'))).toBe(true);
    });

    // ─── Zero warnings when everything is set ───────────────────────

    it('produces zero warnings when all vars are set', () => {
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
        process.env.RESEND_API_KEY = 're_test123';
        process.env.CONFIRMO_API_KEY = 'confirmo_test';
        process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
        process.env.SENTRY_DSN = 'https://sentry.io/test';

        const result = validateEnvironment();

        expect(result.valid).toBe(true);
        expect(result.missing).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });

});
