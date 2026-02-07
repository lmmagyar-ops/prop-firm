"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createChallengeAction(tierId: string = "10k_challenge") {
    const session = await auth();
    const userId = session?.user?.id || "demo-user-1"; // Fallback for your demo if auth fails

    console.log(`[Action] Creating challenge for user: ${userId} (Tier: ${tierId})`);

    // AUTO-PROVISION USER (Self-Healing due to Stale Sessions or DB Resets)
    // If the user is authenticated (has session) but missing from DB, we seed them now 
    // to prevent Foreign Key constraint errors in the Challenges table.
    try {
        const { users } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");

        const existingUser = await db.query.users.findFirst({
            where: eq(users.id, userId)
        });

        if (!existingUser) {
            console.log(`[Action] User ${userId} missing from DB. Seeding now...`);
            await db.insert(users).values({
                id: userId,
                email: session?.user?.email || `user-${userId}@breakout.com`,
                name: session?.user?.name || "Demo Trader",
                username: `trader-${userId.substring(0, 8)}`,
                kycStatus: "not_started"
            });
            console.log(`[Action] User ${userId} seeded successfully.`);
        }
    } catch (e) {
        console.error("Failed to check/seed user:", e);
    }

    // 1. CHECK IDEMPOTENCY: If user already has an active challenge, just return success
    try {
        const { eq, and } = await import("drizzle-orm");
        const existingChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, userId),
                eq(challenges.status, "active")
            )
        });

        if (existingChallenge) {
            console.log(`[Action] Active challenge found for ${userId}. Returning existing.`);
            revalidatePath("/dashboard");
            return { success: true, challengeId: existingChallenge.id };
        }
    } catch (e) {
        console.warn("Failed to check existing challenges, proceeding to create...", e);
    }

    try {
        const [newChallenge] = await db.insert(challenges).values({
            userId: userId,
            phase: "challenge",
            status: "active",
            startingBalance: "10000.00",
            currentBalance: "10000.00",
            highWaterMark: "10000.00",
            startOfDayBalance: "10000.00",
            rulesConfig: {
                tier: "10k",
                startingBalance: 10000,

                // CRITICAL: These are ABSOLUTE DOLLAR VALUES
                profitTarget: 1000,               // 10% of $10k = $1,000
                maxDrawdown: 800,                  // 8% of $10k = $800

                // Percentage-based (used by risk engine)
                maxTotalDrawdownPercent: 0.08,      // 8%
                maxDailyDrawdownPercent: 0.04,      // 4%

                // Position Sizing
                maxPositionSizePercent: 0.05,       // 5% per market
                maxCategoryExposurePercent: 0.10,    // 10% per category

                // Liquidity
                maxVolumeImpactPercent: 0.10,        // 10% of 24h volume
                minMarketVolume: 100_000,            // $100k

                // Legacy (backwards compatibility)
                maxDrawdownPercent: 0.08,
                dailyLossPercent: 0.04,
                profitTargetPercent: 0.10,
                durationDays: 60,
                profitSplit: 0.7,                    // 70% to trader
            },
            startedAt: new Date(),
            // Set end date to 60 days from now (matches canonical rules)
            endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        }).returning();

        revalidatePath("/dashboard");
        return { success: true, challengeId: newChallenge.id };
    } catch (error: unknown) {
        console.error("Failed to create challenge:", error);
        const message = error instanceof Error ? error.message : "Database Error";
        return { success: false, error: message };
    }
}
