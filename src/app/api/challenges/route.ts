import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { MarketService } from "@/lib/market";

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

                // Calculate position value with live prices
                let positionValue = 0;
                for (const pos of openPositions) {
                    const shares = parseFloat(pos.shares);
                    const marketData = await MarketService.getLatestPrice(pos.marketId);
                    const currentPrice = marketData ? parseFloat(marketData.price) : parseFloat(pos.entryPrice);
                    positionValue += shares * currentPrice;
                }

                const equity = cashBalance + positionValue;

                return {
                    id: c.id,
                    tier: "standard",
                    accountNumber: c.id.slice(0, 8).toUpperCase(),
                    currentBalance: c.currentBalance,
                    startingBalance: c.startingBalance,
                    equity: equity.toFixed(2), // NEW: Total equity (cash + positions)
                    positionValue: positionValue.toFixed(2), // NEW: Value of open positions
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
