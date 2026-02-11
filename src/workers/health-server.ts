/**
 * Health & Market Data Server for the Ingestion Worker
 * 
 * Serves two purposes:
 * 1. Health checks for Railway container monitoring
 * 2. Market data API — eliminates Vercel→Redis egress ($0.05/GB)
 * 
 * All Redis reads happen via Railway's free private networking.
 * Vercel fetches from this HTTP API instead of connecting to Redis directly.
 */

import http from 'http';
import type { Redis } from 'ioredis';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: number;
    workerId?: string;
    isLeader?: boolean;
    uptime?: number;
    redis?: 'connected' | 'disconnected' | 'reconnecting';
    reason?: string;
}

const startTime = Date.now();

// Simple URL router
function parseUrl(url: string): { path: string; params: URLSearchParams } {
    const [path, query] = (url || '/').split('?');
    return { path, params: new URLSearchParams(query || '') };
}

// CORS headers for cross-origin requests from Vercel
const CORS_HEADERS: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache',
};

function sendJson(res: http.ServerResponse, data: unknown, status = 200) {
    res.writeHead(status, CORS_HEADERS);
    res.end(JSON.stringify(data));
}

function sendError(res: http.ServerResponse, message: string, status = 500) {
    res.writeHead(status, CORS_HEADERS);
    res.end(JSON.stringify({ error: message }));
}

