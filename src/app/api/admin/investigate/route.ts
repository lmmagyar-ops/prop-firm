import { db } from "@/db";
import { users, challenges, trades, positions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse, NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Investigate");

/**
 * GET /api/admin/investigate?email=xxx
 * Deep investigation of a user's account for debugging
 */
export async function GET(req: NextRequest) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    const email = req.nextUrl.searchParams.get("email");

    if (!email) {
        return NextResponse.json({
            usage: "GET /api/admin/investigate?email=user@example.com",
            description: "Returns full account state for debugging"
        });
    }

    try {
        // 1. Find user
        const user = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase().trim()),
        });

        if (!user) {
            return NextResponse.json({ error: "User not found", email }, { status: 404 });
        }

        // 2. Get all challenges for this user
        const userChallenges = await db.query.challenges.findMany({
            where: eq(challenges.userId, user.id),
            orderBy: [desc(challenges.startedAt)],
        });

        // 3. For each challenge, get trades and positions
        const challengesWithData = await Promise.all(
            userChallenges.map(async (challenge) => {
                const challengeTrades = await db.query.trades.findMany({
                    where: eq(trades.challengeId, challenge.id),
                    orderBy: [desc(trades.executedAt)],
                });

                const challengePositions = await db.query.positions.findMany({
                    where: eq(positions.challengeId, challenge.id),
                });

                // Calculate expected balance from trades
                const startingBalance = parseFloat(challenge.startingBalance);
                let expectedBalance = startingBalance;
                for (const trade of challengeTrades) {
                    if (trade.type === 'BUY') {
                        expectedBalance -= parseFloat(trade.amount);
                    } else {
                        expectedBalance += parseFloat(trade.amount);
                    }
                }

                return {
                    id: challenge.id,
                    status: challenge.status,
                    phase: challenge.phase,
                    startingBalance: parseFloat(challenge.startingBalance),
                    currentBalance: parseFloat(challenge.currentBalance),
                    calculatedExpectedBalance: expectedBalance,
                    balanceMismatch: Math.abs(parseFloat(challenge.currentBalance) - expectedBalance) > 0.01,
                    highWaterMark: challenge.highWaterMark,
                    startOfDayBalance: challenge.startOfDayBalance,
                    startedAt: challenge.startedAt,
                    pnl: parseFloat(challenge.currentBalance) - startingBalance,
                    trades: challengeTrades.map(t => ({
                        id: t.id,
                        marketId: t.marketId?.slice(0, 12) + '...',
                        type: t.type,
                        amount: parseFloat(t.amount),
                        shares: parseFloat(t.shares),
                        price: parseFloat(t.price),
                        executedAt: t.executedAt,
                    })),
                    positions: challengePositions.map(p => ({
                        id: p.id,
                        marketId: p.marketId?.slice(0, 12) + '...',
                        direction: p.direction,
                        shares: parseFloat(p.shares),
                        entryPrice: parseFloat(p.entryPrice),
                        sizeAmount: parseFloat(p.sizeAmount),
                        status: p.status,
                        openedAt: p.openedAt,
                    })),
                    tradeCount: challengeTrades.length,
                    positionCount: challengePositions.length,
                    openPositionCount: challengePositions.filter(p => p.status === 'OPEN').length,
                };
            })
        );

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name || user.displayName,
                role: user.role,
                createdAt: user.createdAt,
                isActive: user.isActive,
            },
            challenges: challengesWithData,
            summary: {
                totalChallenges: userChallenges.length,
                activeChallenges: userChallenges.filter(c => c.status === 'active').length,
                totalTrades: challengesWithData.reduce((sum, c) => sum + c.tradeCount, 0),
                totalPositions: challengesWithData.reduce((sum, c) => sum + c.positionCount, 0),
                openPositions: challengesWithData.reduce((sum, c) => sum + c.openPositionCount, 0),
            }
        });

    } catch (error) {
        logger.error("[Investigate] Error:", error);
        return NextResponse.json({ error: "Investigation failed", details: String(error) }, { status: 500 });
    }
}
