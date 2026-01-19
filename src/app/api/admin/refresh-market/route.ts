import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

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

        let targetMarket: any = null;

        if (query) {
            // Search for market by query
            console.log(`[Admin] Searching for market: "${query}"`);
            const searchUrl = `https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=50`;
            const searchRes = await fetch(searchUrl);
            const markets = await searchRes.json();

            if (Array.isArray(markets)) {
                const q = query.toLowerCase();
                targetMarket = markets.find((m: any) =>
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
                yesPrice: prices[0] ? (parseFloat(prices[0]) * 100).toFixed(1) + '%' : 'N/A',
                noPrice: prices[1] ? (parseFloat(prices[1]) * 100).toFixed(1) + '%' : 'N/A',
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

        // Search events (includes multi-outcome markets like elections)
        const eventsUrl = `https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100`;
        const eventsRes = await fetch(eventsUrl);
        const events = await eventsRes.json();

        const q = query.toLowerCase();
        const matchingEvents: any[] = [];

        if (Array.isArray(events)) {
            for (const event of events) {
                if (event.title?.toLowerCase().includes(q)) {
                    const markets: any[] = [];

                    for (const market of (event.markets || [])) {
                        let prices: number[] = [];
                        try {
                            prices = JSON.parse(market.outcomePrices || '[]');
                        } catch { }

                        markets.push({
                            question: market.question,
                            yesPrice: prices[0] ? (parseFloat(prices[0]) * 100).toFixed(1) + '%' : 'N/A',
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
            }
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
