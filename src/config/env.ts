/**
 * Environment Validation Guard
 * 
 * Validates required environment variables at import time.
 * Fail-closed: the app crashes immediately if critical vars are missing,
 * rather than silently producing broken behavior downstream.
 * 
 * Tiered approach:
 * - REQUIRED: App throws on startup if missing (DATABASE_URL)
 * - WARNED: Logs a warning but doesn't crash (auth, email, payment, monitoring)
 * 
 * Skipped entirely when NODE_ENV=test or during `next build` phase so the
 * test suite and build process don't need every production env var configured.
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('EnvGuard');

// ─── Required: App MUST NOT start without these ─────────────────────
const REQUIRED_VARS = [
    'DATABASE_URL',
] as const;

// ─── Warned: Feature degradation, not fatal ─────────────────────────
const WARNED_VARS = [
    { name: 'RESEND_API_KEY', impact: 'Emails will not send' },
    { name: 'CONFIRMO_API_KEY', impact: 'Payment processing disabled — mock mode active' },
    { name: 'NEXT_PUBLIC_APP_URL', impact: 'URL fallbacks will be used for links' },
    { name: 'SENTRY_DSN', impact: 'Error tracking disabled' },
] as const;

/**
 * Run environment validation.
 * Exported for testing — in production, this runs automatically at import time (below).
 */
export function validateEnvironment(): { valid: boolean; missing: string[]; warnings: string[] } {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required vars
    for (const varName of REQUIRED_VARS) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    // Check warned vars
    for (const { name, impact } of WARNED_VARS) {
        if (!process.env[name]) {
            warnings.push(`${name}: ${impact}`);
        }
    }

    return { valid: missing.length === 0, missing, warnings };
}

// ─── Auto-validate on import (skip in test mode and build phase) ────
// During `next build`, server code is imported but runtime env vars
// may not be available yet.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
if (process.env.NODE_ENV !== 'test' && !isBuildPhase) {
    const result = validateEnvironment();

    // Log warnings (non-fatal)
    for (const warning of result.warnings) {
        logger.warn(`[EnvGuard] Missing optional: ${warning}`);
    }

    // Crash on missing required vars (fail-closed)
    if (!result.valid) {
        const msg = `FATAL: Missing required environment variables: ${result.missing.join(', ')}. ` +
            `The app cannot start without these. Check your .env.local or Vercel environment settings.`;
        logger.error(msg);
        throw new Error(msg);
    }

    logger.info(`[EnvGuard] ✓ All ${REQUIRED_VARS.length} required vars present` +
        (result.warnings.length > 0 ? ` (${result.warnings.length} optional missing)` : ''));
}
