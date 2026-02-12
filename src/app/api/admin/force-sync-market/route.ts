import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { forceSync, getAllMarketData } from "@/lib/worker-client";
import { createLogger } from "@/lib/logger";
const logger = createLogger("ForceSyncMarket");

interface PolyMarket {
    question?: string;
    closed?: boolean;
    archived?: boolean;
    outcomePrices?: string;
    clobTokenIds?: string;
    outcomes?: string;
    volume?: string;
}

interface PolyEvent {
    id?: string;
    slug: string;
    title: string;
    description?: string;
    image?: string;
    volume?: number;
    markets?: PolyMarket[];
}

interface ProcessedMarket {
    id: string;
    question: string;
    outcomes: string[];
    price: number;
    volume: number;
}

interface ProcessedEvent {
    id: string;
    title: string;
    slug: string;
    description?: string;
    image?: string;
    volume: number;
    categories: string[];
    markets: ProcessedMarket[];
    isMultiOutcome: boolean;
}

/**
 * POST /api/admin/force-sync-market
 * 
 * EMERGENCY BYPASS: Fetches fresh market data from Polymarket and writes
 * to Redis via the ingestion-worker's HTTP API. No direct Redis connection.
 */

export async function POST(req: Request) {
    const adminAuth = await requireAdmin();
    if (!adminAuth.isAuthorized) {
        return adminAuth.response;
    }

    try {
        const { query, syncAll } = await req.json();

        if (!query && !syncAll) {
            return NextResponse.json(
                { error: "Provide 'query' to sync specific event, or 'syncAll: true' for full sync" },
                { status: 400 }
            );
        }

        logger.info(`[FORCE_SYNC] Admin triggered force sync: query="${query}", syncAll=${syncAll}`);

        // Fetch current events from worker
        const currentData = await getAllMarketData();
        const currentEvents: ProcessedEvent[] = currentData?.events
            ? (currentData.events as ProcessedEvent[])
            : [];

        let updatedCount = 0;
        let addedCount = 0;
        const syncLog: string[] = [];

        if (syncAll) {
            // Full sync: Fetch top 500 events from Polymarket
            logger.info(`[FORCE_SYNC] Performing full sync...`);
            const freshEvents = await fetchAndProcessEvents(500);

            const success = await forceSync("event:active_list", freshEvents);
            if (!success) throw new Error("Failed to write to Redis via worker");

            syncLog.push(`Full sync complete: ${freshEvents.length} events stored`);
            updatedCount = freshEvents.length;
        } else {
            // Targeted sync: Find and update specific event
            const q = query.toLowerCase();

            // Fetch fresh data from Polymarket using title_like
            const targetedUrl = `https://gamma-api.polymarket.com/events?active=true&closed=false&limit=50&title_like=${encodeURIComponent(query)}`;
            const res = await fetch(targetedUrl);
            const freshEvents = await res.json();

            if (!Array.isArray(freshEvents) || freshEvents.length === 0) {
                return NextResponse.json({
                    success: false,
                    error: `No events found matching "${query}"`,
                    searchUrl: targetedUrl
                }, { status: 404 });
            }

            // Process each matching event
            for (const freshEvent of freshEvents) {
                if (!freshEvent.title?.toLowerCase().includes(q)) continue;

                const processedEvent = processEvent(freshEvent);
                if (!processedEvent) continue;

                // Find existing event in current list
                const existingIndex = currentEvents.findIndex(
                    (e: ProcessedEvent) => e.slug === freshEvent.slug || e.id === freshEvent.id
                );

                if (existingIndex >= 0) {
                    // Update existing
                    currentEvents[existingIndex] = processedEvent;
                    syncLog.push(`Updated: "${freshEvent.title}" with ${processedEvent.markets.length} markets`);
                    updatedCount++;
                } else {
                    // Add new
                    currentEvents.push(processedEvent);
                    syncLog.push(`Added: "${freshEvent.title}" with ${processedEvent.markets.length} markets`);
                    addedCount++;
                }

                // Also update individual market prices via worker
                for (const market of processedEvent.markets) {
                    await forceSync(`price:${market.id}`, market.price.toString());
                    syncLog.push(`  → Price updated: ${market.question} = ${(market.price * 100).toFixed(1)}%`);
                }
            }

            // Save updated events back via worker
            const success = await forceSync("event:active_list", currentEvents);
            if (!success) throw new Error("Failed to write updated events to Redis via worker");
        }

        const result = {
            success: true,
            query: query || 'FULL_SYNC',
            updated: updatedCount,
            added: addedCount,
            totalEvents: currentEvents.length,
            log: syncLog,
            timestamp: new Date().toISOString()
        };

        logger.info(`[FORCE_SYNC] Complete:`, JSON.stringify(result, null, 2));
        return NextResponse.json(result);

    } catch (error) {
        logger.error("[FORCE_SYNC] Error:", error);
        return NextResponse.json(
            { error: "Sync failed", details: String(error) },
            { status: 500 }
        );
    }
}

