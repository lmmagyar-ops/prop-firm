import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { affiliates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * PATCH /api/admin/affiliates/[id]/reject
 * Reject a Tier 2 affiliate application
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const { id } = await params;

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
                { error: "Only pending applications can be rejected" },
                { status: 400 }
            );
        }

        // Reject the application
        const updated = await db
            .update(affiliates)
            .set({
                status: "rejected",
                updatedAt: new Date()
            })
            .where(eq(affiliates.id, id))
            .returning();

        return NextResponse.json({
            success: true,
            affiliate: updated[0]
        });

    } catch (error: any) {
        console.error("[Admin Reject Affiliate Error]:", error);
        return NextResponse.json(
            { error: "Failed to reject affiliate" },
            { status: 500 }
        );
    }
}
