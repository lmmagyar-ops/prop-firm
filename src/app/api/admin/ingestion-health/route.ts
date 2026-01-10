/**
 * Ingestion Health API
 *
 * Returns status of market data ingestion:
 * - Last update timestamp
 * - Stale market count
 * - Worker status
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import Redis from "ioredis";

// Redis client
function getRedis(): Redis {
    if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
        return new Redis({
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
            tls: {},
            connectTimeout: 5000,
            lazyConnect: true,
        });
    }
    return new Redis(process.env.REDIS_URL || "redis://localhost:6380", {
        connectTimeout: 5000,
        lazyConnect: true,
    });
}

interface IngestionHealth {
    status: "healthy" | "degraded" | "down";
    lastPolymarketUpdate: string | null;
    lastKalshiUpdate: string | null;
    polymarketCount: number;
    kalshiCount: number;
    staleMarkets: number;
    workerStatus: "active" | "standby" | "unknown";
    updatedAt: string;
}

export async function GET(): Promise<NextResponse> {
    const authResult = await requireAdmin();
    if (!authResult.isAuthorized) {
        return authResult.response!;
    }

    const redis = getRedis();

    try {
        // Check Redis connectivity
        await redis.ping();

        // Get event lists
        const [polyData, kalshiData, leaderKey] = await Promise.all([
            redis.get("event:active_list"),
            redis.get("kalshi:market_list"),
            redis.get("ingestion:leader"),
        ]);

        let polymarketCount = 0;
        let kalshiCount = 0;
        let lastPolymarketUpdate: string | null = null;
        let lastKalshiUpdate: string | null = null;

        if (polyData) {
            const events = JSON.parse(polyData);
            for (const event of events) {
                polymarketCount += event.markets?.length || 0;
            }
            // Check metadata for timestamp
            const metaKey = await redis.get("event:last_update");
            lastPolymarketUpdate = metaKey || new Date().toISOString();
        }

        if (kalshiData) {
            // Kalshi stores as flat array of markets, not nested in events
            const markets = JSON.parse(kalshiData);
            kalshiCount = Array.isArray(markets) ? markets.length : 0;
            const metaKey = await redis.get("kalshi:last_update");
            lastKalshiUpdate = metaKey || new Date().toISOString();
        }

        // Determine worker status
        let workerStatus: IngestionHealth["workerStatus"] = "unknown";
        if (leaderKey) {
            workerStatus = "active";
        }

        // Determine overall status
        const totalMarkets = polymarketCount + kalshiCount;
        let status: IngestionHealth["status"] = "healthy";

        if (totalMarkets === 0) {
            status = "down";
        } else if (polymarketCount === 0 || kalshiCount === 0) {
            status = "degraded";
        }

        const health: IngestionHealth = {
            status,
            lastPolymarketUpdate,
            lastKalshiUpdate,
            polymarketCount,
            kalshiCount,
            staleMarkets: 0, // TODO: Calculate from timestamps
            workerStatus,
            updatedAt: new Date().toISOString(),
        };

        return NextResponse.json(health);

    } catch (error) {
        console.error("[IngestionHealth] Error:", error);

        const health: IngestionHealth = {
            status: "down",
            lastPolymarketUpdate: null,
            lastKalshiUpdate: null,
            polymarketCount: 0,
            kalshiCount: 0,
            staleMarkets: 0,
            workerStatus: "unknown",
            updatedAt: new Date().toISOString(),
        };

        return NextResponse.json(health, { status: 503 });

    } finally {
        await redis.quit();
    }
}
