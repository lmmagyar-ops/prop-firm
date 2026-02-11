import { MarketCacheService } from "./market-cache-service";

/**
 * Worker HTTP Client
 * 
 * Centralized HTTP client for the ingestion-worker's market data API.
 * Replaces ALL direct Redis connections from the Vercel app.
 * 
 * Architecture: Vercel → Worker HTTP (public) → Redis (private, free)
 * 
 * This eliminates $87/month in Railway egress charges from the Redis TCP proxy.
 */

// Read lazily so test scripts can set INGESTION_WORKER_URL after import
function getWorkerUrl(): string {
    return process.env.INGESTION_WORKER_URL || 'https://ingestion-worker-production.up.railway.app';
}
const TIMEOUT_MS = 5000;

// In-memory cache for market data (avoid hammering the worker)
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 3000; // 3 seconds — matches SSE poll interval

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() });
}

async function workerFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
    try {
        const res = await fetch(`${getWorkerUrl()}${path}`, {
            ...options,
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: 'no-store' as RequestCache,
            headers: {
                'Content-Type': 'application/json',
                ...(options?.headers || {}),
            },
        });

        if (!res.ok) {
            console.error(`[WorkerClient] ${path} returned ${res.status}`);
            return null;
        }

        return await res.json() as T;
    } catch (err) {
        console.error(`[WorkerClient] ${path} failed:`, err instanceof Error ? err.message : err);
        return null;
    }
}

// ──────────────────────────────────────────────
// MARKET DATA (replaces actions/market.ts Redis reads)
// ──────────────────────────────────────────────

export interface AllMarketData {
    markets: unknown[];   // market:active_list
    events: unknown[];    // event:active_list (Polymarket)
    kalshi: unknown[];    // kalshi:active_list
    livePrices: Record<string, { price?: string }>;  // market:prices:all
    timestamp: number;
}

/**
 * Fetch all market lists in a single HTTP call.
 * Replaces 4+ individual redis.get() calls in actions/market.ts.
 * 
 * EXCHANGE HALT: Write-through to Postgres on success.
 * On worker failure, falls back to Postgres cache.
 */
export async function getAllMarketData(): Promise<AllMarketData | null> {
    const cached = getCached<AllMarketData>('markets');
    if (cached) return cached;

    const data = await workerFetch<AllMarketData>('/markets');
    if (data) {
        setCache('markets', data);
        // Write-through to Postgres (fire-and-forget, non-blocking)
        MarketCacheService.saveSnapshot(data).catch(() => { });
        return data;
    }

    // Worker unreachable — fall back to Postgres cache
    const snapshot = await MarketCacheService.getSnapshot();
    if (snapshot) {
        const staleData = snapshot.markets as AllMarketData;
        // Tag as stale so the UI can show a banner
        if (staleData && typeof staleData === 'object') {
            (staleData as unknown as Record<string, unknown>)._stale = true;
            (staleData as unknown as Record<string, unknown>)._cachedAt = snapshot.capturedAt.toISOString();
        }
        return staleData;
    }

    return null;
}

/**
 * Fetch a single Redis key's data.
 */
export async function getMarketKey(key: string): Promise<unknown | null> {
    const data = await workerFetch<{ data: unknown }>(`/markets?key=${encodeURIComponent(key)}`);
    return data?.data ?? null;
}

// ──────────────────────────────────────────────
// PRICES (replaces market.ts Redis reads)
// ──────────────────────────────────────────────

export interface PriceData {
    prices: Record<string, { price: string; title?: string }>;
    timestamp: number;
    count: number;
}

/**
 * Fetch compact price map (SSE streaming + price lookups).
 */
export async function getPrices(): Promise<PriceData | null> {
    const cached = getCached<PriceData>('prices');
    if (cached) return cached;

    const data = await workerFetch<PriceData>('/prices');
    if (data) setCache('prices', data);
    return data;
}

// ──────────────────────────────────────────────
// ORDER BOOKS
// ──────────────────────────────────────────────

interface OrderBooksData {
    orderbooks: Record<string, { bids: { price: string; size: string }[]; asks: { price: string; size: string }[] }>;
    timestamp: number;
}

/**
 * Fetch all order books in a single call.
 */
