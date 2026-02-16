import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { MarketService } from "@/lib/market";
import { getPortfolioValue } from "@/lib/position-utils";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Balance");

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get selected challenge from cookie
        const cookieStore = await cookies();
        const selectedChallengeId = cookieStore.get("selectedChallengeId")?.value;

        let activeChallenge;

        if (selectedChallengeId) {
            activeChallenge = await db.query.challenges.findFirst({
                where: and(
                    eq(challenges.id, selectedChallengeId),
                    eq(challenges.userId, session.user.id),
                    eq(challenges.status, "active")
                ),
            });
        }

        // Fallback to first active challenge
        if (!activeChallenge) {
            activeChallenge = await db.query.challenges.findFirst({
                where: and(
                    eq(challenges.userId, session.user.id),
                    eq(challenges.status, "active")
                ),
            });
        }

        if (!activeChallenge) {
            return NextResponse.json({ balance: 0, equity: 0 });
        }

        // Compute true equity = cash + position value (using LIVE Redis prices)
        const cash = parseFloat(activeChallenge.currentBalance);

        const openPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, activeChallenge.id),
                eq(positions.status, "OPEN")
            ),
        });

        // Fetch live prices from Redis (same source as getDashboardData)
        const marketIds = openPositions.map(p => p.marketId);
        const livePrices = marketIds.length > 0
            ? await MarketService.getBatchOrderBookPrices(marketIds)
            : new Map();

        // Use single source of truth for portfolio valuation (position-utils.ts)
        // Previously had inline > 0.01 && < 0.99 range that excluded resolved prices
        const portfolio = getPortfolioValue(openPositions, livePrices);

        const equity = cash + portfolio.totalValue;

        return NextResponse.json({
            balance: cash,
            equity,
            positionValue: portfolio.totalValue,
            positionCount: openPositions.length,
        });

    } catch (error) {
        logger.error("Failed to fetch balance:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
