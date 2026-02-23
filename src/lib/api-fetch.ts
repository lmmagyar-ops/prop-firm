/**
 * apiFetch — Thin observability wrapper around fetch for client-side API calls.
 *
 * Adds a default 15s timeout to all calls to prevent infinite loading states
 * when the server hangs (DB lock, connection exhaustion, slow enrichment).
 * Logs 429 (rate limited) and 5xx responses with structured context.
 * Returns the Response unchanged — components still handle their own state.
 *
 * Usage:
 *   const res = await apiFetch("/api/trade/positions");
 *   // same as fetch(), but 429s and 5xx are logged, and hangs abort after 15s.
 *   // Pass timeoutMs=0 to disable timeout for specific long-running calls.
 */
import { createLogger } from '@/lib/logger';

const logger = createLogger('APIFetch');

const DEFAULT_TIMEOUT_MS = 15_000;

export async function apiFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // Wire up AbortController only when timeout is enabled
    const controller = timeoutMs > 0 ? new AbortController() : null;
    const timeoutId = controller
        ? setTimeout(() => {
            logger.error(`[apiFetch] Timeout after ${timeoutMs}ms: ${init?.method ?? "GET"} ${url}`);
            controller.abort();
        }, timeoutMs)
        : null;

    try {
        const response = await fetch(input, {
            ...init,
            // Caller-provided signal takes precedence; fall back to our timeout signal
            signal: init?.signal ?? controller?.signal,
        });

        if (response.status === 429) {
            logger.error(`[apiFetch] 429 Rate Limited: ${init?.method ?? "GET"} ${url}`);
        } else if (response.status >= 500) {
            logger.error(`[apiFetch] ${response.status} Server Error: ${init?.method ?? "GET"} ${url}`);
        }

        return response;
    } finally {
        if (timeoutId !== null) clearTimeout(timeoutId);
    }
}
