import { NextRequest, NextResponse } from "next/server";
import { ActivityTracker } from "@/lib/activity-tracker";
import { createLogger } from "@/lib/logger";
import { verifyCronAuth } from "@/lib/cron-auth";
const logger = createLogger("InactivityCheck");

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
 * Security: Protected by CRON_SECRET via verifyCronAuth()
 */

export async function GET(request: NextRequest) {
    const authError = verifyCronAuth(request);
    if (authError) return authError;

    logger.info("[InactivityCheck] 🔍 Checking for inactive funded accounts...");

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

        logger.info(`[InactivityCheck] ✅ Complete: ${result.terminated.length} terminated, ${result.flagged.length} flagged`);

        return NextResponse.json(response);

    } catch (error) {
        logger.error("[InactivityCheck] ❌ Error:", error);
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
