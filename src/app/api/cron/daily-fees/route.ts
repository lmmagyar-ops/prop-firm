import { NextResponse } from "next/server";
import { runFeeSweep } from "@/workers/fees";
import { createLogger } from "@/lib/logger";
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
 * Security: Vercel automatically adds CRON_SECRET header for verification
 */
export async function GET(request: Request) {
    // Verify cron secret (Vercel adds this automatically)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the secret
    if (process.env.NODE_ENV === "production" && cronSecret) {
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

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
