import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, positions, trades } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MarketService } from "@/lib/market";
import { createLogger } from "@/lib/logger";
import { getDirectionAdjustedPrice } from "@/lib/position-utils";
import { getAllMarketData } from "@/lib/worker-client";

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

    // Batch fetch all market titles at once (via worker HTTP)
    const titleMap = await getBatchMarketTitles(marketIds);

    // Map positions with pre-fetched prices and titles
    const mapped = openPositions.map((pos) => {
        const entry = parseFloat(pos.entryPrice);
        const shares = parseFloat(pos.shares);
        const direction = (pos.direction as "YES" | "NO") || "YES";

        // Get price from batch-fetched map (this is the YES/bid price from order book)
        const marketData = priceMap.get(pos.marketId);
        let rawPrice = marketData ? parseFloat(marketData.price) : null;

        // SANITY CHECK: Validate price is reasonable for active market
        // If price is 0, NaN, or out of valid range, use entry price as fallback
        if (!rawPrice || rawPrice <= 0.01 || rawPrice >= 0.99 || isNaN(rawPrice)) {
            if (marketData) {
                log.warn("Invalid live price detected, using entry price fallback", {
                    marketId: pos.marketId.slice(0, 12),
                    invalidPrice: marketData.price,
                    source: marketData.source,
                    fallbackTo: entry
                });
            }
            rawPrice = entry; // Fall back to entry price (safe, shows 0 P&L)
        }

        // Use shared utility for direction-adjusted calculations
        // NOTE: Entry price from DB is ALREADY direction-adjusted (see trade.ts line 175-177)
        // Only the current/raw price from order book needs direction adjustment
        const effectiveCurrentPrice = getDirectionAdjustedPrice(rawPrice, direction);
        const effectiveEntryPrice = entry; // DO NOT adjust - already stored direction-adjusted!
        const unrealizedPnL = (effectiveCurrentPrice - effectiveEntryPrice) * shares;

        // Get title from batch-fetched map
        const marketTitle = titleMap.get(pos.marketId) || pos.marketId.slice(0, 20) + "...";

        return {
            id: pos.id,
            marketId: pos.marketId,
            marketTitle,
            direction,
            shares,
            avgPrice: entry,
            currentPrice: effectiveCurrentPrice,
            unrealizedPnL,
            priceSource: marketData?.source || 'stored'
        };
    });

    return NextResponse.json({ positions: mapped });
}

// Batch fetch market titles for multiple markets via worker HTTP API
async function getBatchMarketTitles(marketIds: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    if (marketIds.length === 0) return results;

    try {
        // Load event lists from worker (uses in-memory cache from worker-client)
        const data = await getAllMarketData();
        if (!data) return results;

        // Build market lookup maps
        const kalshiEvents = (data.kalshi || []) as { markets?: { id: string; question?: string }[]; title?: string }[];
        const polyEvents = (data.events || []) as { markets?: { id: string; question?: string }[]; title?: string }[];

        const kalshiMarkets = new Map<string, { title: string }>();
        const polyMarkets = new Map<string, { title: string }>();

        for (const event of kalshiEvents) {
            for (const market of event.markets || []) {
                kalshiMarkets.set(market.id, {
                    title: market.question || event.title || market.id.slice(0, 20)
                });
            }
        }

        for (const event of polyEvents) {
            for (const market of event.markets || []) {
                polyMarkets.set(market.id, {
                    title: market.question || event.title || market.id.slice(0, 20)
                });
            }
        }

        // Get titles for each market
        const missingIds: string[] = [];
        for (const marketId of marketIds) {
            const market = kalshiMarkets.get(marketId) || polyMarkets.get(marketId);
            if (market) {
                results.set(marketId, market.title);
            } else if (marketId.includes("-")) {
                // Fallback: clean ticker suffix for Kalshi tickers
                const parts = marketId.split("-");
                results.set(marketId, parts[parts.length - 1]);
            } else {
                missingIds.push(marketId);
            }
        }

        // DB fallback: look up titles from trades table for resolved markets
        if (missingIds.length > 0) {
            const tradeRecords = await db.query.trades.findMany({
                where: inArray(trades.marketId, missingIds),
                columns: { marketId: true, marketTitle: true }
            });
            const dbTitles = new Map<string, string>();
            for (const t of tradeRecords) {
                if (t.marketTitle && !dbTitles.has(t.marketId)) {
                    dbTitles.set(t.marketId, t.marketTitle);
                }
            }
            for (const marketId of missingIds) {
                results.set(marketId, dbTitles.get(marketId) || marketId.slice(0, 20) + "...");
            }
        }

        log.debug("Batch fetched market titles", { count: results.size });
    } catch (e) {
        log.error("Error batch fetching market titles", e);
        // Fallback to simple truncation
        for (const marketId of marketIds) {
            results.set(marketId, marketId.slice(0, 20) + "...");
        }
    }

    return results;
}
