/**
 * Admin API: Database Audit
 * Finds corrupted positions and unexpected funded challenges
 * 
 * GET /api/admin/audit-db
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { positions, challenges } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET() {
    // Security: Admin only
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role (optional - remove if you want any logged-in user to access)
    // const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
    // if (user?.role !== 'admin') {
    //     return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    // }

    try {
        console.log("🔍 DATABASE AUDIT - Finding corrupted data...");

        // 1. Find positions with invalid entry prices (≤0.01 or ≥0.99)
        const invalidPositions = await db.query.positions.findMany({
            where: or(
                sql`CAST(${positions.entryPrice} AS DECIMAL) <= 0.01`,
                sql`CAST(${positions.entryPrice} AS DECIMAL) >= 0.99`
            )
        });

        // 2. Find challenges with phase='funded'
        const fundedChallenges = await db.query.challenges.findMany({
            where: eq(challenges.phase, "funded")
        });

        // 3. Format response
        const report = {
            timestamp: new Date().toISOString(),
            invalidPositions: {
                count: invalidPositions.length,
                items: invalidPositions.map(pos => ({
                    id: pos.id,
                    marketId: pos.marketId,
                    direction: pos.direction,
                    entryPrice: pos.entryPrice,
                    shares: pos.shares,
                    status: pos.status,
                    openedAt: pos.openedAt
                }))
            },
            fundedChallenges: {
                count: fundedChallenges.length,
                items: fundedChallenges.map(ch => ({
                    id: ch.id,
                    userId: ch.userId,
                    status: ch.status,
                    currentBalance: ch.currentBalance,
                    startedAt: ch.startedAt
                }))
            },
            summary: {
                corruptedPositions: invalidPositions.length,
                fundedAccounts: fundedChallenges.length
            }
        };

        console.log("✅ Audit complete:", report.summary);

        return NextResponse.json(report);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("❌ Audit failed:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
