/**
 * Health Server for Railway Health Checks
 * 
 * Minimal HTTP server that exposes a /health endpoint for Railway's
 * container health monitoring. Returns 503 if Redis is unreachable.
 */

import http from 'http';
import type { Redis } from 'ioredis';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: number;
    workerId?: string;
    isLeader?: boolean;
    uptime?: number;
    redis?: 'connected' | 'disconnected';
    reason?: string;
}

const startTime = Date.now();

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
        // Health check endpoint
        if (req.url === '/health' || req.url === '/') {
            const health: HealthStatus = {
                status: 'healthy',
                timestamp: Date.now(),
                uptime: Math.floor((Date.now() - startTime) / 1000),
                workerId: options.workerId,
                isLeader: options.isLeaderFn?.(),
            };

            try {
                // Verify Redis connectivity with timeout
                const pingPromise = redis.ping();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Redis ping timeout')), 5000)
                );

                await Promise.race([pingPromise, timeoutPromise]);
                health.redis = 'connected';

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(health));
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                health.status = 'unhealthy';
                health.redis = 'disconnected';
                health.reason = message;

                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(health));
            }
            return;
        }

        // Readiness endpoint (for Kubernetes-style probes)
        if (req.url === '/ready') {
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

        // 404 for all other paths
        res.writeHead(404);
        res.end('Not Found');
    });

    server.on('error', (err) => {
        console.error('[Health] Server error:', err.message);
    });

    server.listen(port, () => {
        console.log(`[Health] Server listening on port ${port}`);
    });

    return server;
}
