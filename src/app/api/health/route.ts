/**
 * Health Check Endpoint
 * 
 * Lightweight liveness + invariant probe.
 * Returns 200 if everything is healthy, 503 if any critical check fails.
 * 
 * Checks:
 * 1. Database connection is alive
 * 2. No active challenges with NaN/null balances
 * 3. No open positions with negative or NaN shares
 * 4. No open positions using demo fallback price (stale price canary)
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { alerts } from "@/lib/alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface HealthIssue {
    check: string;
    detail: string;
}

export async function GET() {
    const issues: HealthIssue[] = [];

    // 1. Database connectivity
    try {
        await db.execute(sql`SELECT 1`);
    } catch {
        issues.push({ check: "database", detail: "Cannot reach database" });
    }

    // 2. No NaN/null balances on active challenges
    try {
        const badBalances = await db
            .select({ id: challenges.id, balance: challenges.currentBalance })
            .from(challenges)
            .where(
                and(
                    eq(challenges.status, "active"),
                    isNull(challenges.currentBalance)
                )
            )
            .limit(5);

        if (badBalances.length > 0) {
            const detail = `${badBalances.length} active challenge(s) with null balance`;
            issues.push({ check: "balance_integrity", detail });
            await alerts.anomaly("null_balance", { challengeIds: badBalances.map(b => b.id) });
        }
    } catch {
        issues.push({ check: "balance_integrity", detail: "Query failed" });
    }

    // 3. No open positions with invalid shares
    try {
        const badPositions = await db
            .select({ id: positions.id, shares: positions.shares })
            .from(positions)
            .where(
                and(
                    eq(positions.status, "OPEN"),
                    sql`CAST(${positions.shares} AS DECIMAL) < 0`
                )
            )
            .limit(5);

        if (badPositions.length > 0) {
            const detail = `${badPositions.length} open position(s) with negative shares`;
            issues.push({ check: "position_integrity", detail });
            await alerts.anomaly("negative_shares", { positionIds: badPositions.map(p => p.id) });
        }
    } catch {
        issues.push({ check: "position_integrity", detail: "Query failed" });
    }

    // 4. No open positions relying on demo fallback price (stale price detection)
    try {
        const openPositions = await db
            .select({ id: positions.id, marketId: positions.marketId })
            .from(positions)
            .where(eq(positions.status, "OPEN"))
            .limit(50);

        if (openPositions.length > 0) {
            const { MarketService } = await import("@/lib/market");
            const marketIds = [...new Set(openPositions.map(p => p.marketId))];
            const prices = await MarketService.getBatchOrderBookPrices(marketIds);

            const demoPricedMarkets: string[] = [];
            for (const [marketId, priceData] of prices) {
                if (priceData.source === 'demo') {
                    demoPricedMarkets.push(marketId.slice(0, 12) + '...');
                }
            }

            if (demoPricedMarkets.length > 0) {
                const detail = `${demoPricedMarkets.length} open position market(s) using demo fallback price: ${demoPricedMarkets.join(', ')}`;
                issues.push({ check: "stale_price", detail });
                await alerts.anomaly("demo_price_fallback", { markets: demoPricedMarkets, count: demoPricedMarkets.length });
            }
        }
    } catch {
        issues.push({ check: "stale_price", detail: "Query failed" });
    }

    if (issues.length > 0) {
        return NextResponse.json(
            { status: "degraded", issues, timestamp: new Date().toISOString() },
            { status: 503 }
        );
    }

    return NextResponse.json(
        { status: "healthy", timestamp: new Date().toISOString() },
        { status: 200 }
    );
}