export async function getAllOrderBooks(): Promise<Record<string, unknown> | null> {
    const cached = getCached<OrderBooksData>('orderbooks');
    if (cached) return cached.orderbooks;

    const data = await workerFetch<OrderBooksData>('/orderbooks');
    if (data) {
        setCache('orderbooks', data);
        return data.orderbooks;
    }
    return null;
}

/**
 * Fetch a single order book.
 */
export async function getOrderBook(assetId: string): Promise<unknown | null> {
    const data = await workerFetch<{ orderbook: unknown }>(`/orderbook/${encodeURIComponent(assetId)}`);
    return data?.orderbook ?? null;
}

// ──────────────────────────────────────────────
// COMPLEMENT TOKENS
// ──────────────────────────────────────────────

/**
 * Look up the complement (NO) token for a YES token.
 */
export async function getComplement(tokenId: string): Promise<string | null> {
    const data = await workerFetch<{ complement: string | null }>(`/complements/${encodeURIComponent(tokenId)}`);
    return data?.complement ?? null;
}

// ──────────────────────────────────────────────
// HEARTBEAT & HEALTH
// ──────────────────────────────────────────────

/**
 * Fetch worker heartbeat data (for cron/heartbeat-check).
 */
export async function getHeartbeat(): Promise<unknown | null> {
    const data = await workerFetch<{ heartbeat: unknown }>('/heartbeat');
    return data?.heartbeat ?? null;
}

/**
 * Fetch full ingestion health status.
 */
export async function getIngestionHealth(): Promise<unknown | null> {
    return workerFetch('/ingestion-health');
}

// ──────────────────────────────────────────────
// WRITE OPERATIONS (replaces Redis pub/sub & writes)
// ──────────────────────────────────────────────

/**
 * Publish an admin event (replaces Redis pub/sub).
 */
export async function publishAdminEvent(type: string, data: Record<string, unknown>): Promise<boolean> {
    const result = await workerFetch<{ published: boolean }>('/admin-event', {
        method: 'POST',
        body: JSON.stringify({ type, data }),
    });
    return result?.published ?? false;
}

/**
 * Force-write to Redis via the worker (admin emergency bypass).
 */
export async function forceSync(key: string, value: unknown, ttl?: number): Promise<boolean> {
    const result = await workerFetch<{ written: boolean }>('/force-sync', {
        method: 'POST',
        body: JSON.stringify({ key, value, ttl }),
    });
    return result?.written ?? false;
}

// ──────────────────────────────────────────────
// GENERIC KEY-VALUE OPERATIONS
// Used by: rate-limiter, trade-idempotency, polymarket-oracle
// ──────────────────────────────────────────────

/**
 * Read a single Redis key.
 */
export async function kvGet(key: string): Promise<string | null> {
    const result = await workerFetch<{ value: string | null }>('/kv/get', {
        method: 'POST',
        body: JSON.stringify({ key }),
    });
    return result?.value ?? null;
}

/**
 * Write a Redis key with optional TTL (seconds).
 */
export async function kvSet(key: string, value: string, ttl?: number): Promise<boolean> {
    const result = await workerFetch<{ written: boolean }>('/kv/set', {
        method: 'POST',
        body: JSON.stringify({ key, value, ttl }),
    });
    return result?.written ?? false;
}

/**
 * Atomic set-if-not-exists with TTL (for distributed locks).
 * Returns true if the lock was acquired, false if it was already held.
 */
export async function kvSetNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await workerFetch<{ acquired: boolean }>('/kv/setnx', {
        method: 'POST',
        body: JSON.stringify({ key, value, ttl: ttlSeconds }),
    });
    if (result === null) {
        throw new Error('[WorkerClient] kvSetNx failed — worker unreachable');
    }
    return result.acquired;
}

/**
 * Delete a Redis key.
 */
export async function kvDel(key: string): Promise<boolean> {
    const result = await workerFetch<{ deleted: number }>('/kv/del', {
        method: 'POST',
        body: JSON.stringify({ key }),
    });
    return (result?.deleted ?? 0) > 0;
}

/**
 * Atomic increment with optional TTL (for rate limiting).
 * Returns the new count after increment.
 */
export async function kvIncr(key: string, ttlSeconds?: number): Promise<number> {
    const result = await workerFetch<{ count: number }>('/kv/incr', {
        method: 'POST',
        body: JSON.stringify({ key, ttl: ttlSeconds }),
    });
    if (result === null) {
        throw new Error('[WorkerClient] kvIncr failed — worker unreachable');
    }
    return result.count;
}

