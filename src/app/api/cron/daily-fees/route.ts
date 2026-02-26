import { NextResponse } from "next/server";
import { runFeeSweep } from "@/workers/fees";
import { createLogger } from "@/lib/logger";
import { verifyCronAuth } from "@/lib/cron-auth";
const logger = createLogger("DailyFees");

/**
 * Daily Fee Cron - Triggered at 00:00 UTC
 * 
 * Vercel Cron config in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-fees",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 * 
 * Security: Protected by CRON_SECRET via verifyCronAuth()
 */
export async function GET(request: Request) {
    const authError = verifyCronAuth(request);
    if (authError) return authError;

    try {
        logger.info("🕛 [Cron] Daily fee sweep triggered at", new Date().toISOString());

        await runFeeSweep();

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            message: "Fee sweep completed"
        });

    } catch (error) {
        logger.error("🕛 [Cron] Daily fee sweep failed:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
