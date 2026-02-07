import { db } from "@/db";
import { trades, challenges, users, positions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";

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
                // trades table doesn't have PnL. We can show position PnL or null. 
                // For a feed of *executions*, PnL isn't always relevant (e.g. opening trade).
                // We'll return null for now to avoid misleading "0" PnL.
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
        console.error("Activity Feed Error:", error);
        return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
    }
}
