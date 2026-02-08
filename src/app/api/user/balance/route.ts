import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get selected challenge from cookie
        const cookieStore = await cookies();
        const selectedChallengeId = cookieStore.get("selectedChallengeId")?.value;

        let activeChallenge;

        if (selectedChallengeId) {
            activeChallenge = await db.query.challenges.findFirst({
                where: and(
                    eq(challenges.id, selectedChallengeId),
                    eq(challenges.userId, session.user.id),
                    eq(challenges.status, "active")
                ),
            });
        }

        // Fallback to first active challenge
        if (!activeChallenge) {
            activeChallenge = await db.query.challenges.findFirst({
                where: and(
                    eq(challenges.userId, session.user.id),
                    eq(challenges.status, "active")
                ),
            });
        }

        if (!activeChallenge) {
            return NextResponse.json({ balance: 0, equity: 0 });
        }

        // Compute true equity = cash + position value
        const cash = parseFloat(activeChallenge.currentBalance);

        const openPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, activeChallenge.id),
                eq(positions.status, "OPEN")
            ),
        });

        const positionValue = openPositions.reduce((sum, pos) => {
            const current = parseFloat(pos.currentPrice || pos.entryPrice);
            const shares = parseFloat(pos.shares);
            return sum + (current * shares);
        }, 0);

        const equity = cash + positionValue;

        return NextResponse.json({
            balance: cash,
            equity,
            positionValue,
            positionCount: openPositions.length,
        });

    } catch (error) {
        console.error("Failed to fetch balance:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
