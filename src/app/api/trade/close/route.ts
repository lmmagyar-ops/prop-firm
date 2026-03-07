import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TradeExecutor } from "@/lib/trade";
import { ChallengeEvaluator } from "@/lib/evaluator";
import { db } from "@/db";
import { challenges, positions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkIdempotency, cacheIdempotencyResult } from "@/lib/trade-idempotency";
import { createLogger } from "@/lib/logger";
import { getDirectionAdjustedPrice } from "@/lib/position-utils";
const logger = createLogger("Close");

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

    // FAN-OUT: fetch user suspension flag + position simultaneously — they're independent.
    // Both are needed before we proceed; neither depends on the other.
    // Challenge fetch must follow position (we need position.challengeId).
    const [userRecord, position] = await Promise.all([
        db.select({ isActive: users.isActive }).from(users).where(eq(users.id, userId)),
        db.query.positions.findFirst({ where: eq(positions.id, positionId) }),
    ]);

    const user = userRecord[0];
    if (user && user.isActive === false) {
        return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    if (!position) {
        return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    try {

        // Fetch the challenge (needs position.challengeId — can't be parallelized further up)
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
            return NextResponse.json(
                { error: "Price temporarily unavailable — please try again in a moment" },
                { status: 503 }
            );
        }

        const currentPrice = parseFloat(marketData.price);
        // SINGLE SOURCE OF TRUTH: Use canonical direction adjustment from position-utils.ts
        const posDirection = position.direction as "YES" | "NO";
        const noAdjustedPrice = getDirectionAdjustedPrice(currentPrice, posDirection);
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

        // AWAIT evaluator: The evaluator runs fire-and-forget inside TradeExecutor,
        // but for SELL trades we MUST wait for it to finish before reading the
        // challenge state. Without this, the response returns stale `phase: 'challenge'`
        // when the evaluator hasn't finished the funded transition yet.
        // This is safe because close API already has maxDuration = 60.
        let evalResult;
        try {
            evalResult = await ChallengeEvaluator.evaluate(challenge.id);
            logger.info('Post-close evaluation complete', {
                challengeId: challenge.id.slice(0, 8),
                result: evalResult.status,
            });
        } catch (e) {
            logger.error('Post-close evaluation failed (non-blocking)', e);
        }

        // Fetch updated balance AFTER evaluator finishes
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
            newBalance: updatedChallenge?.currentBalance || challenge.currentBalance,
            phase: updatedChallenge?.phase || challenge.phase,
        };

        // Cache response for idempotency (if key was provided)
        if (idempotencyKey) {
            await cacheIdempotencyResult(idempotencyKey, responsePayload);
        }

        return NextResponse.json(responsePayload);

    } catch (error: unknown) {
        logger.error("Close position failed:", error);
        // SECURITY: Never expose internal error details (SQL structure, schema) to client
        return NextResponse.json({
            error: "Failed to close position"
        }, { status: 500 });
    }
}
