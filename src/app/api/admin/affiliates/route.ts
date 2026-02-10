import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { affiliates, affiliateReferrals } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/affiliates
 * List all affiliates with their stats
 */
export async function GET(req: NextRequest) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status"); // 'pending', 'active', 'suspended'

        // Build base query
        let query = db.select().from(affiliates);

        if (status) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle query builder type narrowing
            query = query.where(eq(affiliates.status, status)) as any;
        }

        const allAffiliates = await query.orderBy(desc(affiliates.createdAt));

        // Get stats for each affiliate
        const affiliatesWithStats = await Promise.all(
            allAffiliates.map(async (affiliate) => {
                const stats = await db
                    .select({
                        totalReferrals: sql<number>`count(*)`,
                        conversions: sql<number>`count(CASE WHEN ${affiliateReferrals.purchaseTimestamp} IS NOT NULL THEN 1 END)`,
                        totalCommission: sql<number>`sum(${affiliateReferrals.commissionEarned})`,
                        paidCommission: sql<number>`sum(CASE WHEN ${affiliateReferrals.commissionPaid} = true THEN ${affiliateReferrals.commissionEarned} ELSE 0 END)`
                    })
                    .from(affiliateReferrals)
                    .where(eq(affiliateReferrals.affiliateId, affiliate.id));

                const stat = stats[0];

                return {
                    ...affiliate,
                    stats: {
                        totalReferrals: Number(stat?.totalReferrals || 0),
                        conversions: Number(stat?.conversions || 0),
                        totalCommission: parseFloat(String(stat?.totalCommission ?? 0)),
                        paidCommission: parseFloat(String(stat?.paidCommission ?? 0)),
                        pendingCommission: parseFloat(String(stat?.totalCommission ?? 0)) - parseFloat(String(stat?.paidCommission ?? 0))
                    }
                };
            })
        );

        return NextResponse.json({ affiliates: affiliatesWithStats });

    } catch (error: unknown) {
        console.error("[Admin Affiliates List Error]:", error);
        return NextResponse.json(
            { error: "Failed to fetch affiliates" },
            { status: 500 }
        );
    }
}
