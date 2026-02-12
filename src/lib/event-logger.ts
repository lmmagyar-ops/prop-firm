/**
 * Event Logging System - Anthropic-Grade First-Party Analytics
 * 
 * Usage:
 *   await logEvent('page_view', userId, { page: '/dashboard' });
 *   await logEvent('trade_executed', userId, { marketId, amount, side });
 */

import { db } from '@/db';
import { activityLogs } from '@/db/schema';
import { headers } from 'next/headers';
import { createLogger } from '@/lib/logger';
const logger = createLogger('EventLogger');

// Event types for type safety
export type EventType =
    // Authentication  
    | 'login'
    | 'logout'
    | 'signup'
    | 'password_reset'
    | '2fa_enabled'
    | '2fa_disabled'
    // Navigation
    | 'page_view'
    // Trading
    | 'trade_executed'
    | 'trade_failed'
    | 'position_opened'
    | 'position_closed'
    // Challenge
    | 'challenge_started'
    | 'challenge_passed'
    | 'challenge_failed'
    // Payouts
    | 'payout_requested'
    | 'payout_approved'
    | 'payout_completed'
    // Settings
    | 'settings_updated'
    | 'profile_updated'
    // Admin
    | 'admin_action'
    // Errors
    | 'error'
    | 'api_error';

interface LogEventOptions {
    userId?: string | null;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Log an event to the database
 * Call this from server actions and API routes
 */
export async function logEvent(
    action: EventType,
    options: LogEventOptions = {}
): Promise<void> {
    try {
        // Get request headers if available (server-side)
        let ip = options.ipAddress;
        let ua = options.userAgent;

        try {
            const headersList = await headers();
            ip = ip || headersList.get('x-forwarded-for')?.split(',')[0] ||
                headersList.get('x-real-ip') ||
                'unknown';
            ua = ua || headersList.get('user-agent') || 'unknown';
        } catch {
            // Headers not available (e.g., called outside request context)
        }

        await db.insert(activityLogs).values({
            userId: options.userId || 'anonymous',
            action,
            ipAddress: ip?.slice(0, 45), // Truncate to fit varchar(45)
            userAgent: ua,
            metadata: options.metadata || {},
        });

        // Also log to console for Vercel Logs (structured JSON)
        logger.info(JSON.stringify({
            event: action,
            userId: options.userId,
            metadata: options.metadata,
            timestamp: new Date().toISOString(),
        }));

    } catch (error) {
        // Never let logging break the app
        logger.error('[EventLog] Failed to log event:', error);
    }
}

/**
 * Convenience wrapper for page views
 * Call from server components or layouts
 */
export async function logPageView(
    userId: string | null,
    page: string,
    metadata?: Record<string, unknown>
): Promise<void> {
    return logEvent('page_view', {
        userId,
        metadata: { page, ...metadata }
    });
}

/**
 * Log a trade execution
 */
export async function logTrade(
    userId: string,
    trade: {
        challengeId: string;
        marketId: string;
        side: 'YES' | 'NO';
        amount: number;
        success: boolean;
        error?: string;
    }
): Promise<void> {
    return logEvent(trade.success ? 'trade_executed' : 'trade_failed', {
        userId,
        metadata: trade
    });
}

/**
 * Log an error
 */
export async function logError(
    userId: string | null,
    error: Error | string,
    context?: Record<string, unknown>
): Promise<void> {
    return logEvent('error', {
        userId,
        metadata: {
            message: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            ...context
        }
    });
}
