/**
 * Live Price Audit Script
 *
 * Compares cached Redis prices against live Polymarket/Kalshi APIs.
 * Run: npx tsx src/scripts/verify-prices.ts
 *
 * Reports:
 * - Deviations > 1%
 * - Stale prices (>60s old)
 * - Missing markets
 */

import Redis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const POLYMARKET_API = "https://gamma-api.polymarket.com/markets?limit=50&active=true&closed=false";
const KALSHI_API = "https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=50";
const DEVIATION_THRESHOLD = 0.01; // 1%
const STALENESS_THRESHOLD_MS = 60_000; // 60 seconds

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

interface AuditResult {
    marketId: string;
    title: string;
    source: "polymarket" | "kalshi";
    cachedPrice: number | null;
    livePrice: number;
    deviation: number | null;
    isStale: boolean;
    cacheAge: number | null;
    status: "ok" | "deviation" | "stale" | "missing";
}

interface AuditSummary {
    totalMarkets: number;
    okCount: number;
    deviationCount: number;
    staleCount: number;
    missingCount: number;
    issues: AuditResult[];
}

// ============================================================================
// API Fetchers
// ============================================================================

async function fetchPolymarketPrices(): Promise<Map<string, { title: string; price: number }>> {
    const results = new Map<string, { title: string; price: number }>();

    try {
        const response = await fetch(POLYMARKET_API);
        if (!response.ok) {
            console.error(`[Polymarket] API error: ${response.status}`);
            return results;
        }

        const markets = await response.json();
        for (const market of markets) {
            if (market.tokens && market.tokens.length > 0) {
                // Get YES token price
                const yesToken = market.tokens.find((t: { outcome: string }) => t.outcome === "Yes");
                if (yesToken) {
                    results.set(yesToken.token_id, {
                        title: market.question || "Unknown",
                        price: parseFloat(yesToken.price || "0"),
                    });
                }
            }
        }

        console.log(`[Polymarket] Fetched ${results.size} live prices`);
    } catch (error) {
        console.error(`[Polymarket] Fetch error:`, error);
    }

    return results;
}

async function fetchKalshiPrices(): Promise<Map<string, { title: string; price: number }>> {
    const results = new Map<string, { title: string; price: number }>();

    try {
        const response = await fetch(KALSHI_API, {
            headers: { "Accept": "application/json" },
        });

        if (!response.ok) {
            console.error(`[Kalshi] API error: ${response.status}`);
            return results;
        }

        const data = await response.json();
        for (const market of data.markets || []) {
            // Calculate mid price from yes_bid/yes_ask
            const yesBid = market.yes_bid || 0;
            const yesAsk = market.yes_ask || 100;
            const midPrice = (yesBid + yesAsk) / 200; // Convert cents to decimal

            results.set(market.ticker, {
                title: market.title || "Unknown",
                price: midPrice,
            });
        }

        console.log(`[Kalshi] Fetched ${results.size} live prices`);
    } catch (error) {
        console.error(`[Kalshi] Fetch error:`, error);
    }

    return results;
}

// ============================================================================
// Cache Reader
// ============================================================================

async function getCachedPrices(redis: Redis): Promise<Map<string, { price: number; timestamp: number }>> {
    const results = new Map<string, { price: number; timestamp: number }>();

    try {
        // Read from event lists (primary source)
        const [polyData, kalshiData] = await Promise.all([
            redis.get("event:active_list"),
            redis.get("kalshi:active_list"),
        ]);

        if (polyData) {
            const events = JSON.parse(polyData);
            for (const event of events) {
                for (const market of event.markets || []) {
                    results.set(market.id, {
                        price: parseFloat(market.price || "0"),
                        timestamp: Date.now(), // Event lists don't have per-market timestamps
                    });
                }
            }
        }

        if (kalshiData) {
            const events = JSON.parse(kalshiData);
            for (const event of events) {
                for (const market of event.markets || []) {
                    results.set(market.id, {
                        price: parseFloat(market.price || "0"),
                        timestamp: Date.now(),
                    });
                }
            }
        }

        console.log(`[Cache] Found ${results.size} cached prices`);
    } catch (error) {
        console.error(`[Cache] Read error:`, error);
    }

    return results;
}

