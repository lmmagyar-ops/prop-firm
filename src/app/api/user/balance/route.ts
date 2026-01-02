import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
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

        return NextResponse.json({
            balance: parseFloat(activeChallenge.currentBalance),
            equity: parseFloat(activeChallenge.currentBalance)
        });

    } catch (error) {
        console.error("Failed to fetch balance:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
