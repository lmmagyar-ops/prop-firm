import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { discountCodes, discountRedemptions } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/discounts/[id]/analytics
 * Get detailed analytics for a specific discount code
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const { id } = await params;

        // Get the discount code
        const discount = await db.query.discountCodes.findFirst({
            where: eq(discountCodes.id, id)
        });

        if (!discount) {
            return NextResponse.json(
                { error: "Discount code not found" },
                { status: 404 }
            );
        }

        // Get redemption statistics
        const redemptionStats = await db
            .select({
                totalRedemptions: sql<number>`count(*)`,
                totalRevenue: sql<number>`sum(${discountRedemptions.finalPrice})`,
                totalSavings: sql<number>`sum(${discountRedemptions.discountAmount})`,
                avgDiscountAmount: sql<number>`avg(${discountRedemptions.discountAmount})`,
                uniqueUsers: sql<number>`count(distinct ${discountRedemptions.userId})`
            })
            .from(discountRedemptions)
            .where(eq(discountRedemptions.discountCodeId, id));

        const stats = redemptionStats[0];

        // Get recent redemptions
        const recentRedemptions = await db
            .select()
            .from(discountRedemptions)
            .where(eq(discountRedemptions.discountCodeId, id))
            .orderBy(desc(discountRedemptions.redeemedAt))
            .limit(10);

        // Calculate conversion metrics
        const totalRedemptions = Number(stats?.totalRedemptions || 0);
        const maxUses = discount.maxTotalUses || Infinity;
        const utilizationRate = maxUses !== Infinity ? (totalRedemptions / maxUses) * 100 : 0;

        return NextResponse.json({
            discount,
            analytics: {
                totalRedemptions,
                revenue: parseFloat(stats?.totalRevenue as any || "0"),
                totalSavings: parseFloat(stats?.totalSavings as any || "0"),
                avgDiscountAmount: parseFloat(stats?.avgDiscountAmount as any || "0"),
                uniqueUsers: Number(stats?.uniqueUsers || 0),
                utilizationRate: Math.round(utilizationRate * 100) / 100,
                recentRedemptions: recentRedemptions.map(r => ({
                    id: r.id,
                    userId: r.userId,
                    amount: parseFloat(r.discountAmount),
                    finalPrice: parseFloat(r.finalPrice),
                    redeemedAt: r.redeemedAt,
                    ipAddress: r.ipAddress
                }))
            }
        });

    } catch (error: unknown) {
        console.error("[Admin Discount Analytics Error]:", error);
        return NextResponse.json(
            { error: "Failed to fetch discount analytics" },
            { status: 500 }
        );
    }
}
