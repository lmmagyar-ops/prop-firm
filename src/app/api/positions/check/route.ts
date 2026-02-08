import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { positions, challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/positions/check?marketId=xxx
 * 
 * Returns the user's open position for a given market (if any).
 * Used by the TradingSidebar sell mode to show position info.
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ position: null }, { status: 200 });
    }

    const marketId = req.nextUrl.searchParams.get("marketId");
    if (!marketId) {
        return NextResponse.json({ error: "marketId required" }, { status: 400 });
    }

    try {
        // Find user's active challenge
        const activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, userId),
                eq(challenges.status, "active")
            )
        });

        if (!activeChallenge) {
            return NextResponse.json({ position: null });
        }

        // Find open position for this market
        const position = await db.query.positions.findFirst({
            where: and(
                eq(positions.challengeId, activeChallenge.id),
                eq(positions.marketId, marketId),
                eq(positions.status, "OPEN")
            ),
            orderBy: (positions, { desc }) => [desc(positions.openedAt)]
        });

        return NextResponse.json({ position: position || null });
    } catch (error) {
        console.error("Position check failed:", error);
        return NextResponse.json({ position: null });
    }
}
