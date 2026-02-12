/**
 * Kalshi Markets Refresh Script
 * 
 * Fetches market data from Kalshi API and stores in Redis.
 * Fethes market data from Kalshi API and stores in Redis.
 * Run with: npx tsx src/scripts/refresh-kalshi.ts
 */

import Redis from "ioredis";
import * as dotenv from "dotenv";
import { getKalshiEvents, getKalshiMarkets, getKalshiMidPrice, mapKalshiCategory } from "../lib/kalshi-client";
import { getCleanOutcomeName } from "../lib/market-utils";
import { validateEventBatch, logValidationIssues } from "../lib/data-validator";
import { lookupTickerName, hasTickerMapping, extractTickerSuffix } from "../lib/kalshi-ticker-dictionary";
import type { EventMetadata, SubMarket } from "../app/actions/market";

dotenv.config();

// Use same Redis config as the app
const getRedisConfig = () => {
    if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
        console.log(`[Kalshi Refresh] Using Upstash Redis at ${process.env.REDIS_HOST}`);
        return {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
            tls: {}
        };
    }
    console.log(`[Kalshi Refresh] Using Redis URL: ${process.env.REDIS_URL || "redis://localhost:6380"}`);
    return process.env.REDIS_URL || "redis://localhost:6380";
};

async function refreshKalshiMarkets() {
    console.log("[Kalshi Refresh] Connecting to Redis...");
    const redis = new Redis(getRedisConfig() as any);

    try {
        console.log("[Kalshi Refresh] Fetching events from Kalshi API...");

        // Fetch all markets first (contains price data)
        const markets = await getKalshiMarkets(1000);
        console.log(`[Kalshi Refresh] Fetched ${markets.length} markets`);

        // Group markets by event ticker
        const marketsByEvent = new Map<string, typeof markets>();
        for (const market of markets) {
            const existing = marketsByEvent.get(market.event_ticker) || [];
            existing.push(market);
            marketsByEvent.set(market.event_ticker, existing);
        }

        // Fetch events for metadata (titles, categories) - max 200 per API limit
        const events = await getKalshiEvents(200);
        console.log(`[Kalshi Refresh] Fetched ${events.length} events`);

        const processedEvents: EventMetadata[] = [];
        let totalMarkets = 0;
        let skippedEvents = 0;

        for (const event of events) {
            const eventMarkets = marketsByEvent.get(event.event_ticker) || [];

            if (eventMarkets.length === 0) {
                skippedEvents++;
                continue;
            }

            // Convert Kalshi markets to our SubMarket format
            const subMarkets: SubMarket[] = [];

            for (const market of eventMarkets) {
                const price = getKalshiMidPrice(market);

                // Skip markets with no meaningful price
                if (price < 0.001) continue;

                // STEP 1: Try dictionary lookup first (deterministic, no hallucination)
                const tickerSuffix = extractTickerSuffix(market.ticker);
                let cleanedName: string;

                if (hasTickerMapping(tickerSuffix)) {
                    // Dictionary hit - use the canonical name
                    cleanedName = lookupTickerName(tickerSuffix);
                } else {
                    // STEP 2: Try regex extraction from market title
                    const rawName = market.title;
                    const extracted = getCleanOutcomeName(rawName, event.title);

                    // STEP 3: If extraction just returned the full title, try subtitle
                    // (Kalshi bracket markets have generic titles but specific subtitles)
                    if (extracted === rawName || extracted.length > 50) {
                        if (market.subtitle && market.subtitle !== rawName) {
                            // Subtitle has bracket-specific text (e.g. "Above 95000")
                            cleanedName = getCleanOutcomeName(market.subtitle, event.title);
                        } else {
                            cleanedName = tickerSuffix; // Show ticker code (fail-safe)
                        }
                    } else {
                        cleanedName = extracted;
                    }
                }

                subMarkets.push({
                    id: market.ticker,
                    question: cleanedName,
                    outcomes: ["Yes", "No"],
                    price: price,
                    volume: market.volume_24h || market.volume || 0,
                });
                totalMarkets++;
            }

            if (subMarkets.length === 0) continue;

            // Filter: Skip events where all outcomes have same price (broken data)
            const prices = subMarkets.map(m => m.price);
            const allSamePrice = prices.length > 1 && prices.every(p => Math.abs(p - prices[0]) < 0.01);
            if (allSamePrice) {
                console.log(`[Kalshi Refresh] Skipping "${event.title}" - all ${prices.length} outcomes have same price`);
                skippedEvents++;
                continue;
            }

            // Sort by price (highest probability first)
            subMarkets.sort((a, b) => b.price - a.price);

            const category = mapKalshiCategory(event.category);

            // Get timeline/rules from the first market (primary market)
            const primaryMarket = eventMarkets[0];

            processedEvents.push({
                id: event.event_ticker,
                title: event.title,
                slug: event.event_ticker.toLowerCase(),
                description: event.sub_title || event.title,
                image: undefined, // Kalshi doesn't provide event images in API
                volume: subMarkets.reduce((sum, m) => sum + m.volume, 0),
                endDate: primaryMarket?.expiration_time,
                // New fields for modal parity
                rules: primaryMarket?.subtitle || event.sub_title || "Market resolution based on official data.",
                openTime: undefined, // Not available in list endpoint
                closeTime: primaryMarket?.close_time,
                settlementTime: primaryMarket?.expiration_time,
                categories: [category, "Kalshi"],
                // Don't deduplicate here - wait until after LLM fixes the names
                markets: [...subMarkets].sort((a, b) => b.price - a.price),
                isMultiOutcome: subMarkets.length > 1,
            });
        }

        // Dictionary-based name resolution (replaces LLM cleaning)
        // Names are now resolved during market processing above using:
        // 1. Static dictionary lookup (deterministic)
        // 2. Regex extraction from market titles
        // 3. Raw ticker suffix as fallback (fail-safe)
        console.log("\n[Kalshi Refresh] Using dictionary-based name resolution (no LLM)...");

        // Deduplicate: Now that names are clean, dedupe by question (keeping highest price)
        for (const event of processedEvents) {
            const deduped = new Map<string, typeof event.markets[0]>();
            for (const market of event.markets) {
                const existing = deduped.get(market.question);
                if (!existing || market.price > existing.price) {
                    deduped.set(market.question, market);
                }
            }
            event.markets = Array.from(deduped.values()).sort((a, b) => b.price - a.price);
        }

        // Sort events by total volume
        processedEvents.sort((a, b) => (b.volume || 0) - (a.volume || 0));

        // Validate all events before storing
        console.log("\n[Kalshi Refresh] Running data quality validation...");
        const { validEvents, invalidEvents, totalWarnings, summary } = validateEventBatch(processedEvents);
        console.log(summary);
        logValidationIssues(invalidEvents, "[Kalshi Refresh]");

        // Store only valid events in Redis
        console.log(`\n[Kalshi Refresh] Storing ${validEvents.length} valid events...`);
        await redis.set("kalshi:active_list", JSON.stringify(validEvents));

        // Log sample
        console.log("\n[Kalshi Refresh] Sample events:");
        console.log(JSON.stringify({
            total_events: processedEvents.length,
            total_markets: totalMarkets,
            skipped_events: skippedEvents,
            sample: processedEvents.slice(0, 3).map(e => ({
                title: e.title,
                category: e.categories?.[0] || "Unknown",
                markets: e.markets.length,
                top_price: e.markets[0]?.price ? `${Math.round(e.markets[0].price * 100)}%` : "N/A"
            }))
        }, null, 2));

        console.log("\n[Kalshi Refresh] ✅ Done!");

    } catch (error) {
        console.error("[Kalshi Refresh] ❌ Error:", error);
    } finally {
        redis.disconnect();
    }
}

refreshKalshiMarkets();
