import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, users, payouts, positions } from "@/db/schema";
import { eq, and, gte, sql, count, inArray } from "drizzle-orm";

import { requireAdmin } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("QuickStats");

export async function GET() {
    // SECURITY: Verify admin role before processing
    const { isAuthorized, response, user: adminUser } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const session = await auth();
        const email = session?.user?.email;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        // Look up user ID by email (session might not include id)
        let userId: string | null = null;
        if (email) {
            const [user] = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, email))
                .limit(1);
            userId = user?.id || null;
        }



        // Run all queries concurrently for speed
        const [
            pendingPayoutsResult,
            failedTodayResult,
            activeChallengesResult,
            signupsTodayResult,
            riskAlertsResult,
            myChallengeResult
        ] = await Promise.all([
            // Pending payouts
            db
                .select({
                    count: count(),
                    total: sql<number>`COALESCE(SUM(CAST(${payouts.amount} AS NUMERIC)), 0)`,
                })
                .from(payouts)
                .where(eq(payouts.status, "pending"))
                .catch(() => [{ count: 0, total: 0 }]),

            // Failed today (using startedAt as proxy - ideally would track status change time)
            db
                .select({ count: count() })
                .from(challenges)
                .where(
                    and(
                        eq(challenges.status, "failed"),
                        gte(challenges.startedAt, today)
                    )
                )
                .catch(() => [{ count: 0 }]),

            // Active challenges
            db
                .select({ count: count() })
                .from(challenges)
                .where(eq(challenges.status, "active"))
                .catch(() => [{ count: 0 }]),

            // Signups in last 24h
            db
                .select({ count: count() })
                .from(users)
                .where(gte(users.createdAt, yesterday))
                .catch(() => [{ count: 0 }]),

            // Risk alerts - placeholder (unrealized PnL requires live price calculation)
            // For now, return 0 - live risk alerts would require Redis price lookups
            Promise.resolve([{ count: 0 }]),

            // My active challenge — single challenge per user, no cookie selection needed
            userId
                ? db
                    .select({
                        id: challenges.id,
                        balance: challenges.currentBalance,
                        status: challenges.status,
                    })
                    .from(challenges)
                    .where(
                        and(
                            eq(challenges.userId, userId),
                            inArray(challenges.status, ["active", "funded", "passed", "verification"])
                        )
                    )
                    .orderBy(sql`${challenges.startedAt} DESC`)
                    .limit(1)
                    .catch(() => [])
                : Promise.resolve([])
        ]);

        const pendingPayouts = pendingPayoutsResult[0]?.count || 0;
        const pendingPayoutAmount = Number(pendingPayoutsResult[0]?.total) || 0;
        const failedToday = failedTodayResult[0]?.count || 0;
        const activeChallenges = activeChallengesResult[0]?.count || 0;
        const signupsToday = signupsTodayResult[0]?.count || 0;
        const riskAlerts = riskAlertsResult[0]?.count || 0;

        let myActiveChallenge = null;
        if (myChallengeResult.length > 0) {
            myActiveChallenge = {
                id: myChallengeResult[0].id,
                balance: String(myChallengeResult[0].balance),
                status: myChallengeResult[0].status,
            };
        }

        return NextResponse.json({
            pendingPayouts,
            pendingPayoutAmount,
            failedToday,
            activeChallenges,
            signupsToday,
            riskAlerts,
            myActiveChallenge,
        });
    } catch (error) {
        logger.error("Quick stats error:", error);
        return NextResponse.json(
            { error: "Failed to fetch quick stats" },
            { status: 500 }
        );
    }
}
