import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";

/**
 * Daily Reset Cron Endpoint
 * 
 * Runs at 00:00 UTC to:
 * 1. FINALIZE pending failures (users who hit daily loss and didn't recover)
 * 2. Snapshot each account's balance as their "start of day" balance
 * 3. Clear pendingFailureAt flags for survivors (new day = fresh start)
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

    console.log("[DailyReset] 🌅 Starting Daily Reset...");

    const todayUTC = new Date().toISOString().split('T')[0];

    try {
        // ============================================
        // STEP 1: Finalize Pending Failures
        // Users who hit daily loss limit and never recovered
        // ============================================
        const pendingChallenges = await db.select()
            .from(challenges)
            .where(and(
                eq(challenges.status, "active"),
                isNotNull(challenges.pendingFailureAt)
            ));

        let failedCount = 0;
        for (const challenge of pendingChallenges) {
            await db.update(challenges)
                .set({
                    status: 'failed',
                    endsAt: new Date()
                })
                .where(eq(challenges.id, challenge.id));

            console.log(`[DailyReset] 🔴 BREACH FINALIZED: Challenge ${challenge.id.slice(0, 8)} → FAILED (daily loss not recovered)`);
            failedCount++;
        }

        if (failedCount > 0) {
            console.log(`[DailyReset] ❌ ${failedCount} challenge(s) marked as FAILED`);
        }

        // ============================================
        // STEP 2: Snapshot Balance for Surviving Accounts
        // ============================================
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
            // Also clear pendingFailureAt for fresh start (shouldn't be any, but defensive)
            await db.update(challenges)
                .set({
                    startOfDayBalance: challenge.currentBalance,
                    lastDailyResetAt: new Date(),
                    pendingFailureAt: null  // New day = fresh start
                })
                .where(eq(challenges.id, challenge.id));

            resetCount++;
        }

        const result = {
            success: true,
            timestamp: new Date().toISOString(),
            stats: {
                failed: failedCount,
                total: activeChallenges.length,
                reset: resetCount,
                skipped: skippedCount
            }
        };

        console.log(`[DailyReset] ✅ Complete: ${failedCount} failed, ${resetCount} reset, ${skippedCount} skipped`);

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

