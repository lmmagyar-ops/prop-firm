import { NextResponse } from "next/server";
import { OutageManager } from "@/lib/outage-manager";
import { MarketCacheService } from "@/lib/market-cache-service";

/**
 * System Status API
 * 
 * Returns the current outage status and market data freshness.
 * Used by the OutageBanner component to show/hide alerts.
 * 
 * Public endpoint — no auth required (read-only, no sensitive data).
 */

export async function GET() {
    try {
        const [outageStatus, cacheAge] = await Promise.all([
            OutageManager.getOutageStatus(),
            MarketCacheService.getCacheAge(),
        ]);

        let status: "outage" | "grace_window" | "healthy";
        if (outageStatus.isOutage) {
            status = "outage";
        } else if (outageStatus.isGraceWindow) {
            status = "grace_window";
        } else {
            status = "healthy";
        }

        return NextResponse.json({
            status,
            marketDataAge: cacheAge,
            outageStartedAt: outageStatus.outageStartedAt?.toISOString() ?? null,
            graceWindowEndsAt: outageStatus.graceEndsAt?.toISOString() ?? null,
            message: outageStatus.message ?? null,
        });
    } catch (error) {
        console.error("[SystemStatus] Error:", error);
        return NextResponse.json({
            status: "healthy",
            marketDataAge: null,
            outageStartedAt: null,
            graceWindowEndsAt: null,
            message: null,
        });
    }
}
