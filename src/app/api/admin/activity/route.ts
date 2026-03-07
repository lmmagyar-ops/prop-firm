import { db } from "@/db";
import { trades, challenges, users, positions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Activity");

export async function GET() {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const recentTrades = await db
            .select({
                id: trades.id,
                traderName: users.name,
                marketId: trades.marketId,
                side: positions.direction, // Get 'YES'/'NO' from position
                type: trades.type,         // 'BUY' or 'SELL'
                amount: trades.amount,
                price: trades.price,
                // Opening trades have no realized PnL — only SELL trades close positions.
                // Returning realizedPnL directly (null for open trades) is the correct behavior here.
                pnl: trades.realizedPnL,
                timestamp: trades.executedAt,
                phase: challenges.phase
            })
            .from(trades)
            .innerJoin(positions, eq(trades.positionId, positions.id))
            .innerJoin(challenges, eq(trades.challengeId, challenges.id))
            .innerJoin(users, eq(challenges.userId, users.id))
            .orderBy(desc(trades.executedAt))
            .limit(20);

        return NextResponse.json({ trades: recentTrades });
    } catch (error) {
        logger.error("Activity Feed Error:", error);
        return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
    }
}
