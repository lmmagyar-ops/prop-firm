import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { forceSync, getAllMarketData } from "@/lib/worker-client";

/**
 * GET /api/refresh-markets
 * 
 * Admin endpoint: Fetches fresh data from Polymarket and writes to Redis
 * via the ingestion-worker's HTTP API. No direct Redis connection.
 */
export async function GET() {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        console.log("[RefreshMarkets] Fetching fresh data from Polymarket...");

        // Fetch featured events
        const url = "https://gamma-api.polymarket.com/events?featured=true&active=true&closed=false&limit=50";
        const apiResponse = await fetch(url);
        const events = await apiResponse.json();

        if (!Array.isArray(events)) {
            throw new Error("Invalid API response");
        }

        const processedEvents = [];
        let totalMarkets = 0;

        for (const event of events) {
            if (!event.markets || event.markets.length === 0) continue;

            const subMarkets = [];
            for (const market of event.markets) {
                if (market.closed || market.archived) continue;

                const clobTokens = JSON.parse(market.clobTokenIds || '[]');
                const outcomes = JSON.parse(market.outcomes || '[]');
                const prices = JSON.parse(market.outcomePrices || '[]');

                if (clobTokens.length === 0) continue;

                const tokenId = clobTokens[0];
                const yesPrice = parseFloat(prices[0] || "0.5");

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
            subMarkets.sort((a, b) => b.price - a.price);

            const categories = getCategories(event.title);

            processedEvents.push({
                id: event.id || event.slug,
                title: event.title,
                slug: event.slug,
                description: event.description,
                image: event.image,
                volume: event.volume || 0,
                categories: categories,
                markets: subMarkets,
                isMultiOutcome: subMarkets.length > 1,
            });
        }

        // Write to Redis via the worker's HTTP API (no direct Redis connection)
        const success = await forceSync("event:active_list", processedEvents);

        if (!success) {
            throw new Error("Failed to write to Redis via worker API");
        }

        return NextResponse.json({
            success: true,
            message: `Refreshed ${processedEvents.length} events with ${totalMarkets} markets`,
        });

    } catch (error: unknown) {
        console.error("[RefreshMarkets] Error:", error);
        return NextResponse.json({
            success: false,
            error: String(error)
        }, { status: 500 });
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
