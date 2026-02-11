import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TradeExecutor } from "@/lib/trade";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import { checkIdempotency, cacheIdempotencyResult } from "@/lib/trade-idempotency";
import { getErrorMessage } from "@/lib/errors";

const log = createLogger("TradeAPI");

export async function POST(req: NextRequest) {
    const session = await auth();

    // SECURITY: Always use session userId, never trust body
    const userId = session?.user?.id;

    if (!userId) {
        log.warn("Unauthorized trade attempt - no session");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { marketId, outcome, amount, idempotencyKey } = body;

    // Validate inputs
    if (!marketId || !outcome || !amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // IDEMPOTENCY GUARD: Prevent duplicate trade execution on client retries
    if (idempotencyKey) {
        const { isDuplicate, cachedResponse } = await checkIdempotency(idempotencyKey);
        if (isDuplicate) {
            if (cachedResponse && typeof cachedResponse === 'object' && 'inProgress' in cachedResponse) {
                return NextResponse.json({ error: "Trade already in progress" }, { status: 409 });
            }
            log.info(`Returning cached response for duplicate trade`, { idempotencyKey: idempotencyKey.slice(0, 8) });
            return NextResponse.json(cachedResponse);
        }
    }

    try {
        // Get active challenge for this user
        const activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, userId),
                eq(challenges.status, "active")
            )
        });

        if (!activeChallenge) {
            return NextResponse.json({ error: "No active challenge found" }, { status: 400 });
        }

        // Execute trade using TradeExecutor (handles position updates properly)
        const trade = await TradeExecutor.executeTrade(
            userId,
            activeChallenge.id,
            marketId,
            "BUY", // Always BUY for now (SELL is handled by close endpoint)
            parseFloat(amount),
            outcome as "YES" | "NO" // Pass direction to create correct position
        );

        // Use the activeChallenge that was already found (not a new query that might return wrong one)
        const challenge = activeChallenge;

        log.debug("Looking for position", { challengeId: challenge.id, marketId });

        // Get the position that was just created/updated
        // CRITICAL: Filter by direction to get the correct YES or NO position
        let position = await db.query.positions.findFirst({
            where: and(
                eq(positions.challengeId, challenge.id),
                eq(positions.marketId, marketId),
                eq(positions.direction, outcome as "YES" | "NO"),
                eq(positions.status, "OPEN")
            ),
            orderBy: (positions, { desc }) => [desc(positions.openedAt)]
        });

        if (!position) {
            // Fallback: try to find position without status filter
            log.warn("Position not found with OPEN status, trying fallback");
            const anyPosition = await db.query.positions.findFirst({
                where: and(
                    eq(positions.challengeId, challenge.id),
                    eq(positions.marketId, marketId),
                    eq(positions.direction, outcome as "YES" | "NO")
                ),
                orderBy: (positions, { desc }) => [desc(positions.openedAt)]
            });

            if (anyPosition) {
                // Use this position even if status isn't OPEN
                position = anyPosition;
                log.debug("Found position via fallback", { positionId: position.id, status: position.status });
            } else {
                // Last resort: return trade data only
                log.error("No position found for market after trade", null, { challengeId: challenge.id, marketId });
                return NextResponse.json({
                    success: true,
                    trade: {
                        id: trade.id,
                        shares: parseFloat(trade.shares),
                        price: parseFloat(trade.price),
                    },
                    position: null // No position data available
                });
            }
        }

        // Direction is now set correctly by TradeExecutor, no need to update post-hoc

        // Calculate position metrics with the correct direction
        const entry = parseFloat(position.entryPrice);
        const current = parseFloat(position.currentPrice || position.entryPrice);
        const shares = parseFloat(position.shares);
        const invested = parseFloat(position.sizeAmount);
        const currentPnl = (current - entry) * shares;
        const roi = invested > 0 ? (currentPnl / invested) * 100 : 0;

        const positionData = {
            id: position.id,
            shares,
            avgPrice: entry,
            invested,
            currentPnl,
            roi,
            side: outcome as "YES" | "NO" // Use the correct outcome
        };

        // --- Evaluate Challenge Status (fire-and-forget to avoid timeout) ---
        // TradeExecutor already calls the evaluator, so we skip it here to avoid duplicate
        // If needed, uncomment: ChallengeEvaluator.evaluate(challenge.id).catch(console.error);

        const responsePayload: any = {
            success: true,
            trade: {
                id: trade.id,
                shares: parseFloat(trade.shares),
                price: parseFloat(trade.price),
            },
            position: positionData
        };

        // Cache response for idempotency (if key was provided)
        if (idempotencyKey) {
            await cacheIdempotencyResult(idempotencyKey, responsePayload);
        }

        return NextResponse.json(responsePayload);

    } catch (error: unknown) {
        // DEFENSE-IN-DEPTH: Structured error responses for client-side handling
        const status = (error instanceof Error && "status" in error ? (error as Record<string, unknown>).status : undefined) || 500;
        const code = (error instanceof Error && "code" in error ? (error as Record<string, unknown>).code : undefined) || 'UNKNOWN';
        const data = (error instanceof Error && "data" in error ? (error as Record<string, unknown>).data : {}) || {};

        log.error(`Trade execution failed [${code}]`, error);

        return NextResponse.json({
            error: getErrorMessage(error) || "Trade failed",
            code,
            ...(typeof data === 'object' && data !== null ? data : {}),
        }, { status: typeof status === 'number' ? status : 500 });
    }
}


