import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getFilterReport } from "@/lib/worker-client";
import { MIN_MARKET_VOLUME } from "@/config/trading-constants";
import { createLogger } from "@/lib/logger";
const logger = createLogger("MarketHealth");

export async function GET() {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const report = await getFilterReport() as {
            featured: Record<string, unknown> | null;
            binary: Record<string, unknown> | null;
            timestamp: number;
        } | null;

        return NextResponse.json({
            featured: report?.featured ?? null,
            binary: report?.binary ?? null,
            threshold: MIN_MARKET_VOLUME,
            workerTimestamp: report?.timestamp ?? null,
        });
    } catch (error) {
        logger.error("Market health error:", error);
        return NextResponse.json(
            { error: "Failed to fetch market health" },
            { status: 500 }
        );
    }
}
