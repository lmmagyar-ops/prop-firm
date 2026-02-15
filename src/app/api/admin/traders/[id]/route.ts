import { db } from "@/db";
import { challenges, users, trades, positions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { computeWinRate, computeAverage } from "@/lib/position-utils";
import { createLogger } from "@/lib/logger";
const logger = createLogger("[id]");

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const { id: challengeId } = await params;

        // 1. Fetch Challenge & User Info
        const challengeData = await db
            .select({
                id: challenges.id,
                status: challenges.status,
                phase: challenges.phase,
                currentBalance: challenges.currentBalance,
                startingBalance: challenges.startingBalance,
                startDate: challenges.startedAt,
                rulesConfig: challenges.rulesConfig,
                userId: users.id,
                userName: users.name,
                email: users.email,
            })
            .from(challenges)
            .innerJoin(users, eq(challenges.userId, users.id))
            .where(eq(challenges.id, challengeId))
            .limit(1);

        if (challengeData.length === 0) {
            return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
        }

        const challenge = challengeData[0];

        // 2. Fetch Trade History & Stats
        const tradeHistory = await db
            .select({
                id: trades.id,
                marketId: trades.marketId,
                side: positions.direction,
                type: trades.type,
                amount: trades.amount,
                price: trades.price,
                pnl: trades.realizedPnL,
                closedPrice: positions.closedPrice,
                createdAt: trades.executedAt,
            })
            .from(trades)
            .leftJoin(positions, eq(trades.positionId, positions.id))
            .where(eq(trades.challengeId, challengeId))
            .orderBy(desc(trades.executedAt));

        // 3. Construct Timeline Data (Mocking daily snapshots from trades for now)
        // In a real app, you'd have a 'daily_snapshots' table. 
        // Here we'll simulate it by aggregating trades by day.
        const timelineData = [];
        // Simpler approach for MVP: Start from 'startingBalance' and apply trades.
        const startingBalance = Number(challenge.startingBalance || 10000);
        let simBalance = startingBalance;
        const tradesAsc = [...tradeHistory].reverse();

        // Group trades by date
        const dailyPnl: Record<string, number> = {};
        tradesAsc.forEach(t => {
            const dateStr = t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            dailyPnl[dateStr] = (dailyPnl[dateStr] || 0) + (Number(t.pnl) || 0);
        });

        const dates = Object.keys(dailyPnl).sort();

        // Generate timeline points
        // If no trades, just show start
        if (dates.length === 0) {
            const startDate = challenge.startDate ? new Date(challenge.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            timelineData.push({ date: startDate, balance: startingBalance });
        } else {
            // Add start point
            const startDate = challenge.startDate ? new Date(challenge.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            timelineData.push({ date: startDate, balance: startingBalance });

            dates.forEach(date => {
                simBalance += dailyPnl[date];
                timelineData.push({ date, balance: simBalance });
            });
        }

        // 4. Calculate Stats
        const sellTrades = tradeHistory.filter(t => t.type === 'SELL');
        const winRate = computeWinRate(
            tradeHistory.map(t => ({ type: t.type, realizedPnL: t.pnl })),
        );
        const wins = sellTrades.filter(t => Number(t.pnl) > 0);
        const losses = sellTrades.filter(t => Number(t.pnl) < 0);
        const avgWin = computeAverage(wins.map(t => Number(t.pnl)));
        const avgLoss = computeAverage(losses.map(t => Number(t.pnl)));

        return NextResponse.json({
            challenge,
            stats: {
                totalTrades: tradeHistory.length,
                winRate,
                avgWin,
                avgLoss,
            },
            trades: tradeHistory,
            timeline: timelineData
        });

    } catch (error) {
        logger.error("Trader Detail Error:", error);
        return NextResponse.json({ error: "Failed to fetch trader details" }, { status: 500 });
    }
}
