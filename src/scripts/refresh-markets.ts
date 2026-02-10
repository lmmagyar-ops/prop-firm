/**
 * Force-refresh script to fix broken market data in Redis
 * Run with: npx tsx src/scripts/refresh-markets.ts
 */

import Redis from "ioredis";
import * as dotenv from "dotenv";
import { validateEventBatch, logValidationIssues } from "../lib/data-validator";

dotenv.config();

// Use same Redis config as the app - prioritize Upstash host/password with TLS
const getRedisConfig = () => {
    if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
        console.log(`[Refresh] Using Upstash Redis at ${process.env.REDIS_HOST}`);
        return {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
            tls: {} // Required for Upstash
        };
    }
    console.log(`[Refresh] Using Redis URL: ${process.env.REDIS_URL || "redis://localhost:6380"}`);
    return process.env.REDIS_URL || "redis://localhost:6380";
};

interface PolyEvent {
    slug: string;
    title: string;
    description?: string;
    image?: string;
    id?: string;
    volume?: number;
    endDate?: string;
    end_date_iso?: string;
    markets?: Array<{
        question: string;
        closed?: boolean;
        archived?: boolean;
        outcomePrices?: string;
        clobTokenIds?: string;
        outcomes?: string;
        volume?: string;
    }>;
}

async function refreshMarkets() {
    console.log("[Refresh] Connecting to Redis...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ioredis config union type
    const redis = new Redis(getRedisConfig() as any);

    try {
        // Fetch high-volume active events (sorted by 24h volume for freshness)
        console.log("[Refresh] Fetching events from Polymarket API...");
        const url = "https://gamma-api.polymarket.com/events?active=true&closed=false&order=volume24hr&ascending=false&limit=100";
        const response = await fetch(url);
        const events = await response.json();

        if (!Array.isArray(events)) {
            throw new Error("Invalid API response");
        }

        // Also fetch "breaking" tagged events to catch brand-new markets
        console.log("[Refresh] Fetching breaking news markets...");
        const breakingUrl = "https://gamma-api.polymarket.com/events?tag=breaking&active=true&closed=false&limit=30";
        const breakingRes = await fetch(breakingUrl);
        const breakingEvents = await breakingRes.json();

        if (Array.isArray(breakingEvents)) {
            const seenSlugs = new Set(events.map((e: PolyEvent) => e.slug));
            for (const be of breakingEvents) {
                if (!seenSlugs.has(be.slug)) {
                    events.push(be);
                }
            }
            console.log(`[Refresh] Added ${breakingEvents.filter((be: PolyEvent) => !seenSlugs.has(be.slug)).length} breaking events.`);
        }

        const processedEvents = [];
        let totalMarkets = 0;

        for (const event of events) {
            if (!event.markets || event.markets.length === 0) continue;

            const subMarkets = [];
            const seenQuestions = new Set<string>();
            for (const market of event.markets) {
                if (market.closed || market.archived) continue;

                // Filter out "Individual [A-Z]" placeholders (confusing for users)
                if (market.question.includes("Individual ") || market.question.includes("Someone else")) continue;

                // Filter out "arch" prefix typos from Polymarket
                if (market.question.startsWith("arch")) continue;

                const clobTokens = JSON.parse(market.clobTokenIds || '[]');
                const outcomes = JSON.parse(market.outcomes || '[]');
                const prices = JSON.parse(market.outcomePrices || '[]');

                if (clobTokens.length === 0) continue;
                if (!prices || prices.length < 2) continue;

                // Deduplication
                const normalizedQ = market.question.trim().toLowerCase();
                if (seenQuestions.has(normalizedQ)) continue;
                seenQuestions.add(normalizedQ);

                const tokenId = clobTokens[0];
                const yesPrice = parseFloat(prices[0] || "0");

                // Skip markets with truly 0% prices (exactly 0) - these are
                // delisted or inactive. Keep low-probability markets (0.1%+).
                if (yesPrice < 0.001) continue;

                subMarkets.push({
                    id: tokenId,
                    question: market.question,
                    outcomes: outcomes,
                    price: Math.max(yesPrice, 0.01),
                    volume: parseFloat(market.volume || "0"),
                });
                totalMarkets++;
            }

            if (subMarkets.length === 0) continue;

            // Filter: Skip events where ALL outcomes have the same price (broken data)
            const prices = subMarkets.map(m => m.price);
            const allSamePrice = prices.length > 1 && prices.every(p => p === prices[0]);
            if (allSamePrice) {
                console.log(`[Refresh] Skipping "${event.title}" - all ${prices.length} outcomes have same price ${prices[0]}`);
                continue;
            }

            subMarkets.sort((a, b) => b.price - a.price);

            processedEvents.push({
                id: event.id || event.slug,
                title: event.title,
                slug: event.slug,
                description: event.description,
                image: event.image,
                volume: event.volume || 0,
                endDate: event.endDate || event.end_date_iso || null,
                categories: getCategories(event.title),
                markets: subMarkets,
                isMultiOutcome: subMarkets.length > 1,
            });
        }

        // Validate all events before storing
        console.log("\n[Refresh] Running data quality validation...");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- validateEventBatch expects internal type
        const { validEvents, invalidEvents, totalWarnings, summary } = validateEventBatch(processedEvents as any);
        console.log(summary);
        logValidationIssues(invalidEvents, "[Refresh]");

        // Store only valid events in Redis
        console.log(`\n[Refresh] Storing ${validEvents.length} valid events (${totalMarkets} markets)...`);
        await redis.set("event:active_list", JSON.stringify(validEvents));

        // Verify
        const stored = JSON.parse(await redis.get("event:active_list") || "[]");
        const fedChair = stored.find((e: PolyEvent) => e.title?.toLowerCase().includes("fed chair"));

        if (fedChair) {
            console.log("\n[Refresh] ✅ Fed Chair Event Verification:");
            console.log(`  Markets: ${fedChair.markets.length}`);
            console.log(`  First: ${fedChair.markets[0].question}`);
            console.log(`  Price: ${(fedChair.markets[0].price * 100).toFixed(1)}%`);
        }

        console.log("\n[Refresh] ✅ Complete! Refresh your browser.");

    } catch (error) {
        console.error("[Refresh] Error:", error);
    } finally {
        redis.disconnect();
    }
}

function getCategories(title: string): string[] {
    const q = title.toLowerCase();
    const categories: string[] = [];

    if (q.includes('trump') || q.includes('biden') || q.includes('election') ||
        q.includes('president') || q.includes('congress') || q.includes('fed')) {
        categories.push('Politics');
    }
    if (q.includes('putin') || q.includes('ukraine') || q.includes('russia') ||
        q.includes('israel') || q.includes('china') || q.includes('war')) {
        categories.push('Geopolitics');
    }
    if (q.includes('bitcoin') || q.includes('crypto') || q.includes('eth')) {
        categories.push('Crypto');
    }
    if (q.includes('fed') || q.includes('rate') || q.includes('business')) {
        categories.push('Business');
    }

    return categories.length > 0 ? categories : ['Other'];
}

refreshMarkets();
