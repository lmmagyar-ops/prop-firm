import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { discountCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * PATCH /api/admin/discounts/[id]/deactivate
 * Deactivate a discount code
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const { id } = await params;

        // Update the discount code
        const updated = await db
            .update(discountCodes)
            .set({
                active: false,
                updatedAt: new Date()
            })
            .where(eq(discountCodes.id, id))
            .returning();

        if (!updated || updated.length === 0) {
            return NextResponse.json(
                { error: "Discount code not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            discount: updated[0]
        });

    } catch (error: unknown) {
        console.error("[Admin Deactivate Discount Error]:", error);
        return NextResponse.json(
            { error: "Failed to deactivate discount code" },
            { status: 500 }
        );
    }
}
