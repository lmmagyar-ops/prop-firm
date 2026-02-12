import { db } from "@/db";
import { challenges, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { auth } from "@/auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Actions");

export async function POST(req: Request) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const session = await auth();
        const adminId = session?.user?.email || "admin-user";
        const { challengeId, action } = await req.json();

        if (!["FAIL", "PASS"].includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        // Fetch current state for audit trail
        const current = await db.query.challenges.findFirst({
            where: eq(challenges.id, challengeId)
        });

        if (!current) {
            return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
        }

        const status = action === "PASS" ? "passed" : "failed";
        const endTime = new Date();

        // Transaction: Update challenge + insert audit log
        const updated = await db.transaction(async (tx) => {
            const result = await tx
                .update(challenges)
                .set({
                    status: status,
                    endsAt: endTime
                })
                .where(eq(challenges.id, challengeId))
                .returning();

            // Immutable audit trail — every admin action that affects account status
            await tx.insert(auditLogs).values({
                adminId,
                action: `ADMIN_${action}_CHALLENGE`,
                targetId: challengeId,
                details: {
                    previousStatus: current.status,
                    newStatus: status,
                    challengeUserId: current.userId,
                }
            });

            return result;
        });

        logger.info(`[Admin] ${adminId} ${action} challenge ${challengeId} (was: ${current.status})`);
        return NextResponse.json({ success: true, challenge: updated[0] });
    } catch (error) {
        logger.error("Admin Action Error:", error);
        return NextResponse.json({ error: "Action failed" }, { status: 500 });
    }
}
