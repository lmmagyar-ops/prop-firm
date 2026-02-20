import { db } from "@/db";
import { challenges, positions, trades, paymentLogs, discountRedemptions, certificates, payouts, auditLogs, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("ClearMyEvaluations");

/**
 * DELETE /api/admin/clear-my-evaluations
 * Completely removes ALL challenges, positions, and trades for the current admin user.
 * All operations run inside a single DB transaction.
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

        // 2. Execute all mutations in a single transaction
        const result = await db.transaction(async (tx) => {
            // Delete trades
            const deletedTrades = await tx
                .delete(trades)
                .where(inArray(trades.challengeId, challengeIds))
                .returning({ id: trades.id });

            // Delete positions
            const deletedPositions = await tx
                .delete(positions)
                .where(inArray(positions.challengeId, challengeIds))
                .returning({ id: positions.id });

            // Null out payment log references (preserve audit trail)
            for (const cId of challengeIds) {
                await tx
                    .update(paymentLogs)
                    .set({ challengeId: null })
                    .where(eq(paymentLogs.challengeId, cId));
            }

            // Null out discount redemption references
            for (const cId of challengeIds) {
                await tx
                    .update(discountRedemptions)
                    .set({ challengeId: null })
                    .where(eq(discountRedemptions.challengeId, cId));
            }

            // Null out certificate references
            for (const cId of challengeIds) {
                await tx
                    .update(certificates)
                    .set({ challengeId: null })
                    .where(eq(certificates.challengeId, cId));
            }

            // Null out payout references
            for (const cId of challengeIds) {
                await tx
                    .update(payouts)
                    .set({ challengeId: null })
                    .where(eq(payouts.challengeId, cId));
            }

            // Delete challenges
            const deletedChallenges = await tx
                .delete(challenges)
                .where(eq(challenges.userId, userId))
                .returning({ id: challenges.id });

            // Audit log
            await tx.insert(auditLogs).values({
                action: "CLEAR_ALL_EVALUATIONS",
                adminId: userId,
                details: {
                    userId,
                    deletedChallenges: deletedChallenges.length,
                    deletedTrades: deletedTrades.length,
                    deletedPositions: deletedPositions.length,
                    challengeIds,
                },
            });

            return {
                challenges: deletedChallenges.length,
                positions: deletedPositions.length,
                trades: deletedTrades.length,
            };
        });

        logger.info(`[Admin] Cleared all data for user ${userId}:`, result);

        return NextResponse.json({
            success: true,
            message: "All evaluations cleared!",
            deleted: result,
        });

    } catch (error) {
        logger.error("Clear evaluations error:", error);
        return NextResponse.json({ error: "Failed to clear evaluations" }, { status: 500 });
    }
}
