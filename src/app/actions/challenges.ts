"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { buildRulesConfig, getTierConfig } from "@/config/tiers";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ChallengeActions");

export async function createChallengeAction(tierId: string = "10k_challenge") {
    const session = await auth();
    const userId = session?.user?.id || "demo-user-1"; // Fallback for your demo if auth fails

    // Parse tier from tierId (e.g. "25k_challenge" → "25k", or just "25k")
    const tier = tierId.replace(/_challenge$/, "");
    const tierConfig = getTierConfig(tier);
    const startingBalance = tierConfig.startingBalance;
    const rulesConfig = buildRulesConfig(tier);

    logger.info("Creating challenge", { userId, tier, startingBalance });

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
            logger.info("User missing from DB, seeding", { userId });
            await db.insert(users).values({
                id: userId,
                email: session?.user?.email || `user-${userId}@breakout.com`,
                name: session?.user?.name || "Demo Trader",
                username: `trader-${userId.substring(0, 8)}`,
                kycStatus: "not_started"
            });
            logger.info("User seeded successfully", { userId });
        }
    } catch (e) {
        logger.error("Failed to check/seed user", e);
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
            logger.info("Active challenge found, returning existing", { userId, challengeId: existingChallenge.id });
            revalidatePath("/dashboard");
            return { success: true, challengeId: existingChallenge.id };
        }
    } catch (e) {
        logger.warn("Failed to check existing challenges, proceeding to create", { error: e instanceof Error ? e.message : String(e) });
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
        logger.error("Failed to create challenge", error);
        const message = error instanceof Error ? error.message : "Database Error";
        return { success: false, error: message };
    }
}
