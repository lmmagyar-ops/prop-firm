import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role (matches pattern from other admin endpoints)
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
    });

    if (user?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
