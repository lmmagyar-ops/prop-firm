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

    // Get all trades
    const allTrades = await db.query.trades.findMany({
        where: eq(trades.challengeId, challengeId),
        orderBy: [desc(trades.executedAt)]
    });

    // Calculate what balance SHOULD be
    let calculatedBalance = startingBalance;
    const tradeLog: { type: string; amount: number; balanceAfter: number; shares: number; price: number; time: Date | null }[] = [];

    for (const trade of allTrades.reverse()) { // Process in chronological order
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
            const proceeds = shares * price;
            calculatedBalance += proceeds;
            tradeLog.push({
                type: "SELL",
                amount: proceeds,
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
        startingBalance,
        currentBalance,
        calculatedBalance,
        discrepancy,
        discrepancyExplanation: discrepancy === 0
            ? "Balance matches trades ✅"
            : `⚠️ Balance is $${discrepancy.toFixed(2)} off from expected`,
        totalBuys: allTrades.filter(t => t.type === "BUY").length,
        totalSells: allTrades.filter(t => t.type === "SELL").length,
        tradeLog
    });
}
