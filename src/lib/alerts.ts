/**
 * Alert Utility
 * 
 * Send critical alerts to Slack and Sentry.
 * Use for production-critical events that need immediate attention.
 */

import * as Sentry from '@sentry/nextjs';
import { createLogger } from './logger';

const logger = createLogger('AlertService');

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'critical';

interface AlertOptions {
    severity: AlertSeverity;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    notifySlack?: boolean; // Default true for warnings and critical
}

// Base URL for internal webhook calls
const getBaseUrl = () => {
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    if (process.env.NEXT_PUBLIC_BASE_URL) {
        return process.env.NEXT_PUBLIC_BASE_URL;
    }
    return 'http://localhost:3000';
};

/**
 * Send a critical alert.
 * - Logs to Winston
 * - Captures in Sentry (for critical/warning)
 * - Sends to Slack (if configured)
 */
export async function sendAlert(options: AlertOptions): Promise<void> {
    const { severity, title, message, metadata = {}, notifySlack } = options;

    // Always log to Winston
    const logData = { title, ...metadata };

    switch (severity) {
        case 'critical':
            logger.error(message, null, logData);
            break;
        case 'warning':
            logger.warn(message, logData);
            break;
        default:
            logger.info(message, logData);
    }

    // Capture in Sentry for warnings and critical
    if (severity === 'critical' || severity === 'warning') {
        Sentry.captureMessage(`[${severity.toUpperCase()}] ${title}: ${message}`, {
            level: severity === 'critical' ? 'error' : 'warning',
            extra: metadata,
        });
    }

    // Send to Slack for critical (or if explicitly requested)
    const shouldNotifySlack = notifySlack ?? (severity === 'critical');
    if (shouldNotifySlack) {
        try {
            await sendSlackAlert(title, message, severity, metadata);
        } catch (error) {
            logger.error('Failed to send Slack alert', error);
        }
    }
}

/**
 * Send alert to Slack via internal webhook
 */
async function sendSlackAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    metadata: Record<string, unknown>
): Promise<void> {
    const baseUrl = getBaseUrl();

    // Map severity to alert type
    const typeMap: Record<AlertSeverity, string> = {
        critical: 'CRITICAL_ALERT',
        warning: 'WARNING_ALERT',
        info: 'INFO_ALERT',
    };

    await fetch(`${baseUrl}/api/webhooks/slack-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: typeMap[severity],
            data: {
                title,
                message,
                ...metadata,
                timestamp: new Date().toISOString(),
            },
        }),
    });
}

// Convenience functions for common alerts
export const alerts = {
    /**
     * Alert when ingestion worker is stale
     */
    ingestionStale: (lastHeartbeat: Date) => sendAlert({
        severity: 'critical',
        title: 'Ingestion Stale',
        message: `Market data ingestion has not updated since ${lastHeartbeat.toISOString()}`,
        metadata: { lastHeartbeat: lastHeartbeat.toISOString() },
    }),

    /**
     * Alert when a trade fails unexpectedly
     */
    tradeFailed: (userId: string, error: string, metadata?: Record<string, unknown>) => sendAlert({
        severity: 'warning',
        title: 'Trade Failed',
        message: `Trade failed for user ${userId}: ${error}`,
        metadata: { userId, error, ...metadata },
    }),

    /**
     * Alert when Redis connection is lost
     */
    redisConnectionLost: () => sendAlert({
        severity: 'critical',
        title: 'Redis Connection Lost',
        message: 'Lost connection to Redis. Trading engine may be degraded.',
    }),

    /**
     * Alert for payout requests (admin review needed)
     */
    payoutRequested: (userId: string, amount: number, challengeId: string) => sendAlert({
        severity: 'info',
        title: 'Payout Requested',
        message: `User ${userId} requested $${amount.toFixed(2)} payout`,
        metadata: { userId, amount, challengeId },
        notifySlack: true,
    }),

    /**
     * Alert when a challenge fails
     */
    challengeFailed: (userId: string, reason: string, challengeId: string) => sendAlert({
        severity: 'info',
        title: 'Challenge Failed',
        message: `Challenge ${challengeId} failed: ${reason}`,
        metadata: { userId, reason, challengeId },
        notifySlack: true,
    }),
};
