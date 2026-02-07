/**
 * Development-only helpers for trade auto-provisioning.
 * These functions create demo users, challenges, and seed Redis when
 * the demo-user-1 encounters missing data during local development.
 *
 * IMPORTANT: These helpers are guarded by NODE_ENV !== "production"
 * at the call site. They must NEVER be invoked in production.
 */

import { db } from "@/db";

/**
 * Auto-provision a demo user and challenge when one doesn't exist.
 * Returns the newly created challenge ID, or throws if creation fails.
 */
export async function autoProvisionDemoChallenge(userId: string): Promise<string> {
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

    console.log(`[Auto-Provision] Created challenge ${newChallenge.id} for ${userId}`);
    return newChallenge.id;
}

/**
 * Auto-provision Redis market data for a specific market ID.
 * Seeds a price and order book so the demo user can trade.
 */
export async function autoProvisionMarketData(marketId: string): Promise<void> {
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
    console.log(`[Auto-Provision] Seeded Redis market data for ${marketId}`);
}
