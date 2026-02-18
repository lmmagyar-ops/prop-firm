import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MarketService } from "@/lib/market";
import { createLogger } from "@/lib/logger";
import { calculatePositionMetrics } from "@/lib/position-utils";
import { isValidMarketPrice } from "@/lib/price-validation";

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

    // Batch fetch all market titles — uses CANONICAL MarketService.getBatchTitles()
    // (Redis event lists + DB fallback for resolved markets)
    const titleMap = await MarketService.getBatchTitles(marketIds);

    // Map positions with pre-fetched prices and titles
    const mapped = openPositions.map((pos) => {
        const entry = parseFloat(pos.entryPrice);
        const shares = parseFloat(pos.shares);
        const direction = (pos.direction as "YES" | "NO") || "YES";

        // Get price from batch-fetched map (this is the YES/bid price from order book)
        const marketData = priceMap.get(pos.marketId);
        let rawPrice = marketData ? parseFloat(marketData.price) : null;

        // Validate price using centralized validator (accepts 0 ≤ p ≤ 1)
        if (!rawPrice || !isValidMarketPrice(rawPrice)) {
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

        // SINGLE SOURCE OF TRUTH: Use canonical function from position-utils.ts
        // Handles direction adjustment (NO = 1 - price) and PnL calculation.
        // entryPrice from DB is already direction-adjusted; only rawPrice needs adjustment.
        const { effectiveCurrentPrice, unrealizedPnL } = calculatePositionMetrics(shares, entry, rawPrice, direction);

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
