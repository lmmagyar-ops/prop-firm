import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { users, challenges, trades, positions } from "@/db/schema";
import { eq, or, like } from "drizzle-orm";

// Temporary endpoint to investigate Mat's suspicious P&L
// GET /api/admin/investigate?email=marcio
export async function GET(req: Request) {
    const adminCheck = await requireAdmin();
    if (adminCheck) return adminCheck;

    const { searchParams } = new URL(req.url);
    const searchEmail = searchParams.get("email") || "marcio";

    // Find matching users
    const matchingUsers = await db.query.users.findMany({
        where: like(users.email, `%${searchEmail}%`)
    });

    const results = [];

    for (const user of matchingUsers) {
        const userResult: any = {
            email: user.email,
            id: user.id,
            challenges: []
        };

        // Get challenges
        const userChallenges = await db.query.challenges.findMany({
            where: eq(challenges.userId, user.id)
        });

        for (const challenge of userChallenges) {
            const rulesConfig = challenge.rulesConfig as any;
            const startingBalance = rulesConfig?.startingBalance || 10000;
            const currentBalance = parseFloat(challenge.currentBalance);
            const pnl = currentBalance - startingBalance;

            // Get trades
            const challengeTrades = await db.query.trades.findMany({
                where: eq(trades.challengeId, challenge.id),
                orderBy: (trades, { desc }) => [desc(trades.executedAt)]
            });

            // Get positions
            const challengePositions = await db.query.positions.findMany({
                where: eq(positions.challengeId, challenge.id)
            });

            userResult.challenges.push({
                id: challenge.id,
                status: challenge.status,
                startingBalance,
                currentBalance,
                pnl,
                trades: challengeTrades.map(t => ({
                    type: t.type,
                    price: parseFloat(t.price),
                    shares: parseFloat(t.shares),
                    amount: parseFloat(t.amount),
                    marketId: t.marketId,
                    executedAt: t.executedAt
                })),
                positions: challengePositions.map(p => ({
                    status: p.status,
                    direction: p.direction,
                    entryPrice: parseFloat(p.entryPrice),
                    shares: parseFloat(p.shares),
                    sizeAmount: parseFloat(p.sizeAmount || '0'),
                    marketId: p.marketId
                }))
            });
        }

        results.push(userResult);
    }

    return NextResponse.json({ results });
}
