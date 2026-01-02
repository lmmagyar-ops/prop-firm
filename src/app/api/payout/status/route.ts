import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { payouts, challenges } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * GET /api/payout/status?challengeId=xxx
 * 
 * Returns payout history and statuses for a funded account.
 */
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get("challengeId");

    if (!challengeId) {
        return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
    }

    // Verify ownership
    const [challenge] = await db
        .select()
        .from(challenges)
        .where(and(
            eq(challenges.id, challengeId),
            eq(challenges.userId, session.user.id)
        ));

    if (!challenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    try {
        // Get all payouts for this challenge
        const payoutHistory = await db
            .select()
            .from(payouts)
            .where(eq(payouts.challengeId, challengeId))
            .orderBy(desc(payouts.requestedAt));

        // Calculate totals
        const completedPayouts = payoutHistory.filter(p => p.status === "completed");
        const totalPaidOut = completedPayouts.reduce(
            (sum, p) => sum + parseFloat(p.amount),
            0
        );

        const pendingPayouts = payoutHistory.filter(
            p => ["pending", "approved", "processing"].includes(p.status)
        );
        const pendingAmount = pendingPayouts.reduce(
            (sum, p) => sum + parseFloat(p.amount),
            0
        );

        return NextResponse.json({
            challengeId,
            phase: challenge.phase,
            totalPaidOut: parseFloat(challenge.totalPaidOut || "0"),
            currentCycle: {
                start: challenge.payoutCycleStart,
                activeTradingDays: challenge.activeTradingDays,
            },
            payouts: payoutHistory.map(p => ({
                id: p.id,
                amount: parseFloat(p.amount),
                network: p.network,
                walletAddress: p.walletAddress,
                status: p.status,
                requestedAt: p.requestedAt,
                processedAt: p.processedAt,
                transactionHash: p.transactionHash,
                failureReason: p.failureReason,
            })),
            summary: {
                totalCompleted: completedPayouts.length,
                totalPaidOut,
                pendingCount: pendingPayouts.length,
                pendingAmount,
            }
        });
    } catch (error) {
        console.error("[PayoutStatus] Error:", error);
        return NextResponse.json({
            error: "Failed to fetch payout status",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
