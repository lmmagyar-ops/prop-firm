import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { trades, challenges } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getRedisClient } from "@/lib/redis-client";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const challengeId = url.searchParams.get("challengeId");

        // Get challenge ID - either from param or find active challenge
        let targetChallengeId = challengeId;
        if (!targetChallengeId) {
            const [activeChallenge] = await db
                .select({ id: challenges.id })
                .from(challenges)
                .where(and(
                    eq(challenges.userId, session.user.id),
                    eq(challenges.status, "active")
                ))
                .limit(1);

            targetChallengeId = activeChallenge?.id;
        }

        if (!targetChallengeId) {
            return NextResponse.json({ trades: [] });
        }

        // Fetch trades
        const tradeRecords = await db
            .select()
            .from(trades)
            .where(eq(trades.challengeId, targetChallengeId))
            .orderBy(desc(trades.executedAt))
            .limit(limit);

        // Enrich with market titles from Redis
        const redis = getRedisClient();
        const eventData = await redis.get("event:active_list");
        const events = eventData ? JSON.parse(eventData) : [];

        // Build market lookup
        const marketLookup: Record<string, { title: string; eventTitle: string; image?: string }> = {};
        for (const event of events) {
            for (const market of event.markets || []) {
                marketLookup[market.id] = {
                    title: market.question || market.title,
                    eventTitle: event.title,
                    image: event.image
                };
            }
        }

        // Enrich trades
        const enrichedTrades = tradeRecords.map(trade => ({
            id: trade.id,
            marketId: trade.marketId,
            marketTitle: marketLookup[trade.marketId]?.title || `Market ${trade.marketId.slice(0, 8)}...`,
            eventTitle: marketLookup[trade.marketId]?.eventTitle,
            image: marketLookup[trade.marketId]?.image,
            type: trade.type,
            price: parseFloat(trade.price),
            amount: parseFloat(trade.amount),
            shares: parseFloat(trade.shares),
            realizedPnL: trade.realizedPnL ? parseFloat(trade.realizedPnL) : null,
            executedAt: trade.executedAt,
        }));

        return NextResponse.json({ trades: enrichedTrades });
    } catch (error) {
        console.error("[API] Trade history error:", error);
        return NextResponse.json({ error: "Failed to fetch trade history" }, { status: 500 });
    }
}