export function startHealthServer(
    redis: Redis,
    options: {
        port?: number;
        workerId?: string;
        isLeaderFn?: () => boolean;
    } = {}
): http.Server {
    const port = options.port ?? parseInt(process.env.HEALTH_PORT || '3001', 10);

    const server = http.createServer(async (req, res) => {
        const { path, params } = parseUrl(req.url || '/');

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204, CORS_HEADERS);
            res.end();
            return;
        }

        try {
            // ──────────────────────────────────────────────
            // HEALTH ENDPOINTS
            // ──────────────────────────────────────────────

            if (path === '/health' || path === '/') {
                const health: HealthStatus = {
                    status: 'healthy',
                    timestamp: Date.now(),
                    uptime: Math.floor((Date.now() - startTime) / 1000),
                    workerId: options.workerId,
                    isLeader: options.isLeaderFn?.(),
                };

                try {
                    const pingPromise = redis.ping();
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Redis ping timeout')), 2000)
                    );
                    await Promise.race([pingPromise, timeoutPromise]);
                    health.redis = 'connected';
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    health.status = 'degraded';
                    health.redis = 'reconnecting';
                    health.reason = message;
                    console.log('[Health] Degraded mode - Redis reconnecting:', message);
                }

                // Always return 200 — Railway restarts on 503
                sendJson(res, health);
                return;
            }

            if (path === '/ready') {
                const isLeader = options.isLeaderFn?.() ?? true;
                if (isLeader) {
                    res.writeHead(200);
                    res.end('READY');
                } else {
                    res.writeHead(503);
                    res.end('STANDBY');
                }
                return;
            }

            // ──────────────────────────────────────────────
            // MARKET DATA ENDPOINTS (replaces Vercel→Redis)
            // ──────────────────────────────────────────────

            // GET /prices — Compact price map for SSE streaming
            if (path === '/prices') {
                const [kalshiData, polyData] = await Promise.all([
                    redis.get('kalshi:active_list'),
                    redis.get('event:active_list'),
                ]);

                const prices: Record<string, { price: string; title?: string }> = {};

                if (kalshiData) {
                    try {
                        const events = JSON.parse(kalshiData);
                        for (const event of events) {
                            for (const market of event.markets || []) {
                                prices[market.id] = {
                                    price: market.price?.toString() || "0.50",
                                    title: market.question || event.title,
                                };
                            }
                        }
                    } catch { /* ignore parse errors */ }
                }

                if (polyData) {
                    try {
                        const events = JSON.parse(polyData);
                        for (const event of events) {
                            for (const market of event.markets || []) {
                                prices[market.id] = {
                                    price: market.price?.toString() || "0.50",
                                    title: market.question || event.title,
                                };
                            }
                        }
                    } catch { /* ignore parse errors */ }
                }

                sendJson(res, { prices, timestamp: Date.now(), count: Object.keys(prices).length });
                return;
            }

            // GET /markets — Full market lists (replaces actions/market.ts Redis reads)
            if (path === '/markets') {
                const key = params.get('key');

                // Single key request
                if (key) {
                    const data = await redis.get(key);
                    sendJson(res, { data: data ? JSON.parse(data) : null, timestamp: Date.now() });
                    return;
                }

                // Full market data dump (all 3 lists)
                const [marketData, eventData, kalshiData, livePrices] = await Promise.all([
                    redis.get('market:active_list'),
                    redis.get('event:active_list'),
                    redis.get('kalshi:active_list'),
                    redis.get('market:prices:all'),
                ]);

                sendJson(res, {
                    markets: marketData ? JSON.parse(marketData) : [],
                    events: eventData ? JSON.parse(eventData) : [],
                    kalshi: kalshiData ? JSON.parse(kalshiData) : [],
                    livePrices: livePrices ? JSON.parse(livePrices) : {},
                    timestamp: Date.now(),
                });
                return;
            }

            // GET /orderbooks — Order book data
            if (path === '/orderbooks') {
                const data = await redis.get('market:orderbooks');
                sendJson(res, {
                    orderbooks: data ? JSON.parse(data) : {},
                    timestamp: Date.now(),
                });
                return;
            }

            // GET /orderbook/:assetId — Single order book
            if (path.startsWith('/orderbook/')) {
                const assetId = path.split('/')[2];
                if (!assetId) {
                    sendError(res, 'Missing asset ID', 400);
                    return;
                }
                const data = await redis.get('market:orderbooks');
                const books = data ? JSON.parse(data) : {};
                const book = books[assetId] || null;
                sendJson(res, { orderbook: book, assetId, timestamp: Date.now() });
                return;
            }

            // GET /heartbeat — Worker heartbeat data (for cron/heartbeat-check)
            if (path === '/heartbeat') {
                const raw = await redis.get('ingestion:heartbeat');
                if (!raw) {
                    sendJson(res, { heartbeat: null, timestamp: Date.now() });
                    return;
                }
                sendJson(res, { heartbeat: JSON.parse(raw), timestamp: Date.now() });
                return;
            }

            // GET /ingestion-health — Full ingestion health status
            if (path === '/ingestion-health') {
                const [polyData, kalshiData, leaderKey, lastPolyUpdate, lastKalshiUpdate] = await Promise.all([
                    redis.get('event:active_list'),
                    redis.get('kalshi:market_list'),
                    redis.get('ingestion:leader'),
                    redis.get('event:last_update'),
                    redis.get('kalshi:last_update'),
                ]);

                let polymarketCount = 0;
                let kalshiCount = 0;

                if (polyData) {
                    const events = JSON.parse(polyData);
                    for (const event of events) {
                        polymarketCount += event.markets?.length || 0;
                    }
                }

                if (kalshiData) {
                    const markets = JSON.parse(kalshiData);
                    kalshiCount = Array.isArray(markets) ? markets.length : 0;
                }

                sendJson(res, {
                    status: polymarketCount + kalshiCount > 0
                        ? (polymarketCount === 0 || kalshiCount === 0 ? 'degraded' : 'healthy')
                        : 'down',
                    lastPolymarketUpdate: lastPolyUpdate || null,
                    lastKalshiUpdate: lastKalshiUpdate || null,
                    polymarketCount,
                    kalshiCount,
                    workerStatus: leaderKey ? 'active' : 'unknown',
                    updatedAt: new Date().toISOString(),
                });
                return;
            }

            // GET /complements/:tokenId — Market complement lookup
            if (path.startsWith('/complements/')) {
                const tokenId = path.split('/')[2];
                if (!tokenId) {
                    sendError(res, 'Missing token ID', 400);
                    return;
                }
                const complement = await redis.hget('market:complements', tokenId);
                sendJson(res, { complement, tokenId, timestamp: Date.now() });
                return;
            }

            // ──────────────────────────────────────────────
            // WRITE ENDPOINTS (replaces Vercel→Redis writes)
            // ──────────────────────────────────────────────

            // POST /admin-event — Receive admin events (replaces Redis pub/sub)
            if (path === '/admin-event' && req.method === 'POST') {
                const body = await readBody(req);
                if (!body) {
                    sendError(res, 'Invalid body', 400);
                    return;
                }
                const { type, data } = JSON.parse(body);
                await redis.publish('admin:events', JSON.stringify({ type, data }));
                sendJson(res, { published: true, type, timestamp: Date.now() });
                return;
            }

            // POST /force-sync — Write market data to Redis (emergency admin bypass)
            if (path === '/force-sync' && req.method === 'POST') {
                const body = await readBody(req);
                if (!body) {
                    sendError(res, 'Invalid body', 400);
                    return;
                }
                const { key, value, ttl } = JSON.parse(body);
                if (!key || value === undefined) {
                    sendError(res, 'Missing key or value', 400);
                    return;
                }
                if (ttl) {
                    await redis.set(key, typeof value === 'string' ? value : JSON.stringify(value), 'EX', ttl);
                } else {
                    await redis.set(key, typeof value === 'string' ? value : JSON.stringify(value));
                }
                sendJson(res, { written: true, key, timestamp: Date.now() });
                return;
            }

            // ──────────────────────────────────────────────
            // GENERIC KEY-VALUE ENDPOINTS (replaces remaining Redis consumers)
            // Used by: rate-limiter, trade-idempotency, polymarket-oracle
            // ──────────────────────────────────────────────

            // POST /kv/get — Read one or more keys
            if (path === '/kv/get' && req.method === 'POST') {
                const body = await readBody(req);
                if (!body) { sendError(res, 'Invalid body', 400); return; }
                const { key, keys } = JSON.parse(body);

                if (keys && Array.isArray(keys)) {
                    // Multi-key get
                    const pipeline = redis.pipeline();
                    for (const k of keys) pipeline.get(k);
                    const results = await pipeline.exec();
                    const values: Record<string, string | null> = {};
                    keys.forEach((k: string, i: number) => {
                        values[k] = results?.[i]?.[1] as string | null;
                    });
                    sendJson(res, { values, timestamp: Date.now() });
                } else if (key) {
                    const value = await redis.get(key);
                    sendJson(res, { value, key, timestamp: Date.now() });
                } else {
                    sendError(res, 'Missing key or keys', 400);
                }
                return;
            }

            // POST /kv/set — Write a key with optional TTL
            if (path === '/kv/set' && req.method === 'POST') {
                const body = await readBody(req);
                if (!body) { sendError(res, 'Invalid body', 400); return; }
                const { key, value, ttl } = JSON.parse(body);
                if (!key || value === undefined) { sendError(res, 'Missing key or value', 400); return; }

                if (ttl) {
                    await redis.setex(key, ttl, typeof value === 'string' ? value : JSON.stringify(value));
                } else {
                    await redis.set(key, typeof value === 'string' ? value : JSON.stringify(value));
                }
                sendJson(res, { written: true, key, timestamp: Date.now() });
                return;
            }

            // POST /kv/setnx — Atomic set-if-not-exists (for locks/idempotency)
            if (path === '/kv/setnx' && req.method === 'POST') {
                const body = await readBody(req);
                if (!body) { sendError(res, 'Invalid body', 400); return; }
                const { key, value, ttl } = JSON.parse(body);
                if (!key) { sendError(res, 'Missing key', 400); return; }

                // Use SET with NX and EX for atomic lock acquisition
                const result = await redis.set(
                    key,
                    typeof value === 'string' ? value : JSON.stringify(value || 'locked'),
                    'EX', ttl || 30,
                    'NX'
                );
                sendJson(res, { acquired: result === 'OK', key, timestamp: Date.now() });
                return;
            }

            // POST /kv/del — Delete one or more keys
            if (path === '/kv/del' && req.method === 'POST') {
                const body = await readBody(req);
                if (!body) { sendError(res, 'Invalid body', 400); return; }
                const { key, keys } = JSON.parse(body);

                if (keys && Array.isArray(keys)) {
                    const count = await redis.del(...keys);
                    sendJson(res, { deleted: count, timestamp: Date.now() });
                } else if (key) {
                    const count = await redis.del(key);
                    sendJson(res, { deleted: count, key, timestamp: Date.now() });
                } else {
                    sendError(res, 'Missing key or keys', 400);
                }
                return;
            }

            // POST /kv/incr — Atomic increment (for rate limiting)
            if (path === '/kv/incr' && req.method === 'POST') {
                const body = await readBody(req);
                if (!body) { sendError(res, 'Invalid body', 400); return; }
                const { key, ttl } = JSON.parse(body);
                if (!key) { sendError(res, 'Missing key', 400); return; }

                const pipeline = redis.pipeline();
                pipeline.incr(key);
                if (ttl) pipeline.expire(key, ttl);
                const results = await pipeline.exec();
                const count = results?.[0]?.[1] as number || 0;
                sendJson(res, { count, key, timestamp: Date.now() });
                return;
            }

            // 404 for all other paths
            sendError(res, 'Not Found', 404);

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[API] Error on ${path}:`, message);
            sendError(res, message, 500);
        }
    });

    server.on('error', (err) => {
        console.error('[Health] Server error:', err.message);
    });

    server.listen(port, () => {
        console.log(`[Health] Server listening on port ${port}`);
    });

    return server;
}

// Helper to read request body
function readBody(req: http.IncomingMessage): Promise<string | null> {
    return new Promise((resolve) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            if (chunks.length === 0) { resolve(null); return; }
            resolve(Buffer.concat(chunks).toString());
        });
        req.on('error', () => resolve(null));
    });
}
