/**
 * Price Monitor Worker
 *
 * Background service that continuously validates cached prices against live APIs.
 * Runs every 5 minutes, samples random markets, and publishes admin events on deviation.
 *
 * Run: npx tsx src/workers/price-monitor.ts
 */

import Redis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const POLYMARKET_API = "https://gamma-api.polymarket.com/markets?limit=50&active=true&closed=false";
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SAMPLE_SIZE = 10; // Check 10 random markets per cycle
const DEVIATION_THRESHOLD = 0.02; // 2% deviation triggers alert

// ============================================================================
// Redis Client
// ============================================================================

function createRedisClient(): Redis {
    if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
        return new Redis({
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
            tls: {},
            connectTimeout: 5000,
        });
    }
    return new Redis(process.env.REDIS_URL || "redis://localhost:6380", {
        connectTimeout: 5000,
    });
}

// ============================================================================
// Types
// ============================================================================

interface PriceDeviation {
    marketId: string;
    title: string;
    cachedPrice: number;
    livePrice: number;
    deviationPercent: number;
    timestamp: Date;
}

// ============================================================================
// Monitor Logic
// ============================================================================

class PriceMonitor {
    private redis: Redis;
    private running = false;

    constructor() {
        this.redis = createRedisClient();
    }

    async start(): Promise<void> {
        console.log("[PriceMonitor] Starting continuous price validation...");
        console.log(`[PriceMonitor] Check interval: ${CHECK_INTERVAL_MS / 1000}s`);
        console.log(`[PriceMonitor] Sample size: ${SAMPLE_SIZE} markets per cycle`);
        console.log(`[PriceMonitor] Deviation threshold: ${(DEVIATION_THRESHOLD * 100).toFixed(1)}%`);

        this.running = true;

        while (this.running) {
            try {
                await this.runCheck();
            } catch (error) {
                console.error("[PriceMonitor] Check failed:", error);
            }

            // Wait for next cycle
            await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
        }
    }

    async stop(): Promise<void> {
        console.log("[PriceMonitor] Stopping...");
        this.running = false;
        await this.redis.quit();
    }

    private async runCheck(): Promise<void> {
        const startTime = Date.now();
        console.log(`\n[PriceMonitor] Running check at ${new Date().toISOString()}`);

        // Get cached prices
        const cachedPrices = await this.getCachedPrices();
        if (cachedPrices.size === 0) {
            console.log("[PriceMonitor] No cached prices found, skipping check");
            return;
        }

        // Get live prices from Polymarket
        const livePrices = await this.fetchLivePrices();
        if (livePrices.size === 0) {
            console.log("[PriceMonitor] Failed to fetch live prices, skipping check");
            return;
        }

        // Sample random markets for comparison
        const marketIds = Array.from(cachedPrices.keys());
        const sampleIds = this.randomSample(marketIds, SAMPLE_SIZE);

        // Check for deviations
        const deviations: PriceDeviation[] = [];
        let matchCount = 0;

        for (const marketId of sampleIds) {
            const cached = cachedPrices.get(marketId);
            const live = livePrices.get(marketId);

            if (!cached || !live) continue;

            const deviation = Math.abs(cached.price - live.price);
            const deviationPercent = deviation / live.price;

            if (deviationPercent > DEVIATION_THRESHOLD) {
                deviations.push({
                    marketId,
                    title: live.title,
                    cachedPrice: cached.price,
                    livePrice: live.price,
                    deviationPercent,
                    timestamp: new Date(),
                });
            } else {
                matchCount++;
            }
        }

        const elapsedMs = Date.now() - startTime;
        console.log(`[PriceMonitor] Checked ${sampleIds.length} markets in ${elapsedMs}ms`);
        console.log(`[PriceMonitor] ✅ Matching: ${matchCount}, ⚠️ Deviations: ${deviations.length}`);

        // Publish alerts for deviations
        if (deviations.length > 0) {
            await this.publishDeviationAlert(deviations);
        }

        // Store health status
        await this.updateHealthStatus(deviations.length === 0);
    }

    private async getCachedPrices(): Promise<Map<string, { price: number }>> {
        const results = new Map<string, { price: number }>();

        try {
            const polyData = await this.redis.get("event:active_list");
            if (polyData) {
                const events = JSON.parse(polyData);
                for (const event of events) {
                    for (const market of event.markets || []) {
                        results.set(market.id, {
                            price: parseFloat(market.price || "0.5"),
                        });
                    }
                }
            }
        } catch (error) {
            console.error("[PriceMonitor] Failed to get cached prices:", error);
        }

        return results;
    }

    private async fetchLivePrices(): Promise<Map<string, { title: string; price: number }>> {
        const results = new Map<string, { title: string; price: number }>();

        try {
            const response = await fetch(POLYMARKET_API);
            if (!response.ok) {
                console.error(`[PriceMonitor] Polymarket API error: ${response.status}`);
                return results;
            }

            const markets = await response.json();
            for (const market of markets) {
                if (market.tokens && market.tokens.length > 0) {
                    const yesToken = market.tokens.find((t: { outcome: string }) => t.outcome === "Yes");
                    if (yesToken) {
                        results.set(yesToken.token_id, {
                            title: market.question || "Unknown",
                            price: parseFloat(yesToken.price || "0.5"),
                        });
                    }
                }
            }
        } catch (error) {
            console.error("[PriceMonitor] Failed to fetch live prices:", error);
        }

        return results;
    }

    private randomSample<T>(array: T[], size: number): T[] {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(size, array.length));
    }

    private async publishDeviationAlert(deviations: PriceDeviation[]): Promise<void> {
        console.log("\n[PriceMonitor] 🚨 PRICE DEVIATIONS DETECTED:");
        for (const d of deviations) {
            console.log(`  - ${d.title.slice(0, 40)}...`);
            console.log(`    Cached: ${(d.cachedPrice * 100).toFixed(1)}% | Live: ${(d.livePrice * 100).toFixed(1)}% | Deviation: ${(d.deviationPercent * 100).toFixed(2)}%`);
        }

        // Publish admin event
        try {
            await this.redis.publish("admin:events", JSON.stringify({
                type: "PRICE_DEVIATION_DETECTED",
                data: {
                    count: deviations.length,
                    deviations: deviations.slice(0, 5), // Limit to 5 for brevity
                    timestamp: new Date().toISOString(),
                },
            }));
        } catch (error) {
            console.error("[PriceMonitor] Failed to publish event:", error);
        }
    }

    private async updateHealthStatus(isHealthy: boolean): Promise<void> {
        try {
            await this.redis.set("price_monitor:status", isHealthy ? "healthy" : "degraded");
            await this.redis.set("price_monitor:last_check", new Date().toISOString());
        } catch (error) {
            console.error("[PriceMonitor] Failed to update health status:", error);
        }
    }
}

// ============================================================================
// Main
// ============================================================================

const monitor = new PriceMonitor();

// Handle graceful shutdown
process.on("SIGINT", async () => {
    await monitor.stop();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await monitor.stop();
    process.exit(0);
});

monitor.start().catch(console.error);
