import { db } from "@/db";
import { challenges, positions, trades, paymentLogs, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("ResetChallenge");

/**
 * POST /api/admin/reset-challenge
 * Resets a challenge to its initial state for testing purposes.
 * 
 * All operations run inside a single DB transaction:
 * - Deletes all trades, positions, and payment logs for the challenge
 * - Resets balance, HWM, startOfDayBalance to starting balance
 * - Resets status to 'active', phase to 'challenge'
 * - Writes an audit_logs entry for traceability
 */
export async function POST(req: Request) {
    const { isAuthorized, response, user: admin } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const { challengeId } = await req.json();

        if (!challengeId) {
            return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
        }

        // 1. Get the challenge to find starting balance
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId));

        if (!challenge) {
            return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
        }

        const startingBalance = parseFloat(challenge.startingBalance);
        if (isNaN(startingBalance) || startingBalance <= 0) {
            return NextResponse.json({
                error: "Invalid startingBalance in challenge record",
                debug: { storedValue: challenge.startingBalance }
            }, { status: 400 });
        }

        const previousBalance = challenge.currentBalance;

        // 2. Execute all mutations in a single transaction
        const result = await db.transaction(async (tx) => {
            // Delete trades
            const deletedTrades = await tx
                .delete(trades)
                .where(eq(trades.challengeId, challengeId))
                .returning({ id: trades.id });

            // Delete positions
            const deletedPositions = await tx
                .delete(positions)
                .where(eq(positions.challengeId, challengeId))
                .returning({ id: positions.id });

            // Null out payment log references (preserve audit trail, remove FK link)
            await tx
                .update(paymentLogs)
                .set({ challengeId: null })
                .where(eq(paymentLogs.challengeId, challengeId));

            // Reset challenge state
            await tx
                .update(challenges)
                .set({
                    currentBalance: String(startingBalance),
                    startOfDayBalance: String(startingBalance),
                    highWaterMark: String(startingBalance),
                    status: "active",
                    phase: "challenge",
                    pendingFailureAt: null,
                    activeTradingDays: 0,
                    startedAt: new Date(),
                })
                .where(eq(challenges.id, challengeId));

            // Write audit log
            await tx.insert(auditLogs).values({
                action: "RESET_CHALLENGE",
                adminId: admin!.id,
                targetId: challengeId,
                details: {
                    challengeId,
                    userId: challenge.userId,
                    previousBalance,
                    newBalance: String(startingBalance),
                    deletedTrades: deletedTrades.length,
                    deletedPositions: deletedPositions.length,
                },
            });

            return {
                deletedTrades: deletedTrades.length,
                deletedPositions: deletedPositions.length,
            };
        });

        logger.info(`[Admin] Reset challenge ${challengeId.slice(0, 8)}: ` +
            `${result.deletedTrades} trades, ${result.deletedPositions} positions deleted, ` +
            `balance ${previousBalance} → ${startingBalance}`);

        return NextResponse.json({
            success: true,
            message: `Challenge reset successfully`,
            data: {
                challengeId,
                newBalance: startingBalance,
                status: "active",
                deletedTrades: result.deletedTrades,
                deletedPositions: result.deletedPositions,
            }
        });

    } catch (error) {
        logger.error("Reset Challenge Error:", error);
        return NextResponse.json({ error: "Failed to reset challenge" }, { status: 500 });
    }
}

/**
 * GET /api/admin/reset-challenge
 * Lists all challenges available for reset
 */
export async function GET() {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const allChallenges = await db
            .select({
                id: challenges.id,
                status: challenges.status,
                currentBalance: challenges.currentBalance,
                userId: challenges.userId,
                platform: challenges.platform,
                phase: challenges.phase,
            })
            .from(challenges);

        return NextResponse.json({ challenges: allChallenges });
    } catch (error) {
        logger.error("Get Challenges Error:", error);
        return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
    }
}
