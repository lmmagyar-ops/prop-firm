import { db } from "@/db";
import { users, challenges } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Challenges");

export async function GET() {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        // Fetch all users with their challenges
        // Note: Drizzle query builder might be cleaner, but simple join works
        const allChallenges = await db
            .select({
                userId: users.id,
                userName: users.name,
                email: users.email,
                challengeId: challenges.id,
                status: challenges.status,
                phase: challenges.phase,
                balance: challenges.currentBalance,
                startDate: challenges.startedAt,
            })
            .from(challenges)
            .innerJoin(users, eq(challenges.userId, users.id))
            .orderBy(desc(challenges.startedAt));

        return NextResponse.json({ challenges: allChallenges });
    } catch (error) {
        logger.error("Admin List Error:", error);
        return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
    }
}
