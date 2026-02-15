import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const logger = createLogger("MigratePrivacy");

/**
 * POST /api/admin/migrate-privacy
 * 
 * One-shot migration: set all semi_private users to public.
 * Delete this endpoint after running once.
 */
export async function POST() {
    const session = await auth();
    if (session?.user?.email !== "les@predictionsfirm.com") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await db.execute(
            sql`UPDATE users SET leaderboard_privacy = 'public' WHERE leaderboard_privacy = 'semi_private' OR leaderboard_privacy IS NULL`
        );

        logger.info("Privacy migration complete", { rowCount: result.rowCount });

        return NextResponse.json({
            success: true,
            usersUpdated: result.rowCount,
        });
    } catch (error) {
        logger.error("Privacy migration failed", error);
        return NextResponse.json({ error: "Migration failed" }, { status: 500 });
    }
}
