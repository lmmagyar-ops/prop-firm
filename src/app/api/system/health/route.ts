import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getClient } from "@sentry/nextjs";
import { getHeartbeat } from "@/lib/worker-client";
import { createLogger } from "@/lib/logger";

const logger = createLogger("SystemHealth");

/**
 * Deep Health Check Endpoint
 * 
 * Returns infrastructure health for post-deploy verification.
 * Each check runs independently — one failure doesn't cascade.
 * 
 * Auth: CRON_SECRET (same pattern as cron endpoints).
 * Fails open when CRON_SECRET is not set (local dev).
 * 
 * Usage: GET /api/system/health -H "Authorization: Bearer <CRON_SECRET>"
 */

interface HealthResponse {
    version: string | null;
    timestamp: string;
    checks: {
        database: boolean;
        sentry: boolean;
        workerHeartbeat: {
            alive: boolean;
            ageSeconds: number | null;
        };
        dailyReset: {
            allEquityPopulated: boolean;
            nullCount: number;
            activeAccounts: number;
        };
    };
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response: HealthResponse = {
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        timestamp: new Date().toISOString(),
        checks: {
            database: false,
            sentry: false,
            workerHeartbeat: { alive: false, ageSeconds: null },
            dailyReset: { allEquityPopulated: false, nullCount: -1, activeAccounts: 0 },
        },
    };

    // CHECK 1: Database connectivity
    try {
        const result = await db.select({ id: challenges.id })
            .from(challenges)
            .limit(1);
        response.checks.database = Array.isArray(result);
    } catch (err) {
        logger.error("[Health] DB check failed:", err);
    }

    // CHECK 2: Sentry SDK initialized
    try {
        const client = getClient();
        response.checks.sentry = client !== undefined;
    } catch {
        // getClient() shouldn't throw, but contain it
    }

    // CHECK 3: Worker heartbeat (via Railway HTTP API)
    try {
        const heartbeat = await getHeartbeat() as { timestamp: number } | null;
        if (heartbeat?.timestamp) {
            const ageSeconds = Math.round((Date.now() - heartbeat.timestamp) / 1000);
            response.checks.workerHeartbeat = {
                alive: ageSeconds < 120,
                ageSeconds,
            };
        }
    } catch (err) {
        logger.error("[Health] Heartbeat check failed:", err);
    }

    // CHECK 4: Daily reset data integrity (startOfDayEquity populated)
    try {
        const activeChallenges = await db.select({
            id: challenges.id,
            startOfDayEquity: challenges.startOfDayEquity,
        })
            .from(challenges)
            .where(eq(challenges.status, "active"));

        const nullCount = activeChallenges.filter(c => c.startOfDayEquity === null).length;

        response.checks.dailyReset = {
            allEquityPopulated: nullCount === 0,
            nullCount,
            activeAccounts: activeChallenges.length,
        };
    } catch (err) {
        logger.error("[Health] Daily reset check failed:", err);
    }

    return NextResponse.json(response);
}
