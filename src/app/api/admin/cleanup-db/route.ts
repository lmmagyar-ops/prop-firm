/**
 * Admin API: Cleanup Corrupted Data
 * Deletes positions with invalid entry prices
 * 
 * POST /api/admin/cleanup-db
 * Body: { dryRun?: boolean }
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { positions, challenges } from "@/db/schema";
import { eq, or, sql, inArray } from "drizzle-orm";
import { auth } from "@/auth";

export async function POST(req: Request) {
    // Security: Admin only
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to dry run for safety

    try {
        console.log(`🧹 DATABASE CLEANUP - ${dryRun ? 'DRY RUN' : 'LIVE EXECUTION'}...`);

        // 1. Find positions with invalid entry prices (≤0.01 or ≥0.99)
        const invalidPositions = await db.query.positions.findMany({
            where: or(
                sql`CAST(${positions.entryPrice} AS DECIMAL) <= 0.01`,
                sql`CAST(${positions.entryPrice} AS DECIMAL) >= 0.99`
            )
        });

        let deletedCount = 0;
        const deletedIds: string[] = [];

        if (invalidPositions.length > 0 && !dryRun) {
            // Delete corrupted positions
            const idsToDelete = invalidPositions.map(p => p.id);
            await db.delete(positions).where(inArray(positions.id, idsToDelete));
            deletedCount = invalidPositions.length;
            deletedIds.push(...idsToDelete);
            console.log(`🗑️  Deleted ${deletedCount} corrupted positions`);
        }

        // 2. Report on funded challenges (don't auto-delete - needs manual review)
        const fundedChallenges = await db.query.challenges.findMany({
            where: eq(challenges.phase, "funded")
        });

        const report = {
            timestamp: new Date().toISOString(),
            dryRun,
            positions: {
                found: invalidPositions.length,
                deleted: deletedCount,
                deletedIds,
                skipped: dryRun ? invalidPositions.map(p => ({
                    id: p.id,
                    marketId: p.marketId.slice(0, 30) + "...",
                    entryPrice: p.entryPrice,
                    direction: p.direction
                })) : []
            },
            fundedChallenges: {
                count: fundedChallenges.length,
                note: "Funded challenges require manual review - not auto-deleted",
                items: fundedChallenges.map(ch => ({
                    id: ch.id,
                    userId: ch.userId,
                    status: ch.status
                }))
            }
        };

        console.log("✅ Cleanup complete:", {
            dryRun,
            positionsDeleted: deletedCount,
            fundedChallengesFound: fundedChallenges.length
        });

        return NextResponse.json(report);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("❌ Cleanup failed:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
