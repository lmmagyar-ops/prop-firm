/**
 * Ingestion Health API
 *
 * Returns status of market data ingestion via the worker's HTTP API.
 * No longer connects to Redis directly — eliminates egress charges.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getIngestionHealth } from "@/lib/worker-client";

interface IngestionHealth {
    status: "healthy" | "degraded" | "down";
    lastPolymarketUpdate: string | null;
    lastKalshiUpdate: string | null;
    polymarketCount: number;
    kalshiCount: number;
    staleMarkets: number;
    workerStatus: "active" | "standby" | "unknown";
    updatedAt: string;
}

export async function GET(): Promise<NextResponse> {
    const authResult = await requireAdmin();
    if (!authResult.isAuthorized) {
        return authResult.response!;
    }

    try {
        const healthData = await getIngestionHealth() as IngestionHealth | null;

        if (!healthData) {
            // Worker unreachable
            const health: IngestionHealth = {
                status: "down",
                lastPolymarketUpdate: null,
                lastKalshiUpdate: null,
                polymarketCount: 0,
                kalshiCount: 0,
                staleMarkets: 0,
                workerStatus: "unknown",
                updatedAt: new Date().toISOString(),
            };
            return NextResponse.json(health, { status: 503 });
        }

        return NextResponse.json(healthData);

    } catch (error) {
        console.error("[IngestionHealth] Error:", error);

        const health: IngestionHealth = {
            status: "down",
            lastPolymarketUpdate: null,
            lastKalshiUpdate: null,
            polymarketCount: 0,
            kalshiCount: 0,
            staleMarkets: 0,
            workerStatus: "unknown",
            updatedAt: new Date().toISOString(),
        };

        return NextResponse.json(health, { status: 503 });
    }
}
