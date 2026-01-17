/**
 * Admin API: User Event Logs
 * GET /api/admin/events?userId=xxx&action=trade_executed&limit=50
 * 
 * Query user activity from the activity_logs table
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        // Parse query params
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const action = searchParams.get("action");
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

        // Build conditions
        const conditions = [];
        if (userId) {
            conditions.push(eq(activityLogs.userId, userId));
        }
        if (action) {
            conditions.push(eq(activityLogs.action, action));
        }

        const logs = await db
            .select({
                id: activityLogs.id,
                userId: activityLogs.userId,
                action: activityLogs.action,
                metadata: activityLogs.metadata,
                ipAddress: activityLogs.ipAddress,
                userAgent: activityLogs.userAgent,
                createdAt: activityLogs.createdAt,
            })
            .from(activityLogs)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(activityLogs.createdAt))
            .limit(limit);

        // Get user names for display
        const userIds = [...new Set(logs.map(l => l.userId))];
        const userMap = new Map<string, { name: string | null; email: string }>();

        if (userIds.length > 0) {
            for (const uid of userIds) {
                const userRecord = await db.query.users.findFirst({
                    where: eq(users.id, uid),
                    columns: { id: true, name: true, email: true }
                });
                if (userRecord) {
                    userMap.set(uid, { name: userRecord.name, email: userRecord.email });
                }
            }
        }

        // Enrich logs with user info
        const enrichedLogs = logs.map(log => ({
            ...log,
            userName: userMap.get(log.userId)?.name || userMap.get(log.userId)?.email || log.userId,
        }));

        // Get summary stats
        const actionCounts = logs.reduce((acc, log) => {
            acc[log.action] = (acc[log.action] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            logs: enrichedLogs,
            count: logs.length,
            actionCounts,
        });

    } catch (error: any) {
        console.error("[Admin Events API Error]:", error);
        return NextResponse.json(
            { error: "Failed to fetch event logs" },
            { status: 500 }
        );
    }
}
