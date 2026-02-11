/**
 * Test Worker Server Helper
 * 
 * Starts a local instance of the health server (the same one used in production)
 * so that test scripts can seed Redis directly and have it available via HTTP.
 * 
 * FAST-FAIL: If Redis is unreachable, this will throw within ~8 seconds
 * instead of hanging indefinitely. This prevents the daily "tests hang
 * when Redis isn't running locally" problem.
 * 
 * Usage:
 *   const { redis, cleanup } = await startTestWorkerServer();
 *   // ... seed redis, run tests ...
 *   await cleanup();
 */

import Redis from 'ioredis';
import { startHealthServer } from '@/workers/health-server';
import type { Server } from 'http';

const TEST_WORKER_PORT = 19876; // Unlikely to conflict
const CONNECT_TIMEOUT_MS = 5000;

export async function startTestWorkerServer(): Promise<{
    redis: InstanceType<typeof Redis>;
    server: Server;
    cleanup: () => Promise<void>;
}> {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const maskedUrl = redisUrl.replace(/\/\/.*@/, '//***@');

    const redis = new Redis(redisUrl, {
        connectTimeout: CONNECT_TIMEOUT_MS,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 3) {
                console.error(`\n❌ Redis connection failed after ${times} attempts.`);
                console.error(`   URL: ${maskedUrl}`);
                console.error(`   Is your Redis instance running?\n`);
                return null; // Stop retrying — don't hang
            }
            return Math.min(times * 200, 1000);
        },
    });

    // Fail fast on connection errors instead of silently retrying
    redis.on('error', (err) => {
        if (err.message.includes('ECONNREFUSED') || err.message.includes('ECONNRESET')) {
            console.error(`\n❌ Redis unavailable: ${err.message}`);
            console.error(`   URL: ${maskedUrl}`);
            console.error(`   Tests requiring Redis will be skipped.\n`);
        }
    });

    // Pre-flight: verify Redis is actually reachable before proceeding
    try {
        await Promise.race([
            redis.ping(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(
                    `Redis PING timed out after ${CONNECT_TIMEOUT_MS}ms — is Redis running at ${maskedUrl}?`
                )), CONNECT_TIMEOUT_MS)
            ),
        ]);
        console.log(`  ✅ Redis connected (${maskedUrl})`);
    } catch (err) {
        redis.disconnect();
        throw new Error(
            `❌ Cannot connect to Redis at ${maskedUrl}. ` +
            `Tests that need Redis cannot run.\n` +
            `   Original error: ${(err as Error).message}`
        );
    }

    // Point the worker-client at our local test server
    process.env.INGESTION_WORKER_URL = `http://localhost:${TEST_WORKER_PORT}`;

    const server = startHealthServer(redis, {
        port: TEST_WORKER_PORT,
        workerId: 'test-worker',
    });

    // Wait for server to be listening (with timeout)
    await Promise.race([
        new Promise<void>((resolve) => server.on('listening', resolve)),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(
                `Test worker server failed to start within ${CONNECT_TIMEOUT_MS}ms`
            )), CONNECT_TIMEOUT_MS)
        ),
    ]);

    console.log(`  ✅ Test worker server started on port ${TEST_WORKER_PORT}`);

    const cleanup = async () => {
        try { server.close(); } catch { /* ignore */ }
        try { redis.disconnect(); } catch { /* ignore */ }
    };

    return { redis, server, cleanup };
}
