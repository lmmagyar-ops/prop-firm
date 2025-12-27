import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, session.user.id),
                eq(challenges.status, "active")
            ),
        });

        if (!activeChallenge) {
            return NextResponse.json({ balance: 0, equity: 0 });
        }

        // Equity would ideally include unrealized PnL from positions
        // For MVP, we'll just return the cash balance stored in DB + maybe PnL calculation if feasible
        // But let's just return what is in DB for now to be safe.
        // Ideally we should calculate equity = balance + sum(position.value)

        return NextResponse.json({
            balance: parseFloat(activeChallenge.currentBalance),
            equity: parseFloat(activeChallenge.currentBalance) // TODO: Add PnL
        });

    } catch (error) {
        console.error("Failed to fetch balance:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
