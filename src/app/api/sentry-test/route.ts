import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

/**
 * Temporary route to verify Sentry is capturing events.
 * DELETE THIS FILE after confirming Sentry works.
 */
export async function GET() {
    const dsn = process.env.SENTRY_DSN;
    const publicDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

    // Check if Sentry client is actually initialized
    const client = Sentry.getClient();
    const clientInitialized = !!client;
    const clientDsn = client?.getDsn()?.toString() ?? 'NO CLIENT';
    const transport = client?.getTransport() ? 'present' : 'missing';

    const testError = new Error('Sentry verification test — deploy readiness check');
    const eventId = Sentry.captureException(testError);

    // Increase flush timeout to 10s for cold-start serverless
    const flushed = await Sentry.flush(10000);

    return NextResponse.json({
        ok: true,
        message: 'Sentry test event sent',
        eventId,
        flushed,
        clientInitialized,
        clientDsn: clientDsn.substring(0, 30),
        transport,
        dsnPresent: !!dsn,
        publicDsnPresent: !!publicDsn,
        dsnPrefix: dsn?.substring(0, 20) || 'NOT SET',
        publicDsnPrefix: publicDsn?.substring(0, 20) || 'NOT SET',
        runtime: process.env.NEXT_RUNTIME || 'unknown',
    });
}
