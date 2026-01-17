import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, users } from "@/db/schema";
import { eq, sql, gte, lt, and, count } from "drizzle-orm";

/**
 * GET /api/admin/analytics/metrics
 * Returns cohort retention data and LTV/CAC metrics
 * 
 * Cohort = Users who signed up in the same month
 * Retention = % of cohort that made additional purchases
 * LTV = Average revenue per customer
 * CAC = Marketing spend / new customers (estimated)
 */
export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { role: true }
    });

    if (user?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        // Tier price mapping
        const tierPrices: Record<string, number> = {
            "5000": 79, "5000.00": 79,
            "10000": 149, "10000.00": 149,
            "25000": 299, "25000.00": 299,
        };

        // Get all users with their challenges
        const allUsers = await db.select({
            id: users.id,
            createdAt: users.createdAt,
        }).from(users);

        const allChallenges = await db.select({
            userId: challenges.userId,
            startingBalance: challenges.startingBalance,
            startedAt: challenges.startedAt,
        }).from(challenges);

        // Build user purchase map
        const userPurchases: Map<string, { signupMonth: string; purchaseMonths: Set<string>; totalSpent: number }> = new Map();

        for (const user of allUsers) {
            if (!user.createdAt) continue;
            const signupMonth = `${user.createdAt.getFullYear()}-${String(user.createdAt.getMonth() + 1).padStart(2, '0')}`;
            userPurchases.set(user.id, { signupMonth, purchaseMonths: new Set(), totalSpent: 0 });
        }

        for (const challenge of allChallenges) {
            if (!challenge.userId || !challenge.startedAt) continue;
            const userData = userPurchases.get(challenge.userId);
            if (!userData) continue;

            const purchaseMonth = `${challenge.startedAt.getFullYear()}-${String(challenge.startedAt.getMonth() + 1).padStart(2, '0')}`;
            userData.purchaseMonths.add(purchaseMonth);
            userData.totalSpent += tierPrices[challenge.startingBalance] || 0;
        }

        // Generate cohort data for last 5 months
        const now = new Date();
        const cohorts: Array<{ month: string; label: string; w0: number; w1: number | null; w2: number | null; w3: number | null; w4: number | null }> = [];

        for (let i = 4; i >= 0; i--) {
            const cohortDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const cohortMonth = `${cohortDate.getFullYear()}-${String(cohortDate.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = cohortDate.toLocaleString('default', { month: 'short' });

            // Count users in this cohort
            const cohortUsers = Array.from(userPurchases.values()).filter(u => u.signupMonth === cohortMonth);
            const cohortSize = cohortUsers.length;

            if (cohortSize === 0) {
                cohorts.push({ month: cohortMonth, label: monthLabel, w0: 100, w1: null, w2: null, w3: null, w4: null });
                continue;
            }

            // Calculate retention for each subsequent month
            const retentionData: (number | null)[] = [100]; // w0 is always 100%

            for (let week = 1; week <= 4; week++) {
                const targetDate = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + week, 1);
                const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

                // If target month is in the future, skip
                if (targetDate > now) {
                    retentionData.push(null);
                    continue;
                }

                // Count how many users from cohort made a purchase in that month
                const retained = cohortUsers.filter(u => u.purchaseMonths.has(targetMonth)).length;
                const retentionRate = Math.round((retained / cohortSize) * 100);
                retentionData.push(retentionRate);
            }

            cohorts.push({
                month: cohortMonth,
                label: monthLabel,
                w0: retentionData[0] as number,
                w1: retentionData[1],
                w2: retentionData[2],
                w3: retentionData[3],
                w4: retentionData[4],
            });
        }

        // Calculate LTV and CAC for last 6 months
        const ltvCacData: Array<{ month: string; ltv: number; cac: number }> = [];

        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = monthDate.toLocaleString('default', { month: 'short' });

            // Get users who signed up on or before this month
            const eligibleUsers = Array.from(userPurchases.entries()).filter(([, data]) => data.signupMonth <= monthKey);

            // Calculate total revenue from eligible users up to this month
            let totalRevenue = 0;
            for (const [, data] of eligibleUsers) {
                totalRevenue += data.totalSpent;
            }

            const ltv = eligibleUsers.length > 0 ? Math.round(totalRevenue / eligibleUsers.length) : 0;

            // Estimated CAC (marketing spend / new users)
            // Using a baseline estimate - in production this would come from marketing data
            const newUsersThisMonth = Array.from(userPurchases.values()).filter(u => u.signupMonth === monthKey).length;
            const estimatedMarketingSpend = 500 + (newUsersThisMonth * 50); // Base + per-user spend
            const cac = newUsersThisMonth > 0 ? Math.round(estimatedMarketingSpend / newUsersThisMonth) : 100;

            ltvCacData.push({ month: monthLabel, ltv, cac });
        }

        // Summary metrics
        const totalUsers = allUsers.length;
        const totalRevenue = Array.from(userPurchases.values()).reduce((sum, u) => sum + u.totalSpent, 0);
        const averageLTV = totalUsers > 0 ? Math.round(totalRevenue / totalUsers) : 0;
        const customersWithPurchases = Array.from(userPurchases.values()).filter(u => u.totalSpent > 0).length;
        const conversionRate = totalUsers > 0 ? Math.round((customersWithPurchases / totalUsers) * 100) : 0;

        return NextResponse.json({
            cohorts,
            ltvCac: ltvCacData,
            summary: {
                totalUsers,
                totalRevenue,
                averageLTV,
                customersWithPurchases,
                conversionRate,
            }
        });
    } catch (error) {
        console.error("[Analytics Metrics API Error]:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics metrics" },
            { status: 500 }
        );
    }
}
