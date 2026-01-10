import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/admin/reset-daily-floor
 * Resets the start-of-day balance to current balance for testing.
 * Only works in development mode.
 */
export async function POST(request: Request) {
    // Only allow in development
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Only available in development" }, { status: 403 });
    }

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const challengeId = body.challengeId;

        if (!challengeId) {
            return NextResponse.json({ error: "challengeId required" }, { status: 400 });
        }

        // Get current challenge
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(and(
                eq(challenges.id, challengeId),
                eq(challenges.userId, userId)
            ));

        if (!challenge) {
            return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
        }

        const before = {
            currentBalance: challenge.currentBalance,
            startOfDayBalance: challenge.startOfDayBalance
        };

        // Reset start of day balance to current balance
        await db.update(challenges)
            .set({ startOfDayBalance: challenge.currentBalance })
            .where(eq(challenges.id, challengeId));

        return NextResponse.json({
            success: true,
            before,
            after: {
                currentBalance: challenge.currentBalance,
                startOfDayBalance: challenge.currentBalance
            },
            message: "Daily floor reset to current balance"
        });
    } catch (error) {
        console.error("[reset-daily-floor] Error:", error);
        return NextResponse.json({
            error: "Failed to reset daily floor"
        }, { status: 500 });
    }
}
