import { NextResponse } from "next/server";
import { TradeExecutor } from "@/lib/trade";
import { publishAdminEvent } from "@/lib/events";
import { auth } from "@/auth";
import { logTrade } from "@/lib/event-logger";
import { getErrorMessage } from "@/lib/errors";

export async function POST(req: Request) {
    try {
        const session = await auth();

        const body = await req.json();
        const { challengeId, marketId, side, amount } = body;

        // SECURITY: Use session userId, with demo fallback for development
        let userId = session?.user?.id;

        // Only allow demo-user-1 fallback in development
        if (!userId && body.userId === "demo-user-1" && process.env.NODE_ENV !== "production") {
            userId = "demo-user-1";
        }

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Validation
        if (!challengeId || !marketId || !side || !amount) {
            return NextResponse.json({ error: "Missing required fields (challengeId, marketId, side, amount)" }, { status: 400 });
        }

        let trade;
        try {
            trade = await TradeExecutor.executeTrade(userId, challengeId, marketId, side, parseFloat(amount));
        } catch (error: unknown) {

            // 1. AUTO-PROVISION CHALLENGE & USER (Fallback for demo mode)
            if (error instanceof Error && "code" in error && error.code === "INVALID_CHALLENGE" && userId === "demo-user-1") {
                console.log("[Auto-Provision] Creating new challenge for demo user...");
                const { autoProvisionDemoChallenge } = await import("@/lib/dev-helpers");
                const newChallengeId = await autoProvisionDemoChallenge(userId);
                trade = await TradeExecutor.executeTrade(userId, newChallengeId, marketId, side, parseFloat(amount));
            }

            // 2. AUTO-PROVISION MARKET DATA (Redis)
            else if ((getErrorMessage(error) === "Market data unavailable" || getErrorMessage(error).includes("Book Not Found")) && userId === "demo-user-1") {
                const { autoProvisionMarketData } = await import("@/lib/dev-helpers");
                await autoProvisionMarketData(marketId);
                console.log("[Auto-Provision] Retrying execution...");
                trade = await TradeExecutor.executeTrade(userId, challengeId, marketId, side, parseFloat(amount));
            } else {
                // Log failed trade
                await logTrade(userId, {
                    challengeId,
                    marketId,
                    side,
                    amount: parseFloat(amount),
                    success: false,
                    error: getErrorMessage(error)
                });
                throw error;
            }
        }

        // Log successful trade
        await logTrade(userId, {
            challengeId,
            marketId,
            side,
            amount: parseFloat(amount),
            success: true
        });

        // Publish Event for Admin Panel "WOW" factor
        await publishAdminEvent("NEW_TRADE", {
            tradeId: trade.id,
            traderId: userId,
            marketId: marketId,
            side: side,
            amount: amount,
            pnl: 0,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({ success: true, trade });

    } catch (error: unknown) {
        console.error("Trade Execution Error:", error);
        return NextResponse.json({ error: getErrorMessage(error) || "Failed to execute trade" }, { status: 500 });
    }
}

