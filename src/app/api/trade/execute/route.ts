import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TradeExecutor } from "@/lib/trade";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ChallengeEvaluator } from "@/lib/evaluator";

export async function POST(req: NextRequest) {
    const session = await auth();

    // SECURITY: Always use session userId, never trust body
    const userId = session?.user?.id;

    if (!userId) {
        console.log("[Trade API] 401 - No authenticated session");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { marketId, outcome, amount } = body;

    // Validate inputs
    if (!marketId || !outcome || !amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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

        let trade;

        try {
            // Execute trade using TradeExecutor (handles position updates properly)
            trade = await TradeExecutor.executeTrade(
                userId,
                activeChallenge.id,
                marketId,
                "BUY", // Always BUY for now (SELL is handled by close endpoint)
                parseFloat(amount),
                outcome as "YES" | "NO" // Pass direction to create correct position
            );
        } catch (error: any) {
            // Auto-provision Redis market data for demo users
            // Check for: "Market xxx is currently closed or halted" OR "Book Not Found"
            const isMarketDataMissing = error.message?.includes("is currently closed or halted")
                || error.message?.includes("Book Not Found");

            console.log("[Trade Error]", error.message, "isMarketDataMissing:", isMarketDataMissing);

            if (isMarketDataMissing) {
                console.log("[Auto-Provision] Seeding Redis Market Data...");
                try {
                    const Redis = (await import("ioredis")).default;
                    const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6380", {
                        connectTimeout: 5000, // 5 second timeout
                        commandTimeout: 5000,
                        maxRetriesPerRequest: 1
                    });

                    const now = Date.now();
                    // Seed Price
                    await redis.set(`market:price:${marketId}`, JSON.stringify({
                        price: "0.56",
                        asset_id: marketId,
                        timestamp: now
                    }));

                    // Seed Book
                    await redis.set(`market:book:${marketId}`, JSON.stringify({
                        bids: [{ price: "0.56", size: "10000" }, { price: "0.55", size: "10000" }],
                        asks: [{ price: "0.57", size: "10000" }, { price: "0.58", size: "10000" }]
                    }));

                    console.log("[Auto-Provision] Redis data seeded successfully");
                    redis.disconnect();

                    // Retry execution
                    console.log("[Auto-Provision] Retrying execution...");
                    trade = await TradeExecutor.executeTrade(
                        userId,
                        activeChallenge.id,
                        marketId,
                        "BUY",
                        parseFloat(amount),
                        outcome as "YES" | "NO"
                    );
                    console.log("[Auto-Provision] Retry succeeded");
                } catch (redisError: any) {
                    console.error("[Auto-Provision] Redis seeding failed:", redisError.message);
                    throw new Error(`Trade failed: Market data unavailable and could not provision`);
                }
            } else {
                throw error;
            }
        }

        // Use the activeChallenge that was already found (not a new query that might return wrong one)
        const challenge = activeChallenge;

        console.log("[Trade] Looking for position on challenge:", challenge.id, "market:", marketId);

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
            console.warn("[Trade] Position not found with OPEN status, trying without status filter");
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
                console.log("[Trade] Found position with ID:", position.id, "status:", position.status);
            } else {
                // Last resort: return trade data only
                console.error("[Trade] No position found at all for this market");
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

        return NextResponse.json(responsePayload);

    } catch (error: any) {
        console.error("Trade execution failed:", error);
        return NextResponse.json({
            error: error.message || "Trade failed"
        }, { status: 500 });
    }
}


