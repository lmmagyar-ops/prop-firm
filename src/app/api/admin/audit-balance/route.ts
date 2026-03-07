import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { users, challenges, trades, positions } from "@/db/schema";
import { eq, desc, like } from "drizzle-orm";
import { sql } from "drizzle-orm";

// Audit endpoint to investigate balance discrepancies
// GET /api/admin/audit-balance?challengeId=xxx
export async function GET(req: Request) {
    const adminAuth = await requireAdmin();
    if (!adminAuth.isAuthorized) {
        return adminAuth.response;
    }

    const { searchParams } = new URL(req.url);
    const challengeId = searchParams.get("challengeId");

    if (!challengeId) {
        return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
    }

    // Get challenge details
    const challenge = await db.query.challenges.findFirst({
        where: eq(challenges.id, challengeId)
    });

    if (!challenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const startingBalance = parseFloat(challenge.startingBalance || '10000');
    const currentBalance = parseFloat(challenge.currentBalance);
    const isFunded = challenge.phase === 'funded';

    // Get all trades in chronological order (oldest first for replay)
    const allTrades = await db.query.trades.findMany({
        where: eq(trades.challengeId, challengeId),
        orderBy: [desc(trades.executedAt)]
    });
    const chronTrades = [...allTrades].reverse();

    // PHASE-AWARE RECONSTRUCTION: Mirrors balance-audit cron logic exactly.
    // Funded challenges had a hard resetBalance() to startingBalance at transition.
    // Only replay trades that occurred AFTER the funded transition.
    let tradesToReplay = chronTrades;
    let preTransitionCount = 0;
    if (isFunded) {
        let transitionIndex = -1;
        for (let i = chronTrades.length - 1; i >= 0; i--) {
            if (chronTrades[i].closureReason === 'pass_liquidation') {
                transitionIndex = i;
                break;
            }
        }
        if (transitionIndex >= 0) {
            preTransitionCount = transitionIndex + 1;
            tradesToReplay = chronTrades.slice(preTransitionCount);
        }
    }

    // Calculate what balance SHOULD be
    let calculatedBalance = startingBalance;
    const tradeLog: { type: string; amount: number; balanceAfter: number; shares: number; price: number; time: Date | null }[] = [];

    // Use trade.amount for both BUY and SELL — matches BalanceManager exactly.
    for (const trade of tradesToReplay) { // Process in chronological order
        const amount = parseFloat(trade.amount);
        const shares = parseFloat(trade.shares);
        const price = parseFloat(trade.price);

        if (trade.type === "BUY") {
            calculatedBalance -= amount;
            tradeLog.push({
                type: "BUY",
                amount: -amount,
                balanceAfter: calculatedBalance,
                shares,
                price,
                time: trade.executedAt
            });
        } else if (trade.type === "SELL") {
            calculatedBalance += amount;  // trade.amount == shares * executionPrice (set at trade time)
            tradeLog.push({
                type: "SELL",
                amount,
                balanceAfter: calculatedBalance,
                shares,
                price,
                time: trade.executedAt
            });
        }
    }

    const discrepancy = currentBalance - calculatedBalance;

    return NextResponse.json({
        challengeId,
        phase: challenge.phase,
        startingBalance,
        currentBalance,
        calculatedBalance,
        discrepancy,
        discrepancyExplanation: discrepancy === 0
            ? "Balance matches trades ✅"
            : `⚠️ Balance is $${discrepancy.toFixed(2)} off from expected`,
        totalBuys: tradesToReplay.filter(t => t.type === "BUY").length,
        totalSells: tradesToReplay.filter(t => t.type === "SELL").length,
        preTransitionTradesSkipped: preTransitionCount,
        tradeLog
    });
}
