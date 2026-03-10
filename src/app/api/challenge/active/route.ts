import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/challenge/active
 *
 * Lightweight check: does the current user have an active challenge?
 * Used by the checkout page to gate purchases before showing the form.
 */
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ hasActive: false });
    }

    const active = await db.query.challenges.findFirst({
        where: and(
            eq(challenges.userId, session.user.id),
            eq(challenges.status, "active")
        ),
        columns: { id: true, phase: true },
    });

    return NextResponse.json({
        hasActive: !!active,
        phase: active?.phase || null,
    });
}
