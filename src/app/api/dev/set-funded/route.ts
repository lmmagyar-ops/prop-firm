import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { FUNDED_RULES } from "@/lib/funded-rules";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * DEV ONLY: Set a challenge to funded phase for testing
 * 
 * Usage:
 * POST /api/dev/set-funded
 * Body: { userId?: string }
 * 
 * This will update the active challenge for the given user (or demo-user-1)
 * to funded phase with appropriate funded stage configuration.
 */
export async function POST(req: NextRequest) {
    // SECURITY: Block in production and require admin
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Dev endpoints disabled in production" }, { status: 403 });
    }

    const adminCheck = await requireAdmin();
    if (!adminCheck.isAuthorized) {
        return adminCheck.response;
    }

    try {
        const body = await req.json().catch(() => ({}));
        const targetUserId = body.userId || "demo-user-1";

        // Find active challenge
        const activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, targetUserId),
                eq(challenges.status, "active")
            )
        });

        if (!activeChallenge) {
            return NextResponse.json({
                error: "No active challenge found",
                hint: "Create a challenge first, then call this endpoint to transition to funded"
            }, { status: 404 });
        }

        // Determine tier based on starting balance
        const startingBalance = parseFloat(activeChallenge.startingBalance);
        let tier: "5k" | "10k" | "25k";
        if (startingBalance <= 5000) {
            tier = "5k";
        } else if (startingBalance <= 10000) {
            tier = "10k";
        } else {
            tier = "25k";
        }

        const fundedRules = FUNDED_RULES[tier];

        // Build updated rules config with funded stage rules
        const existingRules = activeChallenge.rulesConfig as Record<string, unknown>;
        const updatedRulesConfig = {
            ...existingRules,
            // Override with funded-specific rules
            maxDrawdown: fundedRules.maxTotalDrawdown,
            maxDailyDrawdown: fundedRules.maxDailyDrawdown,
            maxOpenPositions: fundedRules.maxOpenPositions,
            // Remove profit target for funded (or set very high)
            profitTarget: null,
        };

        // Update challenge to funded phase
        const now = new Date();
        await db.update(challenges)
            .set({
                phase: "funded",
                status: "active",
                // Reset funded stage tracking
                profitSplit: fundedRules.profitSplit.toString(),
                payoutCap: fundedRules.payoutCap.toString(),
                activeTradingDays: 0,
                consistencyFlagged: false,
                lastActivityAt: now,
                payoutCycleStart: now,
                rulesConfig: updatedRulesConfig,
                // Set HWM to current balance (fresh start for funded)
                highWaterMark: activeChallenge.currentBalance,
                // Remove time limit (funded doesn't expire)
                endsAt: null,
            })
            .where(eq(challenges.id, activeChallenge.id));

        return NextResponse.json({
            success: true,
            message: `Challenge transitioned to funded phase!`,
            details: {
                challengeId: activeChallenge.id,
                tier,
                profitSplit: `${fundedRules.profitSplit * 100}%`,
                payoutCap: `$${fundedRules.payoutCap}`,
                maxTotalDrawdown: `$${fundedRules.maxTotalDrawdown}`,
                maxDailyDrawdown: `$${fundedRules.maxDailyDrawdown}`,
                currentBalance: `$${activeChallenge.currentBalance}`,
            },
            nextSteps: [
                "Refresh the dashboard to see funded UI",
                "Navigate to /dashboard/payouts to test payout flow",
                "Use /api/dev/set-balance to adjust balance for testing",
            ]
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * Reset a funded challenge back to challenge phase for testing
 */
export async function DELETE(req: NextRequest) {
    // SECURITY: Block in production and require admin
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Dev endpoints disabled in production" }, { status: 403 });
    }

    const adminCheck = await requireAdmin();
    if (!adminCheck.isAuthorized) {
        return adminCheck.response;
    }

    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId") || "demo-user-1";

        const activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, userId),
                eq(challenges.status, "active")
            )
        });

        if (!activeChallenge) {
            return NextResponse.json({ error: "No active challenge found" }, { status: 404 });
        }

        // Reset to challenge phase
        await db.update(challenges)
            .set({
                phase: "challenge",
                profitSplit: "0.80",
                payoutCap: null,
                activeTradingDays: 0,
                consistencyFlagged: false,
                payoutCycleStart: null,
                endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            })
            .where(eq(challenges.id, activeChallenge.id));

        return NextResponse.json({
            success: true,
            message: "Challenge reset to challenge phase",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
