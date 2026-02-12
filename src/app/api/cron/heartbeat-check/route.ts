import { NextRequest, NextResponse } from "next/server";
import { getHeartbeat } from "@/lib/worker-client";
import { alerts } from "@/lib/alerts";
import { OutageManager } from "@/lib/outage-manager";
import { createLogger } from "@/lib/logger";
const logger = createLogger("HeartbeatCheck");

/**
 * Heartbeat Check Cron
 * 
 * Runs every 5 minutes. Reads the heartbeat data from the ingestion
 * worker's HTTP API (which reads Redis via private networking).
 * If the heartbeat is older than 3 minutes, fires a critical Slack alert
 * and records an outage event for Exchange Halt protection.
 * 
 * Schedule: every 5 minutes (vercel.json)
 */

const STALE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

export async function GET(request: NextRequest) {
    // Verify cron secret (Vercel sends this header for cron jobs)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const heartbeat = await getHeartbeat() as { timestamp: number; workerId?: string; isLeader?: boolean; activeTokens?: number; priceBufferSize?: number } | null;

        if (!heartbeat) {
            // No heartbeat ever written — worker has never started
            await alerts.ingestionStale(new Date(0));
            await OutageManager.recordOutageStart("No heartbeat found — worker may have never started");
            return NextResponse.json({
                status: "stale",
                reason: "No heartbeat found — worker may have never started",
                timestamp: new Date().toISOString(),
            });
        }

        const age = Date.now() - heartbeat.timestamp;
        const ageSeconds = Math.round(age / 1000);
        const isStale = age > STALE_THRESHOLD_MS;

        if (isStale) {
            await alerts.ingestionStale(new Date(heartbeat.timestamp));
            await OutageManager.recordOutageStart(`Heartbeat stale: ${ageSeconds}s old`);
            return NextResponse.json({
                status: "stale",
                reason: `Heartbeat is ${ageSeconds}s old (threshold: ${STALE_THRESHOLD_MS / 1000}s)`,
                lastHeartbeat: new Date(heartbeat.timestamp).toISOString(),
                workerId: heartbeat.workerId,
                timestamp: new Date().toISOString(),
            });
        }

        // Worker is healthy — end any active outage
        await OutageManager.recordOutageEnd();

        return NextResponse.json({
            status: "healthy",
            ageSeconds,
            lastHeartbeat: new Date(heartbeat.timestamp).toISOString(),
            workerId: heartbeat.workerId,
            isLeader: heartbeat.isLeader,
            activeTokens: heartbeat.activeTokens,
            priceBufferSize: heartbeat.priceBufferSize,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        logger.error("[HeartbeatCheck] ❌ Error:", error);
        return NextResponse.json(
            { status: "error", error: String(error) },
            { status: 500 }
        );
    }
}

