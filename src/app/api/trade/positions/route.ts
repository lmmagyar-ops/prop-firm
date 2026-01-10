import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MarketService } from "@/lib/market";
import { createLogger } from "@/lib/logger";

const log = createLogger("PositionsAPI");

export async function GET() {
    const session = await auth();

    log.debug("Session check", { hasSession: !!session, userId: session?.user?.id || "NONE" });

    if (!session?.user?.id) return NextResponse.json({ positions: [] });

    // Get the selected challenge from cookie (matches what header shows)
    const cookieStore = await cookies();
    const selectedChallengeId = cookieStore.get("selectedChallengeId")?.value;

    let activeChallenge;

    if (selectedChallengeId) {
        // Use the selected challenge
        activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.id, selectedChallengeId),
                eq(challenges.userId, session.user.id),
                eq(challenges.status, "active")
            )
        });
    }

    // Fallback to first active challenge if selected not found
    if (!activeChallenge) {
        activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, session.user.id),
                eq(challenges.status, "active")
            )
        });
    }

    log.debug("Using challenge", {
        selectedFromCookie: selectedChallengeId?.slice(0, 8) || "NONE",
        found: !!activeChallenge,
        id: activeChallenge?.id?.slice(0, 8) || "NONE",
    });

    if (!activeChallenge) return NextResponse.json({ positions: [] });

    // Query positions for this challenge
    const openPositions = await db.query.positions.findMany({
        where: and(
            eq(positions.challengeId, activeChallenge.id),
            eq(positions.status, "OPEN")
        )
    });

    log.debug("Found positions", { count: openPositions.length });

    // Batch fetch all prices from ORDER BOOKS (same source as trade execution)
    // This ensures PnL display matches trade execution pricing
    const marketIds = openPositions.map(pos => pos.marketId);
    const priceMap = await MarketService.getBatchOrderBookPrices(marketIds);

    // Batch fetch all market titles at once
    const titleMap = await getBatchMarketTitles(marketIds);

    // Map positions with pre-fetched prices and titles
    const mapped = openPositions.map((pos) => {
        const entry = parseFloat(pos.entryPrice);
        const shares = parseFloat(pos.shares);
        const direction = (pos.direction as "YES" | "NO") || "YES";

        // Get price from batch-fetched map (this is the YES/bid price from order book)
        const marketData = priceMap.get(pos.marketId);
        const rawPrice = marketData ? parseFloat(marketData.price) : entry;

        // Handle NO direction: P&L is inverted (profit when price drops)
        // For NO positions: effective value = 1 - yesPrice
        const isNo = direction === 'NO';
        const effectiveCurrentValue = isNo ? (1 - rawPrice) : rawPrice;
        const effectiveEntryValue = isNo ? (1 - entry) : entry;
        const unrealizedPnL = (effectiveCurrentValue - effectiveEntryValue) * shares;

        // Get title from batch-fetched map
        const marketTitle = titleMap.get(pos.marketId) || pos.marketId.slice(0, 20) + "...";

        return {
            id: pos.id,
            marketId: pos.marketId,
            marketTitle,
            direction,
            shares,
            avgPrice: entry,
            currentPrice: rawPrice,
            unrealizedPnL,
            priceSource: marketData?.source || 'stored'
        };
    });

    return NextResponse.json({ positions: mapped });
}

// Batch fetch market titles for multiple markets in a single Redis operation
async function getBatchMarketTitles(marketIds: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    if (marketIds.length === 0) return results;

    const Redis = (await import("ioredis")).default;
    const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6380", {
        connectTimeout: 2000,
        commandTimeout: 2000,
    });

    try {
        // Load event lists once
        const [kalshiData, polyData] = await Promise.all([
            redis.get("kalshi:active_list"),
            redis.get("event:active_list")
        ]);

        // Build market lookup maps
        const kalshiMarkets = new Map<string, any>();
        const polyMarkets = new Map<string, any>();

        if (kalshiData) {
            const events = JSON.parse(kalshiData);
            for (const event of events) {
                for (const market of event.markets || []) {
                    kalshiMarkets.set(market.id, {
                        title: market.question || event.title || market.id.slice(0, 20)
                    });
                }
            }
        }

        if (polyData) {
            const events = JSON.parse(polyData);
            for (const event of events) {
                for (const market of event.markets || []) {
                    polyMarkets.set(market.id, {
                        title: market.question || event.title || market.id.slice(0, 20)
                    });
                }
            }
        }

        // Get titles for each market
        for (const marketId of marketIds) {
            const market = kalshiMarkets.get(marketId) || polyMarkets.get(marketId);
            if (market) {
                results.set(marketId, market.title);
            } else if (marketId.includes("-")) {
                // Fallback: clean ticker suffix for Kalshi tickers
                const parts = marketId.split("-");
                results.set(marketId, parts[parts.length - 1]);
            } else {
                results.set(marketId, marketId.slice(0, 20) + "...");
            }
        }

        log.debug("Batch fetched market titles", { count: results.size });
    } catch (e) {
        log.error("Error batch fetching market titles", e);
        // Fallback to simple truncation
        for (const marketId of marketIds) {
            results.set(marketId, marketId.slice(0, 20) + "...");
        }
    } finally {
        redis.disconnect();
    }

    return results;
}

// Legacy helper kept for compatibility (now unused)
async function getMarketTitle(marketId: string): Promise<string> {
    const titles = await getBatchMarketTitles([marketId]);
    return titles.get(marketId) || marketId.slice(0, 20) + "...";
}

