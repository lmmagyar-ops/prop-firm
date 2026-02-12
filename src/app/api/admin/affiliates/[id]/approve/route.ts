import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { affiliates, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Approve");

/**
 * PATCH /api/admin/affiliates/[id]/approve
 * Approve a Tier 2 affiliate application
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAuthorized, response, user } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        // Get user ID from email
        const dbUser = await db.query.users.findFirst({
            where: eq(users.email, user!.email!)
        });

        const { id } = await params;
        const { commissionRate } = await req.json();

        // Validate commission rate
        const rate = commissionRate ? parseFloat(commissionRate) : 15;
        if (rate < 0 || rate > 100) {
            return NextResponse.json(
                { error: "Invalid commission rate" },
                { status: 400 }
            );
        }

        // Get the affiliate
        const affiliate = await db.query.affiliates.findFirst({
            where: eq(affiliates.id, id)
        });

        if (!affiliate) {
            return NextResponse.json(
                { error: "Affiliate not found" },
                { status: 404 }
            );
        }

        if (affiliate.status !== "pending") {
            return NextResponse.json(
                { error: "Only pending applications can be approved" },
                { status: 400 }
            );
        }

        // Approve the affiliate
        const updated = await db
            .update(affiliates)
            .set({
                status: "active",
                commissionRate: rate.toFixed(2),
                approvedBy: dbUser?.id || null,
                approvedAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(affiliates.id, id))
            .returning();

        return NextResponse.json({
            success: true,
            affiliate: updated[0]
        });

    } catch (error: unknown) {
        logger.error("[Admin Approve Affiliate Error]:", error);
        return NextResponse.json(
            { error: "Failed to approve affiliate" },
            { status: 500 }
        );
    }
}
