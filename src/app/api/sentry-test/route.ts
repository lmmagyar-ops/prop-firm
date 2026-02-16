import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

/**
 * Temporary route to verify Sentry is capturing events.
 * DELETE THIS FILE after confirming Sentry works.
 */
export async function GET() {
    const dsn = process.env.SENTRY_DSN;
    const publicDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

    const testError = new Error('Sentry verification test — deploy readiness check');
    Sentry.captureException(testError);

    // Wait up to 5 seconds for Sentry to flush events
    const flushed = await Sentry.flush(5000);

    return NextResponse.json({
        ok: true,
        message: 'Sentry test event sent',
        flushed,
        dsnPresent: !!dsn,
        publicDsnPresent: !!publicDsn,
        // Show first 20 chars of DSN to verify it's loaded (safe — not a secret)
        dsnPrefix: dsn?.substring(0, 20) || 'NOT SET',
        publicDsnPrefix: publicDsn?.substring(0, 20) || 'NOT SET',
    });
}
