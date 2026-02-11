import { NextResponse } from "next/server";
import Redis from "ioredis";
import { getErrorMessage } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";

// Priority: REDIS_URL (Railway) > REDIS_HOST/PASSWORD (legacy Upstash) > localhost
const getRedisConfig = () => {
    if (process.env.REDIS_URL) {
        return process.env.REDIS_URL;
    }
    if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
        return {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
            tls: {}
        };
    }
    return "redis://localhost:6380";
};

export async function GET() {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    const redis = new Redis(getRedisConfig() as any);

    try {
        console.log("[RefreshMarkets] Fetching fresh data from Polymarket...");

        // Fetch featured events
        const url = "https://gamma-api.polymarket.com/events?featured=true&active=true&closed=false&limit=50";
        const response = await fetch(url);
        const events = await response.json();

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

        // Store in Redis
        await redis.set("event:active_list", JSON.stringify(processedEvents));

        // Verify with Fed Chair example
        const stored = JSON.parse(await redis.get("event:active_list") || "[]");
        const fedChair = stored.find((e: any) => e.title?.toLowerCase().includes("fed chair"));

        const verification = fedChair ? {
            title: fedChair.title,
            marketsCount: fedChair.markets.length,
            firstMarket: fedChair.markets[0]?.question,
            firstPrice: (fedChair.markets[0]?.price * 100).toFixed(1) + "%"
        } : null;

        return NextResponse.json({
            success: true,
            message: `Refreshed ${processedEvents.length} events with ${totalMarkets} markets`,
            verification
        });

    } catch (error: unknown) {
        console.error("[RefreshMarkets] Error:", error);
        return NextResponse.json({
            success: false,
            error: getErrorMessage(error)
        }, { status: 500 });
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
