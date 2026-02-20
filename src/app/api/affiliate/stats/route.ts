import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { affiliates, affiliateReferrals } from "@/db/schema";
import { eq, and, sql, isNotNull } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const logger = createLogger("AffiliateStats");

/**
 * GET /api/affiliate/stats
 * Returns the authenticated user's affiliate stats (clicks, conversions, earnings).
 * Used by the /dashboard/affiliate page.
 */
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        // Find affiliate record for this user
        const affiliate = await db.query.affiliates.findFirst({
            where: eq(affiliates.userId, session.user.id),
        });

        if (!affiliate) {
            return NextResponse.json({ isAffiliate: false });
        }

        // Aggregate stats from referral records
        const [stats] = await db
            .select({
                totalClicks: sql<number>`COUNT(*)`,
                totalSignups: sql<number>`COUNT(CASE WHEN ${affiliateReferrals.signupTimestamp} IS NOT NULL THEN 1 END)`,
                totalPurchases: sql<number>`COUNT(CASE WHEN ${affiliateReferrals.purchaseTimestamp} IS NOT NULL THEN 1 END)`,
                totalCommission: sql<number>`COALESCE(SUM(${affiliateReferrals.commissionEarned}), 0)`,
                paidCommission: sql<number>`COALESCE(SUM(CASE WHEN ${affiliateReferrals.commissionPaid} = true THEN ${affiliateReferrals.commissionEarned} ELSE 0 END), 0)`,
            })
            .from(affiliateReferrals)
            .where(eq(affiliateReferrals.affiliateId, affiliate.id));

        // Current month earnings for cap tracking
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const [monthStats] = await db
            .select({
                currentMonthEarnings: sql<number>`COALESCE(SUM(${affiliateReferrals.commissionEarned}), 0)`,
            })
            .from(affiliateReferrals)
            .where(and(
                eq(affiliateReferrals.affiliateId, affiliate.id),
                isNotNull(affiliateReferrals.purchaseTimestamp),
                sql`${affiliateReferrals.purchaseTimestamp} >= ${monthStart}`
            ));

        // Recent referrals (last 10)
        const recentReferrals = await db
            .select({
                id: affiliateReferrals.id,
                clickTimestamp: affiliateReferrals.clickTimestamp,
                signupTimestamp: affiliateReferrals.signupTimestamp,
                purchaseTimestamp: affiliateReferrals.purchaseTimestamp,
                purchaseAmount: affiliateReferrals.purchaseAmount,
                commissionEarned: affiliateReferrals.commissionEarned,
                commissionPaid: affiliateReferrals.commissionPaid,
                source: affiliateReferrals.source,
            })
            .from(affiliateReferrals)
            .where(eq(affiliateReferrals.affiliateId, affiliate.id))
            .orderBy(sql`COALESCE(${affiliateReferrals.purchaseTimestamp}, ${affiliateReferrals.clickTimestamp}) DESC`)
            .limit(10);

        const totalClicks = Number(stats?.totalClicks || 0);
        const totalPurchases = Number(stats?.totalPurchases || 0);

        return NextResponse.json({
            isAffiliate: true,
            affiliate: {
                id: affiliate.id,
                tier: affiliate.tier,
                status: affiliate.status,
                commissionRate: parseFloat(affiliate.commissionRate),
                referralCode: affiliate.referralCode,
                referralLink: affiliate.referralLink,
                monthlyEarningCap: affiliate.monthlyEarningCap ? parseFloat(affiliate.monthlyEarningCap) : null,
            },
            stats: {
                totalClicks,
                totalSignups: Number(stats?.totalSignups || 0),
                totalPurchases,
                conversionRate: totalClicks > 0 ? ((totalPurchases / totalClicks) * 100).toFixed(1) : "0.0",
                totalCommission: Number(stats?.totalCommission || 0),
                pendingCommission: Number(stats?.totalCommission || 0) - Number(stats?.paidCommission || 0),
                paidCommission: Number(stats?.paidCommission || 0),
                currentMonthEarnings: Number(monthStats?.currentMonthEarnings || 0),
            },
            recentReferrals: recentReferrals.map(r => ({
                id: r.id,
                status: r.purchaseTimestamp ? "converted" : r.signupTimestamp ? "signed_up" : "clicked",
                clickedAt: r.clickTimestamp,
                purchasedAt: r.purchaseTimestamp,
                purchaseAmount: r.purchaseAmount ? parseFloat(r.purchaseAmount) : null,
                commissionEarned: r.commissionEarned ? parseFloat(r.commissionEarned) : null,
                paid: r.commissionPaid,
            })),
        });
    } catch (error: unknown) {
        logger.error("[Affiliate Stats Error]:", error);
        return NextResponse.json(
            { error: "Failed to fetch affiliate stats" },
            { status: 500 }
        );
    }
}
