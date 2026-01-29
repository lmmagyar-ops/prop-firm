import Redis from "ioredis";

let redisClient: Redis | null = null;

/**
 * Get a singleton Redis client instance.
 * Priority: REDIS_URL (Railway) > REDIS_HOST/PASSWORD (legacy Upstash) > localhost
 */
export function getRedisClient(): Redis {
    if (!redisClient) {
        // Priority 1: Use REDIS_URL if set (Railway or any standard Redis)
        if (process.env.REDIS_URL) {
            redisClient = new Redis(process.env.REDIS_URL, {
                connectTimeout: 5000,
                commandTimeout: 5000,
                maxRetriesPerRequest: 2,
                lazyConnect: true,
            });
        } else if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
            // Priority 2: Legacy Upstash with TLS (deprecated)
            redisClient = new Redis({
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT || "6379"),
                password: process.env.REDIS_PASSWORD,
                tls: {}, // Required for Upstash
                connectTimeout: 5000,
                commandTimeout: 5000,
                maxRetriesPerRequest: 2,
                lazyConnect: true,
            });
        } else {
            // Priority 3: Local development fallback
            redisClient = new Redis("redis://localhost:6380", {
                connectTimeout: 5000,
                commandTimeout: 5000,
                maxRetriesPerRequest: 2,
                lazyConnect: true,
            });
        }

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
