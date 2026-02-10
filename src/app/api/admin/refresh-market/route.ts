import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

interface PolyMarketResult {
    id?: string;
    question?: string;
    groupItemTitle?: string;
    active?: boolean;
    closed?: boolean;
    volume?: string;
    outcomePrices?: string;
    clobTokenIds?: string;
    outcomes?: string;
    endDate?: string;
    slug?: string;
}

/**
 * POST /api/admin/refresh-market
 * 
 * Force-refresh a specific market's price directly from Polymarket.
 * Use this to debug stale prices.
 */
export async function POST(req: Request) {
    const adminAuth = await requireAdmin();
    if (!adminAuth.isAuthorized) {
        return adminAuth.response;
    }

    try {
        const { marketId, query } = await req.json();

        if (!marketId && !query) {
            return NextResponse.json(
                { error: "Either marketId or query is required" },
                { status: 400 }
            );
        }

        let targetMarket: PolyMarketResult | null = null;

        if (query) {
            // Search for market by query
            console.log(`[Admin] Searching for market: "${query}"`);
            const searchUrl = `https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=50`;
            const searchRes = await fetch(searchUrl);
            const markets = await searchRes.json();

            if (Array.isArray(markets)) {
                const q = query.toLowerCase();
                targetMarket = markets.find((m: PolyMarketResult) =>
                    m.question?.toLowerCase().includes(q) ||
                    m.groupItemTitle?.toLowerCase().includes(q)
                );
            }
        } else if (marketId) {
            // Fetch specific market by ID
            console.log(`[Admin] Looking up market: ${marketId}`);
            const url = `https://gamma-api.polymarket.com/markets/${marketId}`;
            const res = await fetch(url);
            if (res.ok) {
                targetMarket = await res.json();
            }
        }

        if (!targetMarket) {
            return NextResponse.json(
                { error: "Market not found", query, marketId },
                { status: 404 }
            );
        }

        // Parse current prices from Polymarket
        let prices: number[] = [];
        try {
            prices = JSON.parse(targetMarket.outcomePrices || '[]');
        } catch { }

        const result = {
            found: true,
            market: {
                id: targetMarket.id,
                question: targetMarket.question,
                groupItemTitle: targetMarket.groupItemTitle,
                active: targetMarket.active,
                closed: targetMarket.closed,
                volume: targetMarket.volume,
                prices: prices,
                yesPrice: prices[0] ? (parseFloat(String(prices[0])) * 100).toFixed(1) + '%' : 'N/A',
                noPrice: prices[1] ? (parseFloat(String(prices[1])) * 100).toFixed(1) + '%' : 'N/A',
                clobTokenIds: targetMarket.clobTokenIds,
                outcomes: targetMarket.outcomes,
                endDate: targetMarket.endDate,
                lastUpdated: new Date().toISOString(),
                source: 'polymarket-gamma-api'
            }
        };

        console.log(`[Admin] Market refresh result:`, JSON.stringify(result, null, 2));

        return NextResponse.json(result);

    } catch (error) {
        console.error("[Admin] Refresh market error:", error);
        return NextResponse.json(
            { error: "Failed to refresh market" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/refresh-market?query=portugal
 * 
 * Quick search for market prices
 */
export async function GET(req: Request) {
    const adminAuth = await requireAdmin();
    if (!adminAuth.isAuthorized) {
        return adminAuth.response;
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    if (!query) {
        return NextResponse.json(
            { error: "query parameter required" },
            { status: 400 }
        );
    }

    try {
        console.log(`[Admin] Searching Polymarket for: "${query}"`);

        const q = query.toLowerCase();
        const matchingEvents: Array<{ title: string; slug: string; volume: number; markets: Array<{ question: string; yesPrice: string; volume: string; closed: boolean }> }> = [];
        const seenSlugs = new Set<string>();

        // Method 1: Targeted search using title_like parameter (most accurate)
        const targetedUrl = `https://gamma-api.polymarket.com/events?active=true&closed=false&limit=50&title_like=${encodeURIComponent(query)}`;
        const targetedRes = await fetch(targetedUrl);
        const targetedEvents = await targetedRes.json();

        if (Array.isArray(targetedEvents)) {
            for (const event of targetedEvents) {
                if (!seenSlugs.has(event.slug)) {
                    seenSlugs.add(event.slug);
                }
            }
            console.log(`[Admin] Targeted search found ${targetedEvents.length} events`);
        }

        // Method 2: Also search the top 500 events by volume for broader coverage
        const eventsUrl = `https://gamma-api.polymarket.com/events?active=true&closed=false&limit=500&order=volume&ascending=false`;
        const eventsRes = await fetch(eventsUrl);
        const allEvents = await eventsRes.json();

        // Combine both result sets
        const combinedEvents = [...(Array.isArray(targetedEvents) ? targetedEvents : [])];

        if (Array.isArray(allEvents)) {
            for (const event of allEvents) {
                if (!seenSlugs.has(event.slug) && event.title?.toLowerCase().includes(q)) {
                    combinedEvents.push(event);
                    seenSlugs.add(event.slug);
                }
            }
        }

        // Process all combined events into the response format
        for (const event of combinedEvents) {
            const markets: Array<{ question: string; yesPrice: string; volume: string; closed: boolean }> = [];

            for (const market of (event.markets || [])) {
                let prices: number[] = [];
                try {
                    prices = JSON.parse(market.outcomePrices || '[]');
                } catch { }

                markets.push({
                    question: market.question,
                    yesPrice: prices[0] ? (parseFloat(String(prices[0])) * 100).toFixed(1) + '%' : 'N/A',
                    volume: market.volume,
                    closed: market.closed
                });
            }

            // Sort by price descending
            markets.sort((a, b) => parseFloat(b.yesPrice) - parseFloat(a.yesPrice));

            matchingEvents.push({
                title: event.title,
                slug: event.slug,
                volume: event.volume,
                markets: markets.slice(0, 10) // Top 10 outcomes
            });
        }

        return NextResponse.json({
            query,
            foundEvents: matchingEvents.length,
            events: matchingEvents,
            timestamp: new Date().toISOString(),
            source: 'polymarket-gamma-api'
        });

    } catch (error) {
        console.error("[Admin] Market search error:", error);
        return NextResponse.json(
            { error: "Search failed" },
            { status: 500 }
        );
    }
}
