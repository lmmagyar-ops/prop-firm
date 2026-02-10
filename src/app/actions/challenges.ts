"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { buildRulesConfig, getTierConfig } from "@/config/tiers";

export async function createChallengeAction(tierId: string = "10k_challenge") {
    const session = await auth();
    const userId = session?.user?.id || "demo-user-1"; // Fallback for your demo if auth fails

    // Parse tier from tierId (e.g. "25k_challenge" → "25k", or just "25k")
    const tier = tierId.replace(/_challenge$/, "");
    const tierConfig = getTierConfig(tier);
    const startingBalance = tierConfig.startingBalance;
    const rulesConfig = buildRulesConfig(tier);

    console.log(`[Action] Creating challenge for user: ${userId} (Tier: ${tier}, Balance: $${startingBalance})`);

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
        const balStr = startingBalance.toFixed(2);
        const [newChallenge] = await db.insert(challenges).values({
            userId: userId,
            phase: "challenge",
            status: "active",
            startingBalance: balStr,
            currentBalance: balStr,
            highWaterMark: balStr,
            startOfDayBalance: balStr,
            rulesConfig,
            startedAt: new Date(),
            endsAt: new Date(Date.now() + rulesConfig.durationDays * 24 * 60 * 60 * 1000)
        }).returning();

        revalidatePath("/dashboard");
        return { success: true, challengeId: newChallenge.id };
    } catch (error: unknown) {
        console.error("Failed to create challenge:", error);
        const message = error instanceof Error ? error.message : "Database Error";
        return { success: false, error: message };
    }
}
