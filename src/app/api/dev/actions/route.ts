import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Dev mode only" }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action;

    // TRUST THE CLIENT-PASSED ID IN DEV MODE (Fixes Auth Mismatches)
    const session = await auth();
    const userId = body.userId || session?.user?.id || "demo-user-1";

    console.log(`[DevTools API] Executing action '${action}' for User ID: ${userId}`);

    try {
        if (action === "seed_pending") {
            // Delete existing pending first to be clean
            await db.delete(challenges).where(and(eq(challenges.userId, userId), eq(challenges.status, "pending")));

            await db.insert(challenges).values({
                userId,
                phase: "challenge",
                status: "pending",
                startingBalance: "10000.00",
                currentBalance: "10000.00",
                rulesConfig: {
                    profitTarget: 500,
                    maxDrawdown: 1000,
                    durationDays: 30,
                }
            });
        }

        if (action === "reset") {
            // Delete EVERYTHING for this user
            await db.delete(challenges).where(eq(challenges.userId, userId));
            // Also technically should delete positions but cascade might not be set up, so manual delete:
            // Note: positions table requires challengeId, so simple delete checks might be complex without challenge ID.
            // For now, just wiping challenges usually "hides" the positions effectively in the UI.
        }

        if (action === "force_fail") {
            const active = await db.query.challenges.findFirst({
                where: and(eq(challenges.userId, userId), eq(challenges.status, "active"))
            });
            if (active) {
                await db.update(challenges).set({ status: 'failed', endsAt: new Date() }).where(eq(challenges.id, active.id));
            } else {
                // Convert pending or creates new failed one?
                // Let's just create a failed record to test modal
                await db.insert(challenges).values({
                    userId,
                    phase: "challenge",
                    status: "failed",
                    startingBalance: "10000.00",
                    currentBalance: "8000.00",
                    rulesConfig: {},
                    startedAt: new Date(),
                    endsAt: new Date(),
                });
            }
        }

        if (action === "force_pass") {
            const active = await db.query.challenges.findFirst({
                where: and(eq(challenges.userId, userId), eq(challenges.status, "active"))
            });
            if (active) {
                await db.update(challenges).set({ status: 'passed', endsAt: new Date() }).where(eq(challenges.id, active.id));
            } else {
                await db.insert(challenges).values({
                    userId,
                    phase: "challenge",
                    status: "passed",
                    startingBalance: "10000.00",
                    currentBalance: "11000.00",
                    rulesConfig: {},
                    startedAt: new Date(),
                    endsAt: new Date(),
                });
            }
        }

        if (action === "force_win") {
            const active = await db.query.challenges.findFirst({
                where: and(eq(challenges.userId, userId), eq(challenges.status, "active"))
            });
            if (active) {
                const newBalance = (parseFloat(active.currentBalance) + 200).toFixed(2);
                await db.update(challenges).set({ currentBalance: newBalance }).where(eq(challenges.id, active.id));
                // Optionally log a fake trade here if needed
            }
        }

        if (action === "force_loss") {
            const active = await db.query.challenges.findFirst({
                where: and(eq(challenges.userId, userId), eq(challenges.status, "active"))
            });
            if (active) {
                const newBalance = (parseFloat(active.currentBalance) - 200).toFixed(2);
                await db.update(challenges).set({ currentBalance: newBalance }).where(eq(challenges.id, active.id));
            }
        }

        if (action === "advance_day") {
            const active = await db.query.challenges.findFirst({
                where: and(eq(challenges.userId, userId), eq(challenges.status, "active"))
            });
            if (active) {
                // Reset Start of Day Balance to Current Balance (clears Daily Loss)
                await db.update(challenges)
                    .set({ startOfDayBalance: active.currentBalance })
                    .where(eq(challenges.id, active.id));
            }
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
