import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const marketId = searchParams.get("marketId");
    const direction = searchParams.get("direction") as "YES" | "NO" | null;

    if (!userId || !marketId) {
        return NextResponse.json({ error: "Missing required params" }, { status: 400 });
    }

    // Ownership check
    if (userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        // If direction is provided, filter by it; otherwise get most recent
        const whereConditions = [
            eq(positions.challengeId, activeChallenge.id),
            eq(positions.marketId, marketId),
            eq(positions.status, "OPEN")
        ];

        if (direction) {
            whereConditions.push(eq(positions.direction, direction));
        }

        const position = await db.query.positions.findFirst({
            where: and(...whereConditions),
            orderBy: (positions, { desc }) => [desc(positions.openedAt)]
        });

        if (!position) {
            return NextResponse.json({ position: null });
        }

        // 3. Calculate metrics
        const entry = parseFloat(position.entryPrice);
        const current = parseFloat(position.currentPrice || position.entryPrice);
        const shares = parseFloat(position.shares);
        const invested = parseFloat(position.sizeAmount);
        const posDirection = position.direction as "YES" | "NO";

        // P&L Formula: direction-aware calculation
        // YES: profit when price goes UP (current - entry)
        // NO: profit when price goes DOWN (entry - current)
        const currentPnl = posDirection === "YES"
            ? (current - entry) * shares
            : (entry - current) * shares;

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
                side: posDirection
            }
        });

    } catch (error) {
        console.error("Failed to fetch position:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
