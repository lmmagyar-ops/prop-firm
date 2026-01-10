import { db } from "@/db";
import { challenges, positions, trades, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * DELETE /api/admin/clear-my-evaluations
 * Completely removes ALL challenges, positions, and trades for the current user.
 * Use this to get a completely fresh testing state.
 */
export async function DELETE() {
    const { isAuthorized, response, user } = await requireAdmin();
    if (!isAuthorized) return response;

    if (!user?.email) {
        return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Look up user ID by email
    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, user.email)).limit(1);
    const userId = dbUser?.id;

    if (!userId) {
        return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    try {
        // 1. Get all challenge IDs for this user
        const userChallenges = await db
            .select({ id: challenges.id })
            .from(challenges)
            .where(eq(challenges.userId, userId));

        const challengeIds = userChallenges.map(c => c.id);

        if (challengeIds.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No evaluations to clear",
                deleted: { challenges: 0, positions: 0, trades: 0 }
            });
        }

        // 2. Delete all trades for these challenges
        const deletedTrades = await db
            .delete(trades)
            .where(inArray(trades.challengeId, challengeIds))
            .returning({ id: trades.id });

        // 3. Delete all positions for these challenges
        const deletedPositions = await db
            .delete(positions)
            .where(inArray(positions.challengeId, challengeIds))
            .returning({ id: positions.id });

        // 4. Delete all challenges
        const deletedChallenges = await db
            .delete(challenges)
            .where(eq(challenges.userId, userId))
            .returning({ id: challenges.id });

        console.log(`[Admin] Cleared all data for user ${userId}:`, {
            challenges: deletedChallenges.length,
            positions: deletedPositions.length,
            trades: deletedTrades.length
        });

        return NextResponse.json({
            success: true,
            message: "All evaluations cleared!",
            deleted: {
                challenges: deletedChallenges.length,
                positions: deletedPositions.length,
                trades: deletedTrades.length
            }
        });

    } catch (error) {
        console.error("Clear evaluations error:", error);
        return NextResponse.json({ error: "Failed to clear evaluations" }, { status: 500 });
    }
}
