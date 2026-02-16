import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { trades, challenges } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getAllMarketData } from "@/lib/worker-client";
import { createLogger } from "@/lib/logger";
const logger = createLogger("History");

// Enrich trade records with market titles from worker HTTP API
async function enrichTrades(tradeRecords: (typeof trades.$inferSelect)[]) {
    const data = await getAllMarketData();
    const events = data?.events ? (data.events as { markets?: { id: string; question?: string; title?: string }[]; title?: string; image?: string }[]) : [];

    const marketLookup: Record<string, { title: string; eventTitle: string; image?: string }> = {};
    for (const event of events) {
        for (const market of event.markets || []) {
            marketLookup[market.id] = {
                title: market.question || market.title || "",
                eventTitle: event.title || "",
                image: event.image
            };
        }
    }

    return tradeRecords.map(trade => ({
        id: trade.id,
        marketId: trade.marketId,
        // Prefer DB-stored title (permanent) → Redis lookup (transient) → truncated ID (last resort)
        marketTitle: trade.marketTitle || marketLookup[trade.marketId]?.title || `Market ${trade.marketId.slice(0, 8)}...`,
        eventTitle: marketLookup[trade.marketId]?.eventTitle,
        image: marketLookup[trade.marketId]?.image,
        type: trade.type,
        price: parseFloat(trade.price),
        amount: parseFloat(trade.amount),
        shares: parseFloat(trade.shares),
        realizedPnL: trade.realizedPnL ? parseFloat(trade.realizedPnL) : null,
        closureReason: trade.closureReason || null, // null = manual | 'market_settlement' | 'breach_liquidation' | 'pass_liquidation'
        direction: trade.direction || null, // 'YES' | 'NO' — nullable for old rows
        executedAt: trade.executedAt,
    }));
}

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "100");
        const challengeId = url.searchParams.get("challengeId");

        // If a specific challenge is requested, verify ownership and fetch its trades
        if (challengeId) {
            const [challenge] = await db
                .select({ id: challenges.id })
                .from(challenges)
                .where(and(
                    eq(challenges.id, challengeId),
                    eq(challenges.userId, session.user.id)
                ))
                .limit(1);

            if (!challenge) {
                return NextResponse.json({ trades: [] });
            }

            const tradeRecords = await db
                .select()
                .from(trades)
                .where(eq(trades.challengeId, challengeId))
                .orderBy(desc(trades.executedAt))
                .limit(limit);

            return NextResponse.json({ trades: await enrichTrades(tradeRecords) });
        }

        // No specific challenge — default to the ACTIVE challenge, not all challenges.
        // This prevents trades from old evaluations bleeding into the current view.
        const activeChallenge = await db
            .select({ id: challenges.id })
            .from(challenges)
            .where(and(
                eq(challenges.userId, session.user.id),
                eq(challenges.status, 'active')
            ))
            .limit(1);

        // If user has an active challenge, scope to it
        const scopeId = activeChallenge[0]?.id;
        if (!scopeId) {
            // No active challenge — return most recent trades from ANY challenge as fallback
            const userChallenges = await db
                .select({ id: challenges.id })
                .from(challenges)
                .where(eq(challenges.userId, session.user.id))
                .limit(1);

            if (userChallenges.length === 0) {
                return NextResponse.json({ trades: [] });
            }

            // Fallback: return trades from the most recent challenge
            const fallbackTrades = await db
                .select()
                .from(trades)
                .where(eq(trades.challengeId, userChallenges[0].id))
                .orderBy(desc(trades.executedAt))
                .limit(limit);

            return NextResponse.json({ trades: await enrichTrades(fallbackTrades) });
        }

        const tradeRecords = await db
            .select()
            .from(trades)
            .where(eq(trades.challengeId, scopeId))
            .orderBy(desc(trades.executedAt))
            .limit(limit);

        return NextResponse.json({ trades: await enrichTrades(tradeRecords) });
    } catch (error) {
        logger.error("[API] Trade history error:", error);
        return NextResponse.json({ error: "Failed to fetch trade history" }, { status: 500 });
    }
}
