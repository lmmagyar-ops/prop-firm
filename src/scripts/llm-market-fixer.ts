/**
 * LLM Market Fixer - Rescues filtered-out Kalshi markets
 * 
 * Uses Claude to intelligently extract clean outcome labels from sentence fragments.
 * Run with: npx tsx src/scripts/llm-market-fixer.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import Redis from "ioredis";
import * as dotenv from "dotenv";
import { getKalshiEvents, getKalshiMarkets, getKalshiMidPrice, mapKalshiCategory } from "../lib/kalshi-client";
import type { EventMetadata, SubMarket } from "../app/actions/market";

dotenv.config();

// Redis config
const getRedisConfig = () => {
    if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
        return {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
            tls: {}
        };
    }
    return process.env.REDIS_URL || "redis://localhost:6380";
};

// Initialize clients
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Check if an outcome name needs LLM fixing (same logic as refresh-kalshi.ts)
function needsLLMFix(name: string): boolean {
    const lower = name.toLowerCase().trim();

    const badPatterns = [
        /^the\s+/,
        /^a\s+/,
        /^an\s+/,
        /\s+will\s+/,
        /\s+be\s+/,
        /\s+by\s+/,
        /\s+during\s+/,
        /\s+before\s+/,
        /\s+after\s+/,
        /\s+under\s+/,
        /government\s+s/i,
        /national\s+d/i,
        /^who will$/i,
    ];

    for (const pattern of badPatterns) {
        if (pattern.test(lower)) return true;
    }

    if (lower.length > 35) return true;

    return false;
}

// Use Claude to extract clean labels
async function fixOutcomeLabels(
    eventTitle: string,
    outcomes: string[]
): Promise<string[]> {
    const prompt = `You are helping clean up prediction market data for display.

Event: "${eventTitle}"

The following outcome labels are too long or sentence-like for display buttons. 
Extract SHORT, CLEAN labels (max 20 chars) that capture the key distinguishing info.

Outcomes to fix:
${outcomes.map((o, i) => `${i + 1}. "${o}"`).join("\n")}

Rules:
- Extract the KEY differentiator (number, name, entity)
- Keep it SHORT (under 20 characters)
- Make it button-friendly
- If it's a number range, use shorthand like "$40T" or "2 Justices"
- If it's an entity, use the short name

Return ONLY a JSON array of fixed labels in the same order, like:
["$40T Debt", "$45T Debt", "$50T Debt"]

JSON array only, no explanation:`;

    try {
        const message = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }],
        });

        // Extract text from response
        const content = message.content[0];
        if (content.type !== "text") {
            throw new Error("Unexpected response type");
        }

        // Parse JSON response
        const text = content.text.trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error(`Failed to parse JSON from: ${text}`);
        }

        const fixedLabels = JSON.parse(jsonMatch[0]) as string[];

        // Validate we got the right number of labels
        if (fixedLabels.length !== outcomes.length) {
            throw new Error(`Got ${fixedLabels.length} labels, expected ${outcomes.length}`);
        }

        return fixedLabels;
    } catch (error) {
        console.error(`[LLM Fixer] Error fixing "${eventTitle}":`, error);
        // Return original labels if LLM fails
        return outcomes;
    }
}

async function main() {
    console.log("[LLM Fixer] Starting LLM Market Fixer...\n");

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error("[LLM Fixer] ERROR: ANTHROPIC_API_KEY not found in .env");
        process.exit(1);
    }

    const redis = new Redis(getRedisConfig() as any);

    try {
        // Fetch markets from Kalshi API
        console.log("[LLM Fixer] Fetching markets from Kalshi API...");
        const markets = await getKalshiMarkets(1000);
        const events = await getKalshiEvents(200);

        console.log(`[LLM Fixer] Fetched ${markets.length} markets, ${events.length} events`);

        // Group markets by event
        const marketsByEvent = new Map<string, typeof markets>();
        for (const market of markets) {
            const existing = marketsByEvent.get(market.event_ticker) || [];
            existing.push(market);
            marketsByEvent.set(market.event_ticker, existing);
        }

        // Track stats
        let fixedEvents = 0;
        let totalLLMCalls = 0;
        const fixedEventsList: EventMetadata[] = [];

        // Process each event
        for (const event of events) {
            const eventMarkets = marketsByEvent.get(event.event_ticker) || [];
            if (eventMarkets.length === 0) continue;

            // Build submarkets
            const subMarkets: SubMarket[] = [];
            for (const market of eventMarkets) {
                const price = getKalshiMidPrice(market);
                if (price < 0.001) continue;

                // Use raw subtitle/title
                const rawQuestion = (market.subtitle || market.title)
                    .replace(/^:: /, "")
                    .replace(/^Will /, "");

                subMarkets.push({
                    id: market.ticker,
                    question: rawQuestion,
                    outcomes: ["Yes", "No"],
                    price: price,
                    volume: market.volume_24h || market.volume || 0,
                });
            }

            if (subMarkets.length < 3) continue; // Skip binary markets

            // Check if any outcomes need fixing
            const outcomeNames = subMarkets.map(m => m.question);
            const needsFix = outcomeNames.some(name => needsLLMFix(name));

            if (!needsFix) continue; // Skip events with clean data

            // This event needs LLM fixing!
            console.log(`\n[LLM Fixer] Fixing: "${event.title}"`);
            console.log(`  Original: ${outcomeNames.slice(0, 3).join(", ")}${outcomeNames.length > 3 ? "..." : ""}`);

            // Call Claude to fix the labels
            const fixedLabels = await fixOutcomeLabels(event.title, outcomeNames);
            totalLLMCalls++;

            // Apply fixed labels
            const fixedMarkets = subMarkets.map((m, i) => ({
                ...m,
                question: fixedLabels[i] || m.question
            }));

            console.log(`  Fixed:    ${fixedLabels.slice(0, 3).join(", ")}${fixedLabels.length > 3 ? "..." : ""}`);

            // Deduplicate by label
            const deduped = new Map<string, typeof fixedMarkets[0]>();
            for (const market of fixedMarkets) {
                const existing = deduped.get(market.question);
                if (!existing || market.price > existing.price) {
                    deduped.set(market.question, market);
                }
            }

            const category = mapKalshiCategory(event.category);
            const primaryMarket = eventMarkets[0];

            fixedEventsList.push({
                id: event.event_ticker,
                title: event.title,
                slug: event.event_ticker.toLowerCase(),
                description: event.sub_title || event.title,
                image: undefined,
                volume: subMarkets.reduce((sum, m) => sum + m.volume, 0),
                endDate: primaryMarket?.expiration_time,
                rules: primaryMarket?.subtitle || event.sub_title || "Market resolution based on official data.",
                openTime: undefined,
                closeTime: primaryMarket?.close_time,
                settlementTime: primaryMarket?.expiration_time,
                categories: [category, "Kalshi", "LLM-Fixed"],
                markets: Array.from(deduped.values()).sort((a, b) => b.price - a.price),
                isMultiOutcome: true,
            });

            fixedEvents++;

            // Rate limiting - small delay between LLM calls
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log(`\n[LLM Fixer] Fixed ${fixedEvents} events with ${totalLLMCalls} LLM calls`);

        if (fixedEventsList.length > 0) {
            // Get existing events from Redis
            const existingData = await redis.get("kalshi:active_list");
            const existingEvents = existingData ? JSON.parse(existingData) as EventMetadata[] : [];

            // Create a map of existing event IDs
            const existingIds = new Set(existingEvents.map(e => e.id));

            // Add fixed events that aren't already in the list
            let addedCount = 0;
            for (const fixedEvent of fixedEventsList) {
                if (!existingIds.has(fixedEvent.id)) {
                    existingEvents.push(fixedEvent);
                    addedCount++;
                }
            }

            // Sort by volume and save
            existingEvents.sort((a, b) => (b.volume || 0) - (a.volume || 0));
            await redis.set("kalshi:active_list", JSON.stringify(existingEvents));

            console.log(`[LLM Fixer] Added ${addedCount} new events to active list`);
            console.log(`[LLM Fixer] Total events now: ${existingEvents.length}`);

            // Show sample of fixed events
            console.log("\n[LLM Fixer] Sample fixed events:");
            for (const event of fixedEventsList.slice(0, 3)) {
                console.log(`  "${event.title}"`);
                console.log(`    Outcomes: ${event.markets.slice(0, 3).map(m => m.question).join(", ")}`);
            }
        }

        console.log("\n[LLM Fixer] ✅ Done!");

    } catch (error) {
        console.error("[LLM Fixer] Error:", error);
    } finally {
        redis.disconnect();
    }
}

main();
