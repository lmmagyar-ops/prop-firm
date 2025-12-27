import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 });
        }

        // Fetch all challenges for this user (active and completed)
        const userChallenges = await db
            .select()
            .from(challenges)
            .where(eq(challenges.userId, userId));

        // Filter to only active challenges for the selector
        const activeChallenges = userChallenges.filter(c => c.status === "active");

        return NextResponse.json({
            challenges: activeChallenges.map(c => ({
                id: c.id,
                tier: "standard", // Default tier (not in DB schema yet)
                accountNumber: c.id.slice(0, 8).toUpperCase(), // Use ID as account number
                currentBalance: c.currentBalance,
                startingBalance: c.startingBalance,
                status: c.status,
                startedAt: c.startedAt
            }))
        });
    } catch (error) {
        console.error("Failed to fetch challenges:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
