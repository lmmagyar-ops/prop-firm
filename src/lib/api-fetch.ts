/**
 * apiFetch — Thin observability wrapper around fetch for client-side API calls.
 *
 * Logs 429 (rate limited) and 5xx responses with structured context.
 * Returns the Response unchanged — components still handle their own state.
 * This is purely instrumentation, not a centralized fetch replacement.
 *
 * Usage:
 *   const res = await apiFetch("/api/trade/positions");
 *   // same as fetch(), but 429s and 5xx are logged automatically
 */
import { createLogger } from '@/lib/logger';

const logger = createLogger('ApiFetch');

export async function apiFetch(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {
    const response = await fetch(input, init);
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (response.status === 429) {
        logger.error(`[apiFetch] 429 Rate Limited: ${init?.method ?? "GET"} ${url}`);
    } else if (response.status >= 500) {
        logger.error(`[apiFetch] ${response.status} Server Error: ${init?.method ?? "GET"} ${url}`);
    }

    return response;
}