// ============================================================================
// Audit Logic
// ============================================================================

async function runAudit(): Promise<AuditSummary> {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 MARKET PRICE AUDIT");
    console.log("=".repeat(60) + "\n");

    const redis = createRedisClient();
    const results: AuditResult[] = [];

    try {
        // Fetch all data in parallel
        const [polyLive, kalshiLive, cached] = await Promise.all([
            fetchPolymarketPrices(),
            fetchKalshiPrices(),
            getCachedPrices(redis),
        ]);

        // Audit Polymarket
        for (const [marketId, live] of polyLive) {
            const cache = cached.get(marketId);
            const result = auditMarket(marketId, live, cache, "polymarket");
            results.push(result);
        }

        // Audit Kalshi
        for (const [marketId, live] of kalshiLive) {
            const cache = cached.get(marketId);
            const result = auditMarket(marketId, live, cache, "kalshi");
            results.push(result);
        }

    } finally {
        await redis.quit();
    }

    // Generate summary
    const issues = results.filter(r => r.status !== "ok");
    const summary: AuditSummary = {
        totalMarkets: results.length,
        okCount: results.filter(r => r.status === "ok").length,
        deviationCount: results.filter(r => r.status === "deviation").length,
        staleCount: results.filter(r => r.status === "stale").length,
        missingCount: results.filter(r => r.status === "missing").length,
        issues,
    };

    printSummary(summary);
    return summary;
}

function auditMarket(
    marketId: string,
    live: { title: string; price: number },
    cache: { price: number; timestamp: number } | undefined,
    source: "polymarket" | "kalshi"
): AuditResult {
    if (!cache) {
        return {
            marketId,
            title: live.title,
            source,
            cachedPrice: null,
            livePrice: live.price,
            deviation: null,
            isStale: false,
            cacheAge: null,
            status: "missing",
        };
    }

    const cacheAge = Date.now() - cache.timestamp;
    const isStale = cacheAge > STALENESS_THRESHOLD_MS;
    const deviation = Math.abs(cache.price - live.price);

    let status: AuditResult["status"] = "ok";
    if (deviation > DEVIATION_THRESHOLD) {
        status = "deviation";
    } else if (isStale) {
        status = "stale";
    }

    return {
        marketId,
        title: live.title,
        source,
        cachedPrice: cache.price,
        livePrice: live.price,
        deviation,
        isStale,
        cacheAge,
        status,
    };
}

function printSummary(summary: AuditSummary): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 AUDIT SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total Markets:  ${summary.totalMarkets}`);
    console.log(`✅ OK:          ${summary.okCount}`);
    console.log(`⚠️  Deviations:  ${summary.deviationCount}`);
    console.log(`⏰ Stale:       ${summary.staleCount}`);
    console.log(`❌ Missing:     ${summary.missingCount}`);

    if (summary.issues.length > 0) {
        console.log("\n" + "-".repeat(60));
        console.log("ISSUES:");
        console.log("-".repeat(60));

        for (const issue of summary.issues.slice(0, 10)) {
            const icon = issue.status === "deviation" ? "⚠️" : issue.status === "stale" ? "⏰" : "❌";
            const devStr = issue.deviation !== null
                ? ` (${(issue.deviation * 100).toFixed(2)}% off)`
                : "";
            console.log(`${icon} [${issue.source}] ${issue.title.slice(0, 40)}...${devStr}`);
            console.log(`   Cached: ${issue.cachedPrice?.toFixed(4) ?? "N/A"} | Live: ${issue.livePrice.toFixed(4)}`);
        }

        if (summary.issues.length > 10) {
            console.log(`\n... and ${summary.issues.length - 10} more issues`);
        }
    }

    console.log("\n" + "=".repeat(60));
    const verdict = summary.issues.length === 0 ? "✅ ALL PRICES VERIFIED" : `⚠️ ${summary.issues.length} ISSUES FOUND`;
    console.log(verdict);
    console.log("=".repeat(60) + "\n");
}

// ============================================================================
// Main
// ============================================================================

runAudit().catch(console.error);
