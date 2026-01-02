import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ChallengeEvaluator } from "@/lib/evaluator";

export async function POST(req: NextRequest) {
    try {
        const { userId, balance } = await req.json();
        const targetUserId = userId || "demo-user-1";
        const newBalance = balance || 11100;

        const activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, targetUserId),
                eq(challenges.status, "active")
            )
        });

        if (!activeChallenge) {
            return NextResponse.json({ error: "No active challenge found" }, { status: 404 });
        }

        // Update balance
        await db.update(challenges)
            .set({ currentBalance: newBalance.toString() })
            .where(eq(challenges.id, activeChallenge.id));

        // Trigger evaluation
        const result = await ChallengeEvaluator.evaluate(activeChallenge.id);

        return NextResponse.json({
            success: true,
            message: `Balance updated to ${newBalance} and evaluated`,
            result
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
