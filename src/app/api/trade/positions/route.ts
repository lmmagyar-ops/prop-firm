import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ positions: [] });

    // Find active challenge
    const activeChallenge = await db.query.challenges.findFirst({
        where: and(
            eq(challenges.userId, session.user.id),
            eq(challenges.status, "active")
        )
    });

    if (!activeChallenge) return NextResponse.json({ positions: [] });

    const openPositions = await db.query.positions.findMany({
        where: eq(positions.challengeId, activeChallenge.id)
    });

    // Map to frontend format
    // Note: We should fetch current prices from Redis in a real integration, 
    // but for now we fallback to entry or simulated price if available.
    // Assuming 'currentPrice' column is being updated by periodic jobs or we fetch here.

    // Simplification: Just return stored data. In a real app we'd merge with live market data cache.
    const mapped = openPositions.map(pos => {
        const entry = parseFloat(pos.entryPrice);
        const current = parseFloat(pos.currentPrice || pos.entryPrice); // Fallback
        const shares = parseFloat(pos.shares);
        const unrealizedPnL = (current - entry) * shares;

        return {
            id: pos.id,
            marketTitle: "Market Position", // TODO: Join with market table to get title
            direction: pos.direction,
            shares,
            avgPrice: entry,
            currentPrice: current,
            unrealizedPnL
        };
    });

    return NextResponse.json({ positions: mapped });
}
