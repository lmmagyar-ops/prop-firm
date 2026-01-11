import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { MarketService } from "@/lib/market";
import { getDirectionAdjustedPrice } from "@/lib/position-utils";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 });
        }

        // Fetch all challenges for this user (active and completed)
        const userChallenges = await db
            .select()
            .from(challenges)
            .where(eq(challenges.userId, userId));

        // Filter to only active challenges for the selector
        const activeChallenges = userChallenges.filter(c => c.status === "active");

        // Calculate equity for each challenge (cash + position value)
        const challengesWithEquity = await Promise.all(
            activeChallenges.map(async (c) => {
                const cashBalance = parseFloat(c.currentBalance || "0");

                // Get open positions for this challenge
                const openPositions = await db.query.positions.findMany({
                    where: and(
                        eq(positions.challengeId, c.id),
                        eq(positions.status, "OPEN")
                    )
                });

                // PERF: Batch fetch prices instead of N+1 queries
                const marketIds = openPositions.map(p => p.marketId);
                const livePrices = marketIds.length > 0
                    ? await MarketService.getBatchOrderBookPrices(marketIds)
                    : new Map();

                // Calculate position value with live prices
                let positionValue = 0;
                for (const pos of openPositions) {
                    const shares = parseFloat(pos.shares);
                    const livePrice = livePrices.get(pos.marketId);
                    const rawPrice = livePrice
                        ? parseFloat(livePrice.price)
                        : parseFloat(pos.entryPrice);

                    // Use shared utility for direction adjustment
                    const adjustedPrice = getDirectionAdjustedPrice(rawPrice, pos.direction as 'YES' | 'NO');
                    positionValue += shares * adjustedPrice;
                }

                const equity = cashBalance + positionValue;

                return {
                    id: c.id,
                    tier: "standard",
                    accountNumber: c.id.slice(0, 8).toUpperCase(),
                    currentBalance: c.currentBalance,
                    startingBalance: c.startingBalance,
                    equity: equity.toFixed(2),
                    positionValue: positionValue.toFixed(2),
                    status: c.status,
                    startedAt: c.startedAt,
                    platform: c.platform || "polymarket"
                };
            })
        );

        return NextResponse.json({ challenges: challengesWithEquity });
    } catch (error) {
        console.error("Failed to fetch challenges:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
