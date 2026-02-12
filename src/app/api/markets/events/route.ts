import { NextResponse } from "next/server";
import { getActiveEvents } from "@/app/actions/market";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Events");

export const dynamic = "force-dynamic";
export const revalidate = 10; // Cache for 10 seconds

/**
 * GET /api/markets/events
 * 
 * Fetches active market events for client-side polling.
 * Query params:
 *   - platform: "polymarket" | "kalshi" (default: "polymarket")
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const platform = (searchParams.get("platform") || "polymarket") as "polymarket" | "kalshi";

        const events = await getActiveEvents(platform);

        return NextResponse.json(
            {
                events,
                timestamp: Date.now(),
                platform
            },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=10, stale-while-revalidate=5",
                },
            }
        );
    } catch (error) {
        logger.error("[API /markets/events] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch events", events: [] },
            { status: 500 }
        );
    }
}
