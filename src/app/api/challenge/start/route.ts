import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Start");

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Find the pending challenge for this user
        const pendingChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, session.user.id),
                eq(challenges.status, "pending")
            ),
        });

        if (!pendingChallenge) {
            return NextResponse.json({ error: "No pending challenge found" }, { status: 404 });
        }

        // Activate it
        const now = new Date();
        const durationDays = 30; // Hardcoded rules for MVp
        const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        await db.update(challenges)
            .set({
                status: "active",
                startedAt: now,
                endsAt: endsAt,
                // Ensure initial balances are confirmed if needed, but they were set on creation
            })
            .where(eq(challenges.id, pendingChallenge.id));

        return NextResponse.json({ success: true, challengeId: pendingChallenge.id });

    } catch (error) {
        logger.error("Failed to start challenge:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
