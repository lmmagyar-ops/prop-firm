import { db } from "@/db";
import { challenges, trades, users } from "@/db/schema";
import { sql, eq, gte, and } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { getTierPrice } from "@/lib/admin-utils";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Analytics");

export async function GET() {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        // ── Challenge status breakdown ─────────────────────────────────
        const challengeStats = await db
            .select({
                status: challenges.status,
                count: sql<number>`count(*)`
            })
            .from(challenges)
            .groupBy(challenges.status);

        const totalChallenges = challengeStats.reduce((acc, curr) => acc + Number(curr.count), 0);
        const activeCount = Number(challengeStats.find(s => s.status === 'active')?.count || 0);
        const failedCount = Number(challengeStats.find(s => s.status === 'failed')?.count || 0);
        const passedCount = Number(challengeStats.find(s => s.status === 'passed')?.count || 0);

        const totalEnded = failedCount + passedCount;
        const passRate = totalEnded > 0 ? (passedCount / totalEnded * 100).toFixed(1) : "0.0";

        // ── Real daily revenue — last 30 days ─────────────────────────
        // Group challenges by start date and sum real tier prices
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const allChallengesForRevenue = await db
            .select({
                startedAt: challenges.startedAt,
                startingBalance: challenges.startingBalance,
            })
            .from(challenges);

        // Build a date-bucketed revenue map for last 30 days
        const revenueByDay: Record<string, number> = {};
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0]!;
            revenueByDay[key] = 0;
        }

        for (const c of allChallengesForRevenue) {
            if (!c.startedAt) continue;
            const key = c.startedAt.toISOString().split('T')[0]!;
            if (key in revenueByDay) {
                revenueByDay[key]! += getTierPrice(c.startingBalance);
            }
        }

        const dailyRevenue = Object.values(revenueByDay);
        const totalRevenue = allChallengesForRevenue.reduce(
            (sum, c) => sum + getTierPrice(c.startingBalance), 0
        );

        // ── Payout stats ──────────────────────────────────────────────
        // Count funded challenges with payouts pending
        const fundedPhase = Number(
            (await db
                .select({ count: sql<number>`count(*)` })
                .from(challenges)
                .where(and(eq(challenges.status, 'active'), eq(challenges.phase, 'funded')))
            )[0]?.count || 0
        );

        return NextResponse.json({
            revenue: {
                daily: dailyRevenue,
                total: totalRevenue,
                trend: "+12.5%" // FUTURE(v2): calculate real week-over-week trend
            },
            activeUsers: {
                challenge: activeCount,
                verification: 0,
                funded: fundedPhase,
                total: activeCount + fundedPhase
            },
            passRate: {
                value: passRate,
                trend: "0%" // FUTURE(v2): calculate real trend
            },
            payouts: {
                pending: 0,
                nextScheduled: "Upon approval"
            }
        });

    } catch (error) {
        logger.error("Analytics Error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
