import { NextResponse } from "next/server";
import { TradeExecutor } from "@/lib/trade";
import { publishAdminEvent } from "@/lib/events";
import { auth } from "@/auth";
import { db } from "@/db";

export async function POST(req: Request) {
    try {
        const session = await auth();
        // TODO: Enforce Auth when login is working.

        const body = await req.json();
        const { userId, challengeId, marketId, side, amount } = body;

        // Validation
        if (!userId || !challengeId || !marketId || !side || !amount) {
            return NextResponse.json({ error: "Missing required fields (userId, challengeId, marketId, side, amount)" }, { status: 400 });
        }

        let trade;
        try {
            trade = await TradeExecutor.executeTrade(userId, challengeId, marketId, side, parseFloat(amount));
        } catch (error: any) {
            let shouldRetry = false;

            // 1. AUTO-PROVISION CHALLENGE & USER (Fallback for demo mode)
            if (error.code === "INVALID_CHALLENGE" && userId === "demo-user-1") {
                console.log("[Auto-Provision] Creating new challenge for demo user...");

                const { users } = await import("@/db/schema");
                const { eq } = await import("drizzle-orm");

                const existingUser = await db.query.users.findFirst({ where: eq(users.id, userId) });

                if (!existingUser) {
                    console.log("[Auto-Provision] Creating new user 'demo-user-1'...");
                    await db.insert(users).values({
                        id: userId,
                        email: "demo@breakoutprop.com",
                        name: "Demo Trader",
                        username: "demotrader"
                    });
                }

                const { ChallengeManager } = await import("@/lib/challenges");
                const newChallenge = await ChallengeManager.createChallenge(userId);

                // Retry with the newly created challenge ID
                trade = await TradeExecutor.executeTrade(userId, newChallenge.id, marketId, side, parseFloat(amount));
                shouldRetry = false; // Already retried inline
            }

            // 2. AUTO-PROVISION MARKET DATA (Redis)
            else if ((error.message === "Market data unavailable" || error.message.includes("Book Not Found")) && userId === "demo-user-1") {
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
                trade = await TradeExecutor.executeTrade(userId, challengeId, marketId, side, parseFloat(amount));
            } else {
                throw error;
            }
        }

        // Publish Event for Admin Panel "WOW" factor
        await publishAdminEvent("NEW_TRADE", {
            tradeId: trade.id,
            traderId: userId,
            marketId: marketId,
            side: side,
            amount: amount,
            pnl: 0,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({ success: true, trade });

    } catch (error: any) {
        console.error("Trade Execution Error:", error);
        return NextResponse.json({ error: error.message || "Failed to execute trade" }, { status: 500 });
    }
}
