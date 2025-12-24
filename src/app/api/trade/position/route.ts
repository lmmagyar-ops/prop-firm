import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const marketId = searchParams.get("marketId");

    if (!userId || !marketId) {
        return NextResponse.json({ error: "Missing required params" }, { status: 400 });
    }

    try {
        // 1. Get active challenge
        const activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, userId),
                eq(challenges.status, "active")
            ),
        });

        if (!activeChallenge) {
            return NextResponse.json({ position: null });
        }

        // 2. Get open position for this market
        const position = await db.query.positions.findFirst({
            where: and(
                eq(positions.challengeId, activeChallenge.id),
                eq(positions.marketId, marketId),
                eq(positions.status, "OPEN")
            )
        });

        if (!position) {
            return NextResponse.json({ position: null });
        }

        // 3. Calculate metrics
        const entry = parseFloat(position.entryPrice);
        const current = parseFloat(position.currentPrice || position.entryPrice);
        const shares = parseFloat(position.shares);
        const invested = parseFloat(position.sizeAmount);

        // P&L Formula: (Current - Entry) * Shares
        const currentPnl = (current - entry) * shares;

        // ROI metric
        const roi = invested > 0 ? (currentPnl / invested) * 100 : 0;

        return NextResponse.json({
            position: {
                id: position.id,
                shares,
                avgPrice: entry,
                invested,
                currentPnl,
                roi,
                side: position.direction as "YES" | "NO"
            }
        });

    } catch (error) {
        console.error("Failed to fetch position:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
