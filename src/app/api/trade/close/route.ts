import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TradeExecutor } from "@/lib/trade";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkIdempotency, cacheIdempotencyResult } from "@/lib/trade-idempotency";

export async function POST(req: NextRequest) {
    const session = await auth();

    // SECURITY: ALWAYS use session userId, never trust body
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { positionId, idempotencyKey } = body;
    // NOTE: userId intentionally NOT destructured from body - security fix

    if (!positionId) {
        return NextResponse.json({ error: "Position ID required" }, { status: 400 });
    }

    // IDEMPOTENCY GUARD: Prevent duplicate close execution on client retries
    if (idempotencyKey) {
        const { isDuplicate, cachedResponse } = await checkIdempotency(idempotencyKey);
        if (isDuplicate) {
            if (cachedResponse && typeof cachedResponse === 'object' && 'inProgress' in cachedResponse) {
                return NextResponse.json({ error: "Close already in progress" }, { status: 409 });
            }
            return NextResponse.json(cachedResponse);
        }
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
            where: eq(challenges.id, String(position.challengeId)),
        });

        // Verify ownership
        if (!challenge || challenge.userId !== userId) {
            return NextResponse.json({ error: "Unauthorized or challenge not found" }, { status: 403 });
        }

        // Close the position by selling all shares
        const shares = parseFloat(position.shares);
        // Derive cost basis from entry price × shares (immune to sizeAmount drift)
        const costBasis = shares * parseFloat(position.entryPrice);

        // Get current market price to calculate sell amount
        const { MarketService } = await import("@/lib/market");
        const marketData = await MarketService.getLatestPrice(position.marketId);

        if (!marketData) {
            return NextResponse.json({ error: "Market data unavailable" }, { status: 500 });
        }

        const currentPrice = parseFloat(marketData.price);
        // For NO positions, use NO price (1 - YES price) for correct market value calculation
        const posDirection = position.direction as "YES" | "NO";
        const noAdjustedPrice = posDirection === "NO" ? (1 - currentPrice) : currentPrice;
        // Calculate the current market value of the position
        const marketValue = shares * noAdjustedPrice;

        // Execute SELL trade with explicit share count
        // CRITICAL: Pass shares explicitly to avoid recalculation mismatch
        const trade = await TradeExecutor.executeTrade(
            userId,
            challenge.id,
            position.marketId,
            "SELL",
            marketValue, // Approximate market value (amount is overridden by shares option)
            posDirection, // Pass direction to correctly identify which position to close
            { shares } // Explicitly pass share count to sell
        );

        // Fetch updated balance (challenge is updated by TradeExecutor)
        const updatedChallenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, challenge.id),
        });

        // Calculate proceeds and P&L for display
        const proceeds = parseFloat(trade.shares) * parseFloat(trade.price);
        const pnl = proceeds - costBasis; // Profit/loss = what you got back - what you invested

        const responsePayload = {
            success: true,
            proceeds, // Amount user received from closing
            costBasis, // Cost basis (entryPrice × shares)
            pnl,      // Profit or loss
            trade: {
                id: trade.id,
                shares: parseFloat(trade.shares),
                price: parseFloat(trade.price),
            },
            newBalance: updatedChallenge?.currentBalance || challenge.currentBalance
        };

        // Cache response for idempotency (if key was provided)
        if (idempotencyKey) {
            await cacheIdempotencyResult(idempotencyKey, responsePayload);
        }

        return NextResponse.json(responsePayload);

    } catch (error: unknown) {
        console.error("Close position failed:", error);
        // SECURITY: Never expose internal error details (SQL structure, schema) to client
        return NextResponse.json({
            error: "Failed to close position"
        }, { status: 500 });
    }
}
