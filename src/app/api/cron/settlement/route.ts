import { NextRequest, NextResponse } from "next/server";
import { settleResolvedPositions } from "@/lib/settlement";

/**
 * Settlement Cron Endpoint
 * 
 * Scans all open positions, checks market resolution via Polymarket API,
 * and settles resolved positions by crediting proceeds to challenge balance.
 * 
 * Should run every 5-10 minutes via Vercel Cron or external scheduler.
 * 
 * Security: Protected by CRON_SECRET environment variable.
 */

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Settlement] Starting settlement scan...");

    try {
        const result = await settleResolvedPositions();

        console.log(`[Settlement] ✅ Complete: ${result.positionsSettled}/${result.positionsChecked} settled, PnL: $${result.totalPnLSettled.toFixed(2)}`);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...result,
        });
    } catch (error) {
        console.error("[Settlement] ❌ Error:", error);
        return NextResponse.json(
            { error: "Settlement failed", details: String(error) },
            { status: 500 }
        );
    }
}

// Also support POST for compatibility with some cron services
export async function POST(request: NextRequest) {
    return GET(request);
}
