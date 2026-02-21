import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, challenges } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("AnalyticsCohorts");

/**
 * GET /api/admin/analytics/cohorts
 *
 * Returns monthly cohort retention data based on re-purchase behavior.
 * Definition of "retained at month N": user purchased another challenge
 * within that month of their initial signup month.
 *
 * Shape matches CohortRetention.tsx expectations:
 *   { cohorts: CohortData[], summary: { totalUsers, conversionRate } }
 */
export async function GET() {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const allUsers = await db.select({
            id: users.id,
            createdAt: users.createdAt,
        }).from(users);

        const allChallenges = await db.select({
            userId: challenges.userId,
            startedAt: challenges.startedAt,
        }).from(challenges);

        // Group challenges by userId for quick lookup
        const challengesByUser: Record<string, Date[]> = {};
        for (const c of allChallenges) {
            if (!c.userId || !c.startedAt) continue;
            if (!challengesByUser[c.userId]) challengesByUser[c.userId] = [];
            challengesByUser[c.userId]!.push(c.startedAt);
        }

        // Build cohort map: key = "YYYY-MM"
        const cohortMap: Record<string, {
            label: string;
            users: string[];
            purchasedByMonth: Record<number, number>; // month delta → count
        }> = {};

        for (const user of allUsers) {
            if (!user.createdAt) continue;
            const signupDate = new Date(user.createdAt);
            const cohortKey = `${signupDate.getFullYear()}-${String(signupDate.getMonth() + 1).padStart(2, '0')}`;
            const label = signupDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });

            if (!cohortMap[cohortKey]) {
                cohortMap[cohortKey] = { label, users: [], purchasedByMonth: {} };
            }
            cohortMap[cohortKey]!.users.push(user.id);

            // Check purchases for this user
            const purchases = challengesByUser[user.id] || [];
            for (const purchaseDate of purchases) {
                const monthDelta =
                    (purchaseDate.getFullYear() - signupDate.getFullYear()) * 12 +
                    (purchaseDate.getMonth() - signupDate.getMonth());

                if (monthDelta >= 0 && monthDelta <= 4) {
                    cohortMap[cohortKey]!.purchasedByMonth[monthDelta] =
                        (cohortMap[cohortKey]!.purchasedByMonth[monthDelta] || 0) + 1;
                }
            }
        }

        // Sort cohorts by date (most recent last to get correct table order)
        const sortedKeys = Object.keys(cohortMap).sort();

        // Only show last 6 months to keep the table readable
        const recentKeys = sortedKeys.slice(-6);
        const now = new Date();
        const currentCohortKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const cohorts = recentKeys.map(key => {
            const cohort = cohortMap[key]!;
            const cohortSize = cohort.users.length;
            if (cohortSize === 0) return null;

            // Month 0 = % of users who bought at all during signup month
            const w0 = cohort.purchasedByMonth[0]
                ? Math.round((cohort.purchasedByMonth[0] / cohortSize) * 100)
                : 0;

            // Calculate which months have had time to elapse since this cohort's first month
            const [y, m] = key.split('-').map(Number);
            const cohortDate = new Date(y!, m! - 1, 1);
            const monthsElapsed = Math.floor(
                (now.getTime() - cohortDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
            );

            const getMonthRetention = (delta: number): number | null => {
                if (delta > monthsElapsed) return null; // Future — not yet elapsed
                const count = cohort.purchasedByMonth[delta] || 0;
                return Math.round((count / cohortSize) * 100);
            };

            return {
                month: key,
                label: cohort.label,
                w0,
                w1: getMonthRetention(1),
                w2: getMonthRetention(2),
                w3: getMonthRetention(3),
                w4: getMonthRetention(4),
            };
        }).filter(Boolean);

        const totalUsers = allUsers.length;
        const usersWithPurchases = Object.keys(challengesByUser).length;
        const conversionRate = totalUsers > 0
            ? Math.round((usersWithPurchases / totalUsers) * 100)
            : 0;

        return NextResponse.json({
            cohorts,
            summary: { totalUsers, conversionRate },
        });

    } catch (error) {
        logger.error("Cohort analytics error:", error);
        return NextResponse.json({ error: "Failed to fetch cohort data" }, { status: 500 });
    }
}
