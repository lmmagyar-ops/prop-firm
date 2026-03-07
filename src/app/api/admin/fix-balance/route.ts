import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { challenges, trades } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
const logger = createLogger("FixBalance");

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
    const isFunded = challenge.phase === 'funded';

    // Get all trades in chronological order
    const allTrades = await db.query.trades.findMany({
        where: eq(trades.challengeId, challengeId),
        orderBy: [desc(trades.executedAt)]
    });
    const chronTrades = [...allTrades].reverse();

    // PHASE-AWARE RECONSTRUCTION: Mirrors balance-audit cron logic exactly.
    // Funded challenges had a hard resetBalance() to startingBalance at transition.
    // All pre-transition trades are irrelevant to the current balance — skip them.
    let tradesToReplay = chronTrades;
    if (isFunded) {
        let transitionIndex = -1;
        for (let i = chronTrades.length - 1; i >= 0; i--) {
            if (chronTrades[i].closureReason === 'pass_liquidation') {
                transitionIndex = i;
                break;
            }
        }
        if (transitionIndex >= 0) {
            tradesToReplay = chronTrades.slice(transitionIndex + 1);
            logger.info(`[FixBalance] Funded challenge: skipping ${transitionIndex + 1} pre-transition trades, replaying ${tradesToReplay.length}`);
        }
    }

    let calculatedBalance = startingBalance;

    // Use trade.amount for both BUY and SELL — this is exactly what BalanceManager
    // deducts/credits, so it's the authoritative source. For SELLs, trade.amount is
    // set to shares * executionPrice at trade time (same as creditProceeds receives).
    for (const trade of tradesToReplay) {
        const amount = parseFloat(trade.amount);

        if (trade.type === "BUY") {
            calculatedBalance -= amount;
        } else if (trade.type === "SELL") {
            calculatedBalance += amount;
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

    logger.info(`[Admin Fix] Challenge ${challengeId} balance fixed: $${currentBalance} → $${calculatedBalance} (was off by $${discrepancy})`);

    return NextResponse.json({
        success: true,
        message: `Balance fixed successfully`,
        challengeId,
        previousBalance: currentBalance,
        newBalance: calculatedBalance,
        discrepancyFixed: discrepancy
    });
}
