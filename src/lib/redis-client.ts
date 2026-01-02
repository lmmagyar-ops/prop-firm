import Redis from "ioredis";

let redisClient: Redis | null = null;

/**
 * Get a singleton Redis client instance.
 * This prevents creating new connections on every request and avoids connection leaks.
 */
export function getRedisClient(): Redis {
    if (!redisClient) {
        redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6380", {
            connectTimeout: 5000,
            commandTimeout: 5000,
            maxRetriesPerRequest: 2,
            lazyConnect: true, // Don't connect until first command
        });

        redisClient.on("error", (err) => {
            console.error("[Redis Singleton] Connection error:", err.message);
        });

        redisClient.on("connect", () => {
            console.log("[Redis Singleton] Connected");
        });
    }

    return redisClient;
}

/**
 * Gracefully close the Redis connection.
 * Call this on app shutdown.
 */
export async function closeRedisConnection(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        console.log("[Redis Singleton] Connection closed");
    }
}
