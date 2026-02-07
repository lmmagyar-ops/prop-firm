import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: Request) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const { challengeId, action } = await req.json();

        if (!["FAIL", "PASS"].includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const status = action === "PASS" ? "passed" : "failed";
        const endTime = new Date();

        const updated = await db
            .update(challenges)
            .set({
                status: status,
                endsAt: endTime
            })
            .where(eq(challenges.id, challengeId))
            .returning();

        return NextResponse.json({ success: true, challenge: updated[0] });
    } catch (error) {
        console.error("Admin Action Error:", error);
        return NextResponse.json({ error: "Action failed" }, { status: 500 });
    }
}
