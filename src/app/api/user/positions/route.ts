import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Get active challenge
        const activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, session.user.id),
                eq(challenges.status, "active")
            ),
        });

        if (!activeChallenge) {
            return NextResponse.json({ positions: [] });
        }

        // 2. Get all open positions
        const openPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, activeChallenge.id),
                eq(positions.status, "OPEN")
            ),
            orderBy: (positions, { desc }) => [desc(positions.openedAt)]
        });

        // 3. Transform to clean format
        // We need market details (title) but for now we might map ID to a static title or fetch if possible.
        // For MVP, we'll try to guess title or just show Market ID if we don't have a markets table sync.
        // Actually, the ingestion worker puts market data in Redis.
        // But for the Table, we'll just formatting.

        const formattedPositions = openPositions.map(pos => {
            const entry = parseFloat(pos.entryPrice);
            const current = parseFloat(pos.currentPrice || pos.entryPrice); // This should be updated by a background worker ideally, or we accept it's stale until WS updates it
            const shares = parseFloat(pos.shares);
            const pnl = (current - entry) * shares;

            return {
                id: pos.id,
                marketTitle: pos.marketId === "21742633140121905979720502385255162663563053022834833784511119623297328612769"
                    ? "Will Donald Trump win the 2024 Election?"
                    : `Market ${pos.marketId.substring(0, 8)}...`,
                direction: pos.direction as "YES" | "NO",
                entryPrice: entry,
                currentPrice: current,
                shares: shares,
                unrealizedPnL: pnl
            };
        });

        return NextResponse.json({ positions: formattedPositions });

    } catch (error) {
        console.error("Failed to fetch positions:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
