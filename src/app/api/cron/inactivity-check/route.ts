import { NextRequest, NextResponse } from "next/server";
import { ActivityTracker } from "@/lib/activity-tracker";

/**
 * Inactivity Check Cron Endpoint
 * 
 * Runs daily to check for funded accounts that have been inactive for 30+ days.
 * Inactive accounts are terminated (status set to 'failed').
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
        console.log("[InactivityCheck] ⚠️ Unauthorized cron attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[InactivityCheck] 🔍 Checking for inactive funded accounts...");

    try {
        const result = await ActivityTracker.checkInactivity();

        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            stats: {
                terminated: result.terminated.length,
                flagged: result.flagged.length
            },
            terminatedAccountIds: result.terminated,
            flaggedAccountIds: result.flagged
        };

        console.log(`[InactivityCheck] ✅ Complete: ${result.terminated.length} terminated, ${result.flagged.length} flagged`);

        return NextResponse.json(response);

    } catch (error) {
        console.error("[InactivityCheck] ❌ Error:", error);
        return NextResponse.json(
            { error: "Inactivity check failed", details: String(error) },
            { status: 500 }
        );
    }
}

// Also support POST for compatibility with some cron services
export async function POST(request: NextRequest) {
    return GET(request);
}
