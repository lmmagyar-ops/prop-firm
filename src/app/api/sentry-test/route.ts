import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

/**
 * Temporary route to verify Sentry is capturing events.
 * DELETE THIS FILE after confirming Sentry works.
 */
export async function GET() {
    const testError = new Error('Sentry verification test — deploy readiness check');
    Sentry.captureException(testError);
    await Sentry.flush(2000);
    return NextResponse.json({ ok: true, message: 'Sentry test event sent' });
}
