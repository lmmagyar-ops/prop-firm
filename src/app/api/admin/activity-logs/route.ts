import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { desc, eq, sql, and, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const session = await auth();

    // Admin only
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
    });

    if (user?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const hours = parseInt(searchParams.get("hours") || "24");

    // Build query conditions
    const conditions = [];

    if (userId) {
        conditions.push(eq(activityLogs.userId, userId));
    }

    if (action) {
        conditions.push(eq(activityLogs.action, action));
    }

    // Time filter
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    conditions.push(gte(activityLogs.createdAt, since));

    try {
        const logs = await db
            .select({
                id: activityLogs.id,
                userId: activityLogs.userId,
                action: activityLogs.action,
                ipAddress: activityLogs.ipAddress,
                userAgent: activityLogs.userAgent,
                metadata: activityLogs.metadata,
                createdAt: activityLogs.createdAt,
                userName: users.name,
                userEmail: users.email,
            })
            .from(activityLogs)
            .leftJoin(users, eq(activityLogs.userId, users.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(activityLogs.createdAt))
            .limit(limit);

        // Get unique action types for filter dropdown
        const actionTypes = await db
            .selectDistinct({ action: activityLogs.action })
            .from(activityLogs)
            .limit(50);

        // Get unique users for filter dropdown
        const activeUsers = await db
            .selectDistinct({
                userId: activityLogs.userId,
                userName: users.name,
                userEmail: users.email,
            })
            .from(activityLogs)
            .leftJoin(users, eq(activityLogs.userId, users.id))
            .where(gte(activityLogs.createdAt, since))
            .limit(50);

        return NextResponse.json({
            logs,
            actionTypes: actionTypes.map(a => a.action),
            activeUsers,
            count: logs.length,
            since: since.toISOString(),
        });
    } catch (error) {
        console.error("[Activity Logs API]", error);
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
