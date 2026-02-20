import { db } from "@/db";
import { challenges, trades, positions, paymentLogs, discountRedemptions, certificates, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("AdminChallenge");

/**
 * DELETE /api/admin/challenges/[id]
 * Delete a single challenge and all its associated data.
 * All operations run inside a single DB transaction.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAuthorized, response, user: admin } = await requireAdmin();
    if (!isAuthorized) return response;

    const { id: challengeId } = await params;

    if (!challengeId) {
        return NextResponse.json({ error: "Challenge ID is required" }, { status: 400 });
    }

    try {
        // Verify challenge exists
        const [challenge] = await db
            .select({ id: challenges.id, userId: challenges.userId, startingBalance: challenges.startingBalance })
            .from(challenges)
            .where(eq(challenges.id, challengeId))
            .limit(1);

        if (!challenge) {
            return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
        }

        const result = await db.transaction(async (tx) => {
            // Cascade delete in FK order: dependents first, then the challenge

            // 1. Delete trades (references challenges)
            const deletedTrades = await tx
                .delete(trades)
                .where(eq(trades.challengeId, challengeId))
                .returning({ id: trades.id });

            // 2. Delete positions (references challenges)
            const deletedPositions = await tx
                .delete(positions)
                .where(eq(positions.challengeId, challengeId))
                .returning({ id: positions.id });

            // 3. Null out payment log references (preserve audit trail)
            await tx
                .update(paymentLogs)
                .set({ challengeId: null })
                .where(eq(paymentLogs.challengeId, challengeId));

            // 4. Null out discount redemption references
            await tx
                .update(discountRedemptions)
                .set({ challengeId: null })
                .where(eq(discountRedemptions.challengeId, challengeId));

            // 5. Null out certificate references
            await tx
                .update(certificates)
                .set({ challengeId: null })
                .where(eq(certificates.challengeId, challengeId));

            // 6. Delete the challenge
            await tx
                .delete(challenges)
                .where(eq(challenges.id, challengeId));

            // 7. Audit log
            await tx.insert(auditLogs).values({
                action: "DELETE_CHALLENGE",
                adminId: admin!.id,
                targetId: challengeId,
                details: {
                    challengeId,
                    userId: challenge.userId,
                    deletedTrades: deletedTrades.length,
                    deletedPositions: deletedPositions.length,
                },
            });

            return { deletedTrades: deletedTrades.length, deletedPositions: deletedPositions.length };
        });

        logger.info(`[Admin] Deleted challenge ${challengeId}: ` +
            `${result.deletedTrades} trades, ${result.deletedPositions} positions`);

        return NextResponse.json({
            success: true,
            message: `Challenge deleted successfully`,
            deleted: {
                trades: result.deletedTrades,
                positions: result.deletedPositions,
            }
        });

    } catch (error) {
        logger.error("Delete Challenge Error:", error);
        return NextResponse.json(
            { error: "Failed to delete challenge" },
            { status: 500 }
        );
    }
}


/**
 * PATCH /api/admin/challenges/[id]
 * Update challenge status and phase for admin testing
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    const { id: challengeId } = await params;
    const body = await request.json();

    if (!challengeId) {
        return NextResponse.json({ error: "Challenge ID is required" }, { status: 400 });
    }

    try {
        // Verify challenge exists
        const [existingChallenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId))
            .limit(1);

        if (!existingChallenge) {
            return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
        }

        const updates: Record<string, unknown> = {};

        // Status change (active, failed, passed)
        if (body.status !== undefined) {
            const validStatuses = ['active', 'failed', 'passed'];
            if (!validStatuses.includes(body.status)) {
                return NextResponse.json(
                    { error: "Invalid status. Must be 'active', 'failed', or 'passed'" },
                    { status: 400 }
                );
            }
            updates.status = body.status;
        }

        // Phase change (challenge, verification, funded)
        if (body.phase !== undefined) {
            const validPhases = ['challenge', 'verification', 'funded'];
            if (!validPhases.includes(body.phase)) {
                return NextResponse.json(
                    { error: "Invalid phase. Must be 'challenge', 'verification', or 'funded'" },
                    { status: 400 }
                );
            }
            updates.phase = body.phase;
        }

        // Balance override (admin testing only)
        if (body.currentBalance !== undefined) {
            const balance = parseFloat(body.currentBalance);
            if (isNaN(balance) || balance < 0) {
                return NextResponse.json({ error: "Invalid currentBalance" }, { status: 400 });
            }
            updates.currentBalance = String(balance.toFixed(2));
        }
        if (body.highWaterMark !== undefined) {
            updates.highWaterMark = String(parseFloat(body.highWaterMark).toFixed(2));
        }
        if (body.startOfDayBalance !== undefined) {
            updates.startOfDayBalance = String(parseFloat(body.startOfDayBalance).toFixed(2));
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        await db
            .update(challenges)
            .set(updates)
            .where(eq(challenges.id, challengeId));

        // Optionally trigger the evaluator after balance update
        let evaluatorResult = null;
        if (body.triggerEvaluator) {
            const { ChallengeEvaluator } = await import("@/lib/evaluator");
            evaluatorResult = await ChallengeEvaluator.evaluate(challengeId);
        }

        const [updatedChallenge] = await db
            .select({
                id: challenges.id,
                status: challenges.status,
                phase: challenges.phase,
                currentBalance: challenges.currentBalance,
                highWaterMark: challenges.highWaterMark,
                userId: challenges.userId,
            })
            .from(challenges)
            .where(eq(challenges.id, challengeId))
            .limit(1);

        logger.info(`[Admin] Challenge ${challengeId} updated:`, updates);

        return NextResponse.json({
            success: true,
            challenge: updatedChallenge,
            evaluatorResult
        });

    } catch (error) {
        logger.error("Update Challenge Error:", error);
        return NextResponse.json(
            { error: "Failed to update challenge" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/challenges/[id]
 * Get challenge details
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    const { id: challengeId } = await params;

    try {
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId))
            .limit(1);

        if (!challenge) {
            return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
        }

        return NextResponse.json({ challenge });

    } catch (error) {
        logger.error("Get Challenge Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch challenge" },
            { status: 500 }
        );
    }
}
