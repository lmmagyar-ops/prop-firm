import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { challenges, trades } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * POST /api/admin/fix-balance
 * Recalculates and fixes a challenge's balance based on actual trade history.
 * Use this to repair data corruption from legacy bugs.
 */
export async function POST(req: Request) {
    const adminAuth = await requireAdmin();
    if (!adminAuth.isAuthorized) {
        return adminAuth.response;
    }

    const { challengeId, dryRun = true } = await req.json();

    if (!challengeId) {
        return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
    }

    // Get challenge
    const challenge = await db.query.challenges.findFirst({
        where: eq(challenges.id, challengeId)
    });

    if (!challenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const startingBalance = parseFloat(challenge.startingBalance || '10000');
    const currentBalance = parseFloat(challenge.currentBalance);

    // Get all trades and recalculate
    const allTrades = await db.query.trades.findMany({
        where: eq(trades.challengeId, challengeId),
        orderBy: [desc(trades.executedAt)]
    });

    let calculatedBalance = startingBalance;

    for (const trade of allTrades.reverse()) {
        const amount = parseFloat(trade.amount);
        const shares = parseFloat(trade.shares);
        const price = parseFloat(trade.price);

        if (trade.type === "BUY") {
            calculatedBalance -= amount;
        } else if (trade.type === "SELL") {
            const proceeds = shares * price;
            calculatedBalance += proceeds;
        }
    }

    const discrepancy = currentBalance - calculatedBalance;

    if (discrepancy === 0) {
        return NextResponse.json({
            success: true,
            message: "Balance is already correct, no fix needed",
            challengeId,
            currentBalance,
            calculatedBalance
        });
    }

    if (dryRun) {
        return NextResponse.json({
            success: true,
            dryRun: true,
            message: `Would fix balance from $${currentBalance} to $${calculatedBalance} (discrepancy: $${discrepancy})`,
            challengeId,
            currentBalance,
            calculatedBalance,
            discrepancy,
            howToApply: "Set dryRun: false to apply the fix"
        });
    }

    // Apply the fix
    await db.update(challenges)
        .set({ currentBalance: calculatedBalance.toString() })
        .where(eq(challenges.id, challengeId));

    console.log(`[Admin Fix] Challenge ${challengeId} balance fixed: $${currentBalance} → $${calculatedBalance} (was off by $${discrepancy})`);

    return NextResponse.json({
        success: true,
        message: `Balance fixed successfully`,
        challengeId,
        previousBalance: currentBalance,
        newBalance: calculatedBalance,
        discrepancyFixed: discrepancy
    });
}
