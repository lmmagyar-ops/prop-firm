/**
 * Runtime Invariant Assertions
 * 
 * Catches "impossible" states early — at the source, not the symptom.
 * 
 * - **Dev:** Throws immediately (fail-fast, loud)
 * - **Prod:** Logs to Winston + captures in Sentry with full context, does NOT crash
 * 
 * Usage:
 *   invariant(equity >= 0, "Negative equity", { userId, equity, cashBalance });
 *   invariant(!isNaN(pnl), "PnL is NaN", { challengeId });
 */

import * as Sentry from '@sentry/nextjs';
import { createLogger } from './logger';

const logger = createLogger('Invariant');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Assert a runtime invariant. If the condition is false:
 * - In development: throws an error (fail-fast)
 * - In production: logs error + reports to Sentry (no crash)
 * 
 * @param condition - The condition that must be true
 * @param message - Human-readable description of what went wrong
 * @param context - Optional metadata (userId, challengeId, values, etc.)
 */
export function invariant(
    condition: boolean,
    message: string,
    context?: Record<string, unknown>,
): asserts condition {
    if (condition) return;

    const fullMessage = `INVARIANT VIOLATION: ${message}`;

    if (IS_PRODUCTION) {
        // Production: log + report, don't crash
        logger.error(fullMessage, null, {
            ...context,
            invariant: true,
        });

        Sentry.captureMessage(fullMessage, {
            level: 'error',
            extra: context,
            tags: { type: 'invariant_violation' },
        });
    } else {
        // Development: fail loud and fast
        const error = new Error(fullMessage);
        logger.error(fullMessage, error, context);
        throw error;
    }
}

/**
 * Soft invariant — warns but never throws, even in dev.
 * Use for "this shouldn't happen but isn't catastrophic" cases.
 * 
 * Usage:
 *   softInvariant(price > 0, "Zero price from order book", { marketId });
 */
export function softInvariant(
    condition: boolean,
    message: string,
    context?: Record<string, unknown>,
): void {
    if (condition) return;

    const fullMessage = `SOFT INVARIANT: ${message}`;

    logger.warn(fullMessage, {
        ...context,
        invariant: true,
    });

    Sentry.captureMessage(fullMessage, {
        level: 'warning',
        extra: context,
        tags: { type: 'soft_invariant' },
    });
}
