import { NextResponse } from "next/server";
import { TradeExecutor } from "@/lib/trade";
import { publishAdminEvent } from "@/lib/events";
import { auth } from "@/auth";
import { logTrade } from "@/lib/event-logger";
import { getErrorMessage } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
const logger = createLogger("Trade");

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

        // SECURITY: Check if user account is suspended before allowing trades
        const [user] = await db.select({ isActive: users.isActive }).from(users).where(eq(users.id, userId));
        if (user && user.isActive === false) {
            return NextResponse.json({ error: "Account suspended" }, { status: 403 });
        }

        // Validation
        if (!challengeId || !marketId || !side || !amount) {
            return NextResponse.json({ error: "Missing required fields (challengeId, marketId, side, amount)" }, { status: 400 });
        }

        // SECURITY: Runtime validation — TypeScript types don't exist at runtime
        if (side !== "BUY" && side !== "SELL") {
            return NextResponse.json({ error: "Invalid side: must be BUY or SELL" }, { status: 400 });
        }

        const parsedAmount = parseFloat(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ error: "Invalid amount: must be a positive number" }, { status: 400 });
        }

        let trade;
        try {
            trade = await TradeExecutor.executeTrade(userId, challengeId, marketId, side, parsedAmount);
        } catch (error: unknown) {

            // 1. AUTO-PROVISION CHALLENGE & USER (Fallback for demo mode)
            if (error instanceof Error && "code" in error && error.code === "INVALID_CHALLENGE" && userId === "demo-user-1") {
                logger.info("[Auto-Provision] Creating new challenge for demo user...");
                const { autoProvisionDemoChallenge } = await import("@/lib/dev-helpers");
                const newChallengeId = await autoProvisionDemoChallenge(userId);
                trade = await TradeExecutor.executeTrade(userId, newChallengeId, marketId, side, parsedAmount);
            }

            // 2. AUTO-PROVISION MARKET DATA (Redis)
            else if ((getErrorMessage(error) === "Market data unavailable" || getErrorMessage(error).includes("Book Not Found")) && userId === "demo-user-1") {
                const { autoProvisionMarketData } = await import("@/lib/dev-helpers");
                await autoProvisionMarketData(marketId);
                logger.info("[Auto-Provision] Retrying execution...");
                trade = await TradeExecutor.executeTrade(userId, challengeId, marketId, side, parsedAmount);
            } else {
                // Log failed trade
                await logTrade(userId, {
                    challengeId,
                    marketId,
                    side,
                    amount: parsedAmount,
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
            amount: parsedAmount,
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
        logger.error("Trade Execution Error:", error);
        // SECURITY: Only expose structured domain error messages, never internal details
        const code = (error instanceof Error && "code" in error ? (error as Record<string, unknown>).code : undefined) || 'UNKNOWN';
        const isSafeError = code !== 'UNKNOWN';
        const safeMessage = isSafeError ? (getErrorMessage(error) || "Trade failed") : "Trade failed";
        const status = (error instanceof Error && "status" in error ? (error as Record<string, unknown>).status : undefined) || 500;
        return NextResponse.json({ error: safeMessage, code }, { status: typeof status === 'number' ? status : 500 });
    }
}

