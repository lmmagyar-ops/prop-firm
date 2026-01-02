import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Daily Reset Cron Endpoint
 * 
 * Runs at 00:00 UTC to snapshot each account's balance as their "start of day" balance.
 * This sets the baseline for the daily loss limit calculation.
 * 
 * Call this from:
 * - Vercel Cron: Add to vercel.json
 * - External cron service (Railway, Render, etc.)
 * - Manual trigger for testing
 * 
 * Security: Protected by CRON_SECRET environment variable
 */

export async function GET(request: NextRequest) {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.log("[DailyReset] ⚠️ Unauthorized cron attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[DailyReset] 🌅 Starting Daily Balance Snapshot...");

    const todayUTC = new Date().toISOString().split('T')[0];

    try {
        // Fetch all ACTIVE challenges (both challenge/verification and funded)
        const activeChallenges = await db.select()
            .from(challenges)
            .where(eq(challenges.status, "active"));

        console.log(`[DailyReset] Found ${activeChallenges.length} active accounts`);

        let resetCount = 0;
        let skippedCount = 0;

        for (const challenge of activeChallenges) {
            // Idempotency: Skip if already reset today
            const lastResetDate = challenge.lastDailyResetAt?.toISOString().split('T')[0];
            if (lastResetDate === todayUTC) {
                skippedCount++;
                continue;
            }

            // Snapshot current balance as start-of-day balance
            await db.update(challenges)
                .set({
                    startOfDayBalance: challenge.currentBalance,
                    lastDailyResetAt: new Date()
                })
                .where(eq(challenges.id, challenge.id));

            resetCount++;
        }

        const result = {
            success: true,
            timestamp: new Date().toISOString(),
            stats: {
                total: activeChallenges.length,
                reset: resetCount,
                skipped: skippedCount
            }
        };

        console.log(`[DailyReset] ✅ Complete: ${resetCount} reset, ${skippedCount} skipped`);

        return NextResponse.json(result);

    } catch (error) {
        console.error("[DailyReset] ❌ Error:", error);
        return NextResponse.json(
            { error: "Daily reset failed", details: String(error) },
            { status: 500 }
        );
    }
}

// Also support POST for compatibility with some cron services
export async function POST(request: NextRequest) {
    return GET(request);
}
