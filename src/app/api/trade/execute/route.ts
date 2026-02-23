import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TradeExecutor } from "@/lib/trade";
import { db } from "@/db";
import { challenges, positions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import { checkIdempotency, cacheIdempotencyResult } from "@/lib/trade-idempotency";
import { getErrorMessage } from "@/lib/errors";
import { alerts } from "@/lib/alerts";
import { calculatePositionMetrics } from "@/lib/position-utils";

const log = createLogger("TradeAPI");

// Raise Vercel's serverless function ceiling from 10s (default) to 60s.
// Without this, Vercel kills the function mid-transaction while it holds a
// FOR UPDATE lock on the challenges row. Neon takes 30-60s to detect the
// dropped TCP connection and release the lock — causing the next trade
// attempt to block for 30s until the lock is released.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const session = await auth();

    // SECURITY: Always use session userId, never trust body
    const userId = session?.user?.id;

    if (!userId) {
        log.warn("Unauthorized trade attempt - no session");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SECURITY: Check if user account is suspended before allowing trades
    const [user] = await db.select({ isActive: users.isActive }).from(users).where(eq(users.id, userId));
    if (user && user.isActive === false) {
        return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const body = await req.json();
    const { marketId, outcome, amount, idempotencyKey } = body;

    // Validate inputs
    if (!marketId || !outcome || !amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    try {
        // FAN-OUT: claim idempotency key AND fetch challenge in parallel.
        // These two operations are independent — neither waits on the other.
        // The idempotency key is claimed atomically here (kvSetNx), so the
        // old sequential guard above this block has been removed.
        // Parallel execution saves ~200-500ms on warm paths.

        const [idempotencyCheck, activeChallenge] = await Promise.all([
            idempotencyKey
                ? checkIdempotency(idempotencyKey)
                : Promise.resolve({ isDuplicate: false as const, cachedResponse: undefined }),
            db.query.challenges.findFirst({
                where: and(
                    eq(challenges.userId, userId),
                    eq(challenges.status, "active")
                )
            })
        ]);

        // Handle idempotency result (was previously checked before the challenge fetch)
        if (idempotencyKey && idempotencyCheck.isDuplicate) {
            if (idempotencyCheck.cachedResponse && typeof idempotencyCheck.cachedResponse === 'object' && 'inProgress' in idempotencyCheck.cachedResponse) {
                return NextResponse.json({ error: "Trade already in progress" }, { status: 409 });
            }
            log.info(`Returning cached response for duplicate trade`, { idempotencyKey: idempotencyKey.slice(0, 8) });
            return NextResponse.json(idempotencyCheck.cachedResponse);
        }

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

        // Calculate position metrics with canonical direction-aware function
        const shares = parseFloat(position.shares);
        const entry = parseFloat(position.entryPrice);
        const current = parseFloat(position.currentPrice || position.entryPrice);
        const invested = parseFloat(position.sizeAmount);
        const direction = (outcome as "YES" | "NO");
        const metrics = calculatePositionMetrics(shares, entry, current, direction);
        const currentPnl = metrics.unrealizedPnL;
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

        const responsePayload: Record<string, unknown> = {
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

        // Handle Postgres lock_timeout (55P03) — happens when the FOR UPDATE lock
        // can't be acquired within 5s, meaning another trade is in progress or an
        // orphaned transaction still holds the lock. Return a retriable 409.
        const pgCode = (error instanceof Error
            ? ((error as unknown as Record<string, unknown>).cause as Record<string, unknown>)?.code
            ?? (error as unknown as Record<string, unknown>).code
            : undefined);
        if (pgCode === '55P03') {
            log.warn('Trade blocked by lock_timeout — orphaned transaction or concurrent trade', { userId });
            return NextResponse.json(
                { error: 'Another trade is in progress. Please wait a moment and try again.', code: 'LOCK_TIMEOUT' },
                { status: 409 }
            );
        }

        const status = (error instanceof Error && "status" in error ? (error as Record<string, unknown>).status : undefined) || 500;
        const code = (error instanceof Error && "code" in error ? (error as Record<string, unknown>).code : undefined) || 'UNKNOWN';
        const data = (error instanceof Error && "data" in error ? (error as Record<string, unknown>).data : {}) || {};

        log.error(`Trade execution failed [${code}]`, error);

        // Alert on unexpected failures (not user-facing validation errors like risk limits)
        if (status === 500 || code === 'UNKNOWN') {
            alerts.tradeFailed(userId, getErrorMessage(error) || 'Unknown error', {
                marketId, outcome, amount, code,
            });
        }

        // SECURITY: Only expose error messages from structured domain errors (e.g. MARKET_RESOLVED, PRICE_MOVED)
        // Never expose raw database/ORM error messages to the client
        const isSafeError = code !== 'UNKNOWN';
        const safeMessage = isSafeError ? (getErrorMessage(error) || "Trade failed") : "Trade failed";

        return NextResponse.json({
            error: safeMessage,
            code,
            ...(isSafeError && typeof data === 'object' && data !== null ? data : {}),
        }, { status: typeof status === 'number' ? status : 500 });
    }
}


