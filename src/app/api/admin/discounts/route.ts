import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { discountCodes, discountRedemptions, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/discounts
 * List all discount codes with analytics
 */
export async function GET(req: NextRequest) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status"); // 'active', 'inactive', 'expired'

        // Build query
        let query = db.select().from(discountCodes);

        // Filter by status if provided
        if (status === "active") {
            query = query.where(eq(discountCodes.active, true)) as any;
        } else if (status === "inactive") {
            query = query.where(eq(discountCodes.active, false)) as any;
        }

        const codes = await query.orderBy(desc(discountCodes.createdAt));

        // Get redemption counts for each code
        const codesWithStats = await Promise.all(
            codes.map(async (code) => {
                const redemptions = await db
                    .select({
                        count: sql<number>`count(*)`,
                        totalRevenue: sql<number>`sum(${discountRedemptions.finalPrice})`,
                        totalSavings: sql<number>`sum(${discountRedemptions.discountAmount})`
                    })
                    .from(discountRedemptions)
                    .where(eq(discountRedemptions.discountCodeId, code.id));

                const stats = redemptions[0];

                return {
                    ...code,
                    redemptionCount: Number(stats?.count || 0),
                    totalRevenue: parseFloat(stats?.totalRevenue as any || "0"),
                    totalSavings: parseFloat(stats?.totalSavings as any || "0")
                };
            })
        );

        return NextResponse.json({ discounts: codesWithStats });

    } catch (error: any) {
        console.error("[Admin Discounts List Error]:", error);
        return NextResponse.json(
            { error: "Failed to fetch discount codes" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/discounts
 * Create a new discount code
 */
export async function POST(req: NextRequest) {
    const { isAuthorized, response, user } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        // Get user ID from email
        const dbUser = await db.query.users.findFirst({
            where: eq(users.email, user!.email!)
        });

        const body = await req.json();
        const {
            code,
            name,
            description,
            type,
            value,
            eligibleTiers,
            newCustomersOnly,
            minPurchaseAmount,
            validFrom,
            validUntil,
            maxTotalUses,
            maxUsesPerUser,
            stackable,
            campaignName,
            source
        } = body;

        // Validate required fields
        if (!code || !name || !type || !value || !validFrom) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Validate discount type and value
        if (!["percentage", "fixed_amount", "tiered"].includes(type)) {
            return NextResponse.json(
                { error: "Invalid discount type" },
                { status: 400 }
            );
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
            return NextResponse.json(
                { error: "Invalid discount value" },
                { status: 400 }
            );
        }

        if (type === "percentage" && numValue > 100) {
            return NextResponse.json(
                { error: "Percentage discount cannot exceed 100%" },
                { status: 400 }
            );
        }

        // Check if code already exists
        const existing = await db.query.discountCodes.findFirst({
            where: eq(discountCodes.code, code.toUpperCase())
        });

        if (existing) {
            return NextResponse.json(
                { error: "A discount code with this code already exists" },
                { status: 400 }
            );
        }

        // Create the discount code
        const newDiscount = await db.insert(discountCodes).values({
            code: code.toUpperCase(),
            name,
            description: description || null,
            type,
            value: numValue.toString(),
            eligibleTiers: eligibleTiers || null,
            newCustomersOnly: newCustomersOnly || false,
            minPurchaseAmount: minPurchaseAmount ? parseFloat(minPurchaseAmount).toString() : null,
            active: true,
            validFrom: new Date(validFrom),
            validUntil: validUntil ? new Date(validUntil) : null,
            maxTotalUses: maxTotalUses || null,
            maxUsesPerUser: maxUsesPerUser || 1,
            stackable: stackable || false,
            campaignName: campaignName || null,
            source: source || null,
            createdBy: dbUser?.id || null
        }).returning();

        return NextResponse.json({
            success: true,
            discount: newDiscount[0]
        });

    } catch (error: any) {
        console.error("[Admin Create Discount Error]:", error);
        return NextResponse.json(
            { error: "Failed to create discount code" },
            { status: 500 }
        );
    }
}