/**
 * Process a single event from Polymarket API into our format
 */
function processEvent(event: PolyEvent): ProcessedEvent | null {
    if (!event.markets || event.markets.length === 0) return null;

    const subMarkets: ProcessedMarket[] = [];
    const seenQuestions = new Set<string>();

    for (const market of event.markets) {
        if (market.closed || market.archived) continue;

        const normalizedQ = market.question?.trim().toLowerCase();
        if (!normalizedQ || seenQuestions.has(normalizedQ)) continue;
        seenQuestions.add(normalizedQ);

        let prices: number[] = [];
        let clobTokens: string[] = [];
        let outcomes: string[] = [];

        try {
            prices = JSON.parse(market.outcomePrices || '[]');
            clobTokens = JSON.parse(market.clobTokenIds || '[]');
            outcomes = JSON.parse(market.outcomes || '[]');
        } catch { continue; }

        if (clobTokens.length === 0) continue;

        const tokenId = clobTokens[0];
        const yesPrice = parseFloat(String(prices[0]) || "0");

        // Skip invalid prices
        if (yesPrice < 0.001) continue;

        subMarkets.push({
            id: tokenId,
            question: cleanOutcomeName(market.question || ""),
            outcomes: outcomes,
            price: Math.max(yesPrice, 0.01),
            volume: parseFloat(market.volume || "0"),
        });
    }

    if (subMarkets.length === 0) return null;

    // Sort by price descending
    subMarkets.sort((a, b) => b.price - a.price);

    return {
        id: event.id || event.slug,
        title: event.title,
        slug: event.slug,
        description: event.description,
        image: event.image,
        volume: event.volume || 0,
        categories: getCategories(event.title),
        markets: subMarkets,
        isMultiOutcome: subMarkets.length > 1,
    };
}

/**
 * Fetch and process events from Polymarket
 */
async function fetchAndProcessEvents(limit: number): Promise<ProcessedEvent[]> {
    const url = `https://gamma-api.polymarket.com/events?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false`;
    const res = await fetch(url);
    const events = await res.json();

    if (!Array.isArray(events)) return [];

    const processed: ProcessedEvent[] = [];
    const seenSlugs = new Set<string>();

    for (const event of events) {
        if (seenSlugs.has(event.slug)) continue;
        seenSlugs.add(event.slug);

        const processedEvent = processEvent(event);
        if (processedEvent) {
            processed.push(processedEvent);
        }
    }

    return processed;
}

/**
 * Clean outcome name
 */
function cleanOutcomeName(name: string): string {
    if (!name) return "";
    let cleaned = name.trim();
    const prefixes = ['the ', 'a ', 'an '];
    const lowerCleaned = cleaned.toLowerCase();
    for (const prefix of prefixes) {
        if (lowerCleaned.startsWith(prefix)) {
            cleaned = cleaned.slice(prefix.length);
        }
    }
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
}

/**
 * Get categories for an event based on title keywords
 */
function getCategories(title: string): string[] {
    const lower = title.toLowerCase();
    const categories: string[] = [];

    if (lower.includes('election') || lower.includes('president') || lower.includes('prime minister')) {
        categories.push('Politics');
    }
    if (lower.includes('bitcoin') || lower.includes('ethereum') || lower.includes('crypto')) {
        categories.push('Crypto');
    }
    if (lower.includes('nfl') || lower.includes('nba') || lower.includes('super bowl') ||
        lower.includes('world series') || lower.includes('champions league')) {
        categories.push('Sports');
    }
    if (lower.includes('ai') || lower.includes('tech') || lower.includes('apple') ||
        lower.includes('google') || lower.includes('tesla')) {
        categories.push('Tech');
    }

    if (categories.length === 0) {
        categories.push('Other');
    }

    return categories;
}

/**
 * GET /api/admin/force-sync-market
 * 
 * Quick status check and usage instructions
 */
export async function GET() {
    const adminAuth = await requireAdmin();
    if (!adminAuth.isAuthorized) {
        return adminAuth.response;
    }

    // Get current state from worker
    const data = await getAllMarketData();
    const currentEvents = data?.events ? (data.events as ProcessedEvent[]) : [];

    return NextResponse.json({
        status: "ready",
        currentEventCount: currentEvents.length,
        usage: {
            targetedSync: "POST with { query: 'portugal' } to sync specific event",
            fullSync: "POST with { syncAll: true } to replace all events with fresh data"
        },
        example: {
            curl: "curl -X POST -H 'Content-Type: application/json' -d '{\"query\":\"portugal\"}' /api/admin/force-sync-market"
        }
    });
}
