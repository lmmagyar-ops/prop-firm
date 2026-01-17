import { NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, users, payouts } from "@/db/schema";
import { eq, sql, gte, and } from "drizzle-orm";

/**
 * GET /api/stats/live
 * 
 * Returns real-time platform statistics for the landing page.
 * This endpoint is PUBLIC (no auth required) to display on landing.
 * 
 * Anthropic Engineering Standards:
 * - No sensitive data exposed
 * - Cached at edge (1 min TTL via headers)
 * - Type-safe response
 */

interface LiveStats {
    tradersFundedThisMonth: number;
    totalPayoutsUSD: number;
    activeTraders: number;
    successRate: number;
}

export async function GET() {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Run queries in parallel for performance
        const [
            fundedThisMonthResult,
            totalPayoutsResult,
            activeTradersResult,
            passedChallengesResult,
            totalChallengesResult,
        ] = await Promise.all([
            // Traders who reached funded phase this month
            db
                .select({ count: sql<number>`count(*)` })
                .from(challenges)
                .where(
                    and(
                        eq(challenges.phase, "funded"),
                        gte(challenges.startedAt, startOfMonth)
                    )
                ),

            // Total payouts processed (all time)
            db
                .select({
                    total: sql<number>`COALESCE(SUM(CAST(${payouts.amount} AS NUMERIC)), 0)`
                })
                .from(payouts)
                .where(eq(payouts.status, "completed")),

            // Active traders (users with active challenges)
            db
                .select({ count: sql<number>`count(DISTINCT ${challenges.userId})` })
                .from(challenges)
                .where(eq(challenges.status, "active")),

            // Passed challenges (for success rate)
            db
                .select({ count: sql<number>`count(*)` })
                .from(challenges)
                .where(eq(challenges.phase, "funded")),

            // Total completed challenges
            db
                .select({ count: sql<number>`count(*)` })
                .from(challenges)
                .where(
                    sql`${challenges.status} IN ('passed', 'active') OR ${challenges.phase} = 'funded'`
                ),
        ]);

        // Calculate stats with safe defaults
        const tradersFundedThisMonth = Number(fundedThisMonthResult[0]?.count || 0);
        const totalPayoutsUSD = Number(totalPayoutsResult[0]?.total || 0);
        const activeTraders = Number(activeTradersResult[0]?.count || 0);

        // Success rate: funded / (funded + failed), minimum 0%
        const passed = Number(passedChallengesResult[0]?.count || 0);
        const total = Number(totalChallengesResult[0]?.count || 1);
        const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        const stats: LiveStats = {
            tradersFundedThisMonth,
            totalPayoutsUSD,
            activeTraders,
            successRate,
        };

        // Return with cache headers (1 minute edge cache)
        return NextResponse.json(stats, {
            headers: {
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
            },
        });
    } catch (error) {
        console.error("[Live Stats API Error]:", error);

        // Return graceful fallback instead of error
        // This ensures landing page always renders
        return NextResponse.json(
            {
                tradersFundedThisMonth: 0,
                totalPayoutsUSD: 0,
                activeTraders: 0,
                successRate: 0,
            } satisfies LiveStats,
            { status: 200 } // 200 even on error for graceful degradation
        );
    }
}
