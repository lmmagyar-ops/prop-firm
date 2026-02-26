import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("CronAuth");

/**
 * Verify cron endpoint authorization.
 *
 * - If CRON_SECRET is set → require matching Bearer token (401 on mismatch).
 * - If CRON_SECRET is NOT set:
 *     - production → hard-block with 500 (misconfiguration).
 *     - dev        → allow (expected — secret not set locally).
 *
 * Returns null when authorized, or a NextResponse to return immediately.
 */
export function verifyCronAuth(request: Request): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (!cronSecret) {
        if (process.env.NODE_ENV === "production") {
            logger.error("[CronAuth] CRON_SECRET is not set in production — this is a misconfiguration.");
            return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
        }
        // Local dev: allow without auth
        return null;
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return null; // authorized
}
