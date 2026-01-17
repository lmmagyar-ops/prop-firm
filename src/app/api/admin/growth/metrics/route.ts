import { NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, users, affiliates, affiliateReferrals, discountRedemptions, discountCodes } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { getTierPrice } from "@/lib/admin-utils";

/**
 * GET /api/admin/growth/metrics
 * Returns growth-related KPIs and discount performance data
 */
export async function GET() {
    // SECURITY: Verify admin access
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        // Get all users and challenges
        const allUsers = await db.select().from(users);
        const allChallenges = await db.select().from(challenges);

        // Calculate total revenue and customer count
        let totalRevenue = 0;
        const customersWithPurchases = new Set<string>();

        for (const challenge of allChallenges) {
            if (challenge.userId) {
                customersWithPurchases.add(challenge.userId);
                totalRevenue += getTierPrice(challenge.startingBalance);
            }
        }

        // LTV = Total Revenue / Total Customers
        const ltv = customersWithPurchases.size > 0
            ? Math.round(totalRevenue / customersWithPurchases.size)
            : 0;

        // CAC estimate (baseline + per-user marketing spend)
        const cac = customersWithPurchases.size > 0 ? 100 : 0; // Simplified estimate

        // LTV/CAC Ratio
        const ltvCacRatio = cac > 0 ? (ltv / cac).toFixed(1) : "0.0";

        // "Whales" = Users with 2+ challenges
        const userChallengeCounts = new Map<string, number>();
        for (const challenge of allChallenges) {
            if (challenge.userId) {
                userChallengeCounts.set(challenge.userId, (userChallengeCounts.get(challenge.userId) || 0) + 1);
            }
        }
        const whales = Array.from(userChallengeCounts.values()).filter(count => count >= 2).length;

        // Get affiliate referral count for K-Factor
        const affiliateData = await db.select().from(affiliates);
        const referralData = await db.select().from(affiliateReferrals);

        // K-Factor = referrals per user (simplified)
        const totalReferrals = referralData.length;
        const kFactor = allUsers.length > 0 ? (totalReferrals / allUsers.length).toFixed(1) : "0.0";

        // Get discount performance data
        const discounts = await db.select().from(discountCodes);
        const redemptions = await db.select().from(discountRedemptions);

        // Build daily discount performance data (last 14 days)
        const now = new Date();
        const discountPerformance: Array<{ date: string; revenue: number; discountRate: number; redemptions: number }> = [];

        for (let i = 13; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const dateKey = date.toISOString().split('T')[0];

            // Get redemptions for this day
            const dayRedemptions = redemptions.filter(r => {
                if (!r.redeemedAt) return false;
                return r.redeemedAt.toISOString().split('T')[0] === dateKey;
            });

            // Get challenges (revenue) for this day
            const dayChallenges = allChallenges.filter(c => {
                if (!c.startedAt) return false;
                return c.startedAt.toISOString().split('T')[0] === dateKey;
            });

            let dayRevenue = 0;
            for (const c of dayChallenges) {
                dayRevenue += getTierPrice(c.startingBalance);
            }

            // Calculate average discount rate for the day
            let totalDiscountAmount = 0;
            let totalOriginalPrice = 0;
            for (const r of dayRedemptions) {
                totalDiscountAmount += parseFloat(r.discountAmount);
                totalOriginalPrice += parseFloat(r.originalPrice);
            }
            const discountRate = totalOriginalPrice > 0
                ? Math.round((totalDiscountAmount / totalOriginalPrice) * 100)
                : 0;

            discountPerformance.push({
                date: dateStr,
                revenue: dayRevenue,
                discountRate,
                redemptions: dayRedemptions.length,
            });
        }

        // Discount code leaderboard
        const discountLeaderboard = discounts.map(d => {
            const codeRedemptions = redemptions.filter(r => r.discountCodeId === d.id);
            const codeRevenue = codeRedemptions.reduce((sum, r) => sum + parseFloat(r.finalPrice), 0);
            const codeSavings = codeRedemptions.reduce((sum, r) => sum + parseFloat(r.discountAmount), 0);

            return {
                code: d.code,
                name: d.name,
                type: d.type,
                value: parseFloat(d.value),
                redemptions: codeRedemptions.length,
                revenue: Math.round(codeRevenue),
                savings: Math.round(codeSavings),
                active: d.active,
            };
        }).sort((a, b) => b.redemptions - a.redemptions);

        return NextResponse.json({
            kpis: {
                ltvCacRatio,
                ltv,
                cac,
                whales,
                kFactor,
                totalUsers: allUsers.length,
                totalCustomers: customersWithPurchases.size,
                totalRevenue,
            },
            discountPerformance,
            discountLeaderboard,
        });
    } catch (error) {
        console.error("[Growth Metrics API Error]:", error);
        return NextResponse.json(
            { error: "Failed to fetch growth metrics" },
            { status: 500 }
        );
    }
}
