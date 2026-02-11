/**
 * Test Worker Server Helper
 * 
 * Starts a local instance of the health server (the same one used in production)
 * so that test scripts can seed Redis directly and have it available via HTTP.
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

export async function startTestWorkerServer(): Promise<{
    redis: InstanceType<typeof Redis>;
    server: Server;
    cleanup: () => Promise<void>;
}> {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    // Point the worker-client at our local test server
    process.env.INGESTION_WORKER_URL = `http://localhost:${TEST_WORKER_PORT}`;

    const server = startHealthServer(redis, {
        port: TEST_WORKER_PORT,
        workerId: 'test-worker',
    });

    // Wait for server to be listening
    await new Promise<void>((resolve) => {
        server.on('listening', resolve);
    });

    console.log(`  ✅ Test worker server started on port ${TEST_WORKER_PORT}`);

    const cleanup = async () => {
        server.close();
        redis.disconnect();
    };

    return { redis, server, cleanup };
}
