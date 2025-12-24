import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TradeExecutor } from "@/lib/trade";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
    const session = await auth();

    const body = await req.json();
    let { userId, positionId } = body;

    // Fallback to session ID if not in body
    if (!userId && session?.user?.id) {
        userId = session.user.id;
    }

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!positionId) {
        return NextResponse.json({ error: "Position ID required" }, { status: 400 });
    }

    try {
        // Fetch the position
        const position = await db.query.positions.findFirst({
            where: eq(positions.id, positionId),
        });

        if (!position) {
            return NextResponse.json({ error: "Position not found" }, { status: 404 });
        }

        // Fetch the challenge
        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, position.challengeId),
        });

        // Verify ownership
        if (!challenge || challenge.userId !== userId) {
            return NextResponse.json({ error: "Unauthorized or challenge not found" }, { status: 403 });
        }

        // Close the position by selling all shares
        const shares = parseFloat(position.shares);

        // Get current market price to calculate sell amount
        const { MarketService } = await import("@/lib/market");
        const marketData = await MarketService.getLatestPrice(position.marketId);

        if (!marketData) {
            return NextResponse.json({ error: "Market data unavailable" }, { status: 500 });
        }

        const currentPrice = parseFloat(marketData.price);
        // Calculate the current market value of the position
        const marketValue = shares * currentPrice;

        // Execute SELL trade for the current market value
        const trade = await TradeExecutor.executeTrade(
            userId,
            position.marketId,
            "SELL",
            marketValue // Sell at current market value
        );

        // Fetch updated balance (challenge is updated by TradeExecutor)
        const updatedChallenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, challenge.id),
        });

        return NextResponse.json({
            success: true,
            trade: {
                id: trade.id,
                shares: parseFloat(trade.shares),
                price: parseFloat(trade.price),
            },
            newBalance: updatedChallenge?.currentBalance || challenge.currentBalance
        });

    } catch (error: any) {
        console.error("Close position failed:", error);
        return NextResponse.json({
            error: error.message || "Failed to close position"
        }, { status: 500 });
    }
}
