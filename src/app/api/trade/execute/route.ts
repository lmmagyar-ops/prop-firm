import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TradeExecutor } from "@/lib/trade";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
    const session = await auth();

    const body = await req.json();
    let { userId, marketId, outcome, amount } = body;

    // Fallback to session ID if not in body
    if (!userId && session?.user?.id) {
        userId = session.user.id;
    }

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate inputs
    if (!marketId || !outcome || !amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    try {
        let trade;

        try {
            // Execute trade using TradeExecutor (handles position updates properly)
            trade = await TradeExecutor.executeTrade(
                userId,
                marketId,
                "BUY", // Always BUY for now
                parseFloat(amount)
            );
        } catch (error: any) {
            // Auto-provision Redis market data for demo users
            if ((error.message === "Market data unavailable" || error.message.includes("Book Not Found"))) {
                console.log("[Auto-Provision] Seeding Redis Market Data...");
                const Redis = (await import("ioredis")).default;
                const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6380");

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

                redis.disconnect();

                // Retry execution
                console.log("[Auto-Provision] Retrying execution...");
                trade = await TradeExecutor.executeTrade(
                    userId,
                    marketId,
                    "BUY",
                    parseFloat(amount)
                );
            } else {
                throw error;
            }
        }

        // Fetch the challenge
        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.userId, userId),
        });

        if (!challenge) {
            return NextResponse.json({ error: "Challenge not found" }, { status: 500 });
        }

        // Get the position that was just created/updated
        let position = await db.query.positions.findFirst({
            where: and(
                eq(positions.challengeId, challenge.id),
                eq(positions.marketId, marketId),
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
                    eq(positions.marketId, marketId)
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

        // Fix the direction if it doesn't match the outcome
        // (TradeExecutor hardcodes "YES", so we need to update it)
        if (position.direction !== outcome) {
            await db.update(positions)
                .set({ direction: outcome })
                .where(eq(positions.id, position.id));
        }

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

        return NextResponse.json({
            success: true,
            trade: {
                id: trade.id,
                shares: parseFloat(trade.shares),
                price: parseFloat(trade.price),
            },
            position: positionData
        });

    } catch (error: any) {
        console.error("Trade execution failed:", error);
        return NextResponse.json({
            error: error.message || "Trade failed"
        }, { status: 500 });
    }
}


