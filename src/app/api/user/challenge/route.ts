import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Challenge");

/**
 * GET /api/user/challenge
 * Returns the current user's active challenge info.
 * Used by the trade test harness for debugging.
 */
export async function GET() {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Find active challenge for this user
        const activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, userId),
                eq(challenges.status, "active")
            )
        });

        if (!activeChallenge) {
            return NextResponse.json({
                challenge: null,
                message: "No active challenge found"
            });
        }

        return NextResponse.json({
            challenge: {
                id: activeChallenge.id,
                status: activeChallenge.status,
                currentBalance: activeChallenge.currentBalance,
                platform: activeChallenge.platform || "polymarket",
                initialBalance: activeChallenge.startingBalance,
                phase: activeChallenge.phase,
                startedAt: activeChallenge.startedAt
            }
        });
    } catch (error) {
        logger.error("[/api/user/challenge] Error:", error);
        return NextResponse.json({
            error: "Failed to fetch challenge"
        }, { status: 500 });
    }
}
