/**
 * API endpoint to log page views
 * POST /api/events/page-view
 */

import { NextResponse } from "next/server";
import { logPageView } from "@/lib/event-logger";
import { createLogger } from "@/lib/logger";
const logger = createLogger("PageView");

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { page, userId } = body;

        if (!page) {
            return NextResponse.json({ error: "Missing page" }, { status: 400 });
        }

        // Log the page view (fire and forget style, but we await for consistency)
        await logPageView(userId || null, page);

        return NextResponse.json({ success: true });
    } catch (error) {
        // Don't fail loudly - analytics should be invisible
        logger.error("[PageView API Error]:", error);
        return NextResponse.json({ success: false }, { status: 200 });
    }
}
