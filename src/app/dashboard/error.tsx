'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    useEffect(() => {
        // Capture with context so Sentry tags it as "handled" with dashboard scope
        Sentry.captureException(error, {
            tags: { component: 'dashboard-error-boundary' },
            level: 'error',
        });
    }, [error]);

    // Human-friendly message — never expose Prisma internals to the user
    const isDbError = error.message?.toLowerCase().includes('failed to connect')
        || error.message?.toLowerCase().includes('upstream database')
        || error.message?.toLowerCase().includes('failed query');

    const userMessage = isDbError
        ? 'Our database is temporarily unreachable. This usually resolves in a few seconds.'
        : 'An unexpected error occurred.';

    return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white font-sans">
            <div className="text-center p-8 bg-zinc-900 border border-zinc-800 rounded-xl max-w-md">
                <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
                <p className="text-zinc-400 mb-4">{userMessage}</p>

                <button
                    onClick={reset}
                    className="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    Try again
                </button>

                {/* Debug details — collapsed, never shown by default */}
                <details className="mt-6 text-left">
                    <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400">
                        Technical details
                    </summary>
                    <div className="text-zinc-500 mt-2 font-mono text-xs bg-black/50 p-3 rounded border border-white/5 overflow-x-auto break-all">
                        {error.message}
                    </div>
                </details>
            </div>
        </div>
    );
}
