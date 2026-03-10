import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getTierConfig } from "@/config/tiers";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Start");

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Find the pending challenge for this user
        const pendingChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, session.user.id),
                eq(challenges.status, "pending")
            ),
        });

        if (!pendingChallenge) {
            return NextResponse.json({ error: "No pending challenge found" }, { status: 404 });
        }

        // Get duration from canonical tier config (NOT hardcoded)
        const tier = pendingChallenge.rulesConfig
            ? JSON.parse(pendingChallenge.rulesConfig as string)?.tier
            : null;
        const tierConfig = tier ? getTierConfig(tier) : null;
        const durationDays = tierConfig?.durationDays ?? 60; // Default 60 if tier config unavailable

        // Activate it
        const now = new Date();
        const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const startingBalance = pendingChallenge.startingBalance;

        await db.update(challenges)
            .set({
                status: "active",
                startedAt: now,
                endsAt: endsAt,
                startOfDayEquity: startingBalance, // Initialize SODEquity to prevent null on first day
            })
            .where(eq(challenges.id, pendingChallenge.id));

        logger.info("Challenge activated", {
            challengeId: pendingChallenge.id.slice(0, 8),
            tier: tier || "unknown",
            durationDays,
        });

        return NextResponse.json({ success: true, challengeId: pendingChallenge.id });

    } catch (error) {
        logger.error("Failed to start challenge:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
