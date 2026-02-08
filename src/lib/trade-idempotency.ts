/**
 * Trade Idempotency Guard
 * 
 * Prevents duplicate trade executions when the client retries after a timeout.
 * Uses Redis SET NX (set-if-not-exists) with a 60-second TTL.
 * 
 * Flow:
 * 1. Client generates a UUID per trade button click
 * 2. Server checks Redis: SET trade:idem:{key} "pending" NX EX 60
 * 3. If key already exists → return cached result (or "in-progress" if still running)
 * 4. After execution, cache the response JSON under the same key
 */

import { getRedisClient } from "./redis-client";
import { createLogger } from "./logger";

const log = createLogger("TradeIdempotency");

const IDEM_PREFIX = "trade:idem:";
const IDEM_TTL_SECONDS = 60; // Keys expire after 60 seconds

export interface IdempotencyResult {
    isDuplicate: boolean;
    cachedResponse?: unknown; // The cached JSON response from a previous execution
}

/**
 * Check if a trade with this idempotency key has already been executed.
 * If not, claims the key in Redis so subsequent calls return isDuplicate: true.
 * 
 * @param idempotencyKey - Client-generated UUID (one per button click)
 * @returns { isDuplicate: false } if this is the first call, { isDuplicate: true, cachedResponse } if repeat
 */
export async function checkIdempotency(idempotencyKey: string): Promise<IdempotencyResult> {
    try {
        const redis = getRedisClient();
        const redisKey = `${IDEM_PREFIX}${idempotencyKey}`;

        // Try to claim the key (SET NX = set-if-not-exists)
        const claimed = await redis.set(redisKey, JSON.stringify({ status: "pending" }), "EX", IDEM_TTL_SECONDS, "NX");

        if (claimed === "OK") {
            // First request with this key — proceed with execution
            return { isDuplicate: false };
        }

        // Key already exists — this is a duplicate request
        const cached = await redis.get(redisKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (parsed.status === "pending") {
                    // The original request is still in-flight
                    log.warn(`Duplicate request while original still executing`, { idempotencyKey: idempotencyKey.slice(0, 8) });
                    return { isDuplicate: true, cachedResponse: { inProgress: true } };
                }
                // Original request completed — return cached response
                log.info(`Returning cached response for idempotency key`, { idempotencyKey: idempotencyKey.slice(0, 8) });
                return { isDuplicate: true, cachedResponse: parsed };
            } catch {
                // Corrupted cache — treat as non-duplicate to be safe
                return { isDuplicate: false };
            }
        }

        // Key exists but no data (shouldn't happen) — proceed
        return { isDuplicate: false };
    } catch (err) {
        // Redis failure should NOT block trades — log and proceed
        log.error("Redis idempotency check failed, proceeding without guard", err as Error);
        return { isDuplicate: false };
    }
}

/**
 * Cache the successful trade response under the idempotency key.
 * Called after trade execution completes.
 * 
 * @param idempotencyKey - The same key from checkIdempotency
 * @param response - The JSON response to cache
 */
export async function cacheIdempotencyResult(idempotencyKey: string, response: unknown): Promise<void> {
    try {
        const redis = getRedisClient();
        const redisKey = `${IDEM_PREFIX}${idempotencyKey}`;

        // Overwrite the "pending" value with the actual response, keeping same TTL
        await redis.set(redisKey, JSON.stringify(response), "EX", IDEM_TTL_SECONDS);
    } catch (err) {
        // Non-critical — worst case, a retry will re-execute (but row lock prevents actual double-spend)
        log.error("Failed to cache idempotency result", err as Error);
    }
}
