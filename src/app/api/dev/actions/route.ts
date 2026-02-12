import { db } from "@/db";
import { challenges, positions, trades } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Actions");

/**
 * POST /api/dev/actions
 * Development-only endpoint for testing actions via DevTools.
 * Only works in non-production environments.
 */
export async function POST(req: NextRequest) {
    // SAFETY: Only allow in development
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Not available in production" }, { status: 403 });
    }

    try {
        const { action, userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 });
        }

        // Get active challenge for user
        const [activeChallenge] = await db
            .select()
            .from(challenges)
            .where(and(
                eq(challenges.userId, userId),
                eq(challenges.status, "active")
            ))
            .limit(1);

        switch (action) {
            case "reset": {
                // Full reset: delete all data and recreate clean challenge
                if (!activeChallenge) {
                    return NextResponse.json({ error: "No active challenge to reset" }, { status: 400 });
                }

                const startingBalance = parseFloat(activeChallenge.startingBalance);

                // Delete trades and positions
                await db.delete(trades).where(eq(trades.challengeId, activeChallenge.id));
                await db.delete(positions).where(eq(positions.challengeId, activeChallenge.id));

                // Reset challenge state (including phase for funded accounts)
                await db
                    .update(challenges)
                    .set({
                        currentBalance: String(startingBalance),
                        startOfDayBalance: String(startingBalance),
                        highWaterMark: String(startingBalance),
                        status: "active",
                        phase: "challenge", // Reset funded accounts back to challenge phase
                        pendingFailureAt: null,
                        activeTradingDays: 0,
                    })
                    .where(eq(challenges.id, activeChallenge.id));

                logger.info(`[DevTools] Reset challenge ${activeChallenge.id.slice(0, 8)} for user ${userId.slice(0, 8)}`);
                return NextResponse.json({ success: true, action: "reset" });
            }

            case "seed_pending": {
                // Create a new "pending" challenge ready to start
                await db.insert(challenges).values({
                    userId,
                    phase: "challenge",
                    status: "pending",
                    startingBalance: "10000.00",
                    currentBalance: "10000.00",
                    startOfDayBalance: "10000.00",
                    highWaterMark: "10000.00",
                    rulesConfig: {
                        startingBalance: 10000,
                        profitTarget: 800,
                        profit_target_percent: 0.08,
                        maxDrawdown: 1000,
                        max_drawdown_percent: 0.10,
                        maxDailyDrawdown: 500,
                        daily_loss_percent: 0.05,
                        min_trades: 5,
                        profit_split: 0.70,
                        payout_frequency: "Monthly"
                    },
                    endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                });
                return NextResponse.json({ success: true, action: "seed_pending" });
            }

            case "force_fail": {
                if (!activeChallenge) {
                    return NextResponse.json({ error: "No active challenge" }, { status: 400 });
                }
                await db.update(challenges)
                    .set({ status: "failed", endsAt: new Date() })
                    .where(eq(challenges.id, activeChallenge.id));
                return NextResponse.json({ success: true, action: "force_fail" });
            }

            case "force_pass": {
                if (!activeChallenge) {
                    return NextResponse.json({ error: "No active challenge" }, { status: 400 });
                }
                await db.update(challenges)
                    .set({ status: "passed", endsAt: new Date() })
                    .where(eq(challenges.id, activeChallenge.id));
                return NextResponse.json({ success: true, action: "force_pass" });
            }

            case "force_win": {
                // Add $200 to balance
                if (!activeChallenge) {
                    return NextResponse.json({ error: "No active challenge" }, { status: 400 });
                }
                const newBalance = parseFloat(activeChallenge.currentBalance) + 200;
                await db.update(challenges)
                    .set({ currentBalance: String(newBalance) })
                    .where(eq(challenges.id, activeChallenge.id));
                return NextResponse.json({ success: true, action: "force_win", newBalance });
            }

            case "force_loss": {
                // Subtract $200 from balance
                if (!activeChallenge) {
                    return NextResponse.json({ error: "No active challenge" }, { status: 400 });
                }
                const newBalance = parseFloat(activeChallenge.currentBalance) - 200;
                await db.update(challenges)
                    .set({ currentBalance: String(newBalance) })
                    .where(eq(challenges.id, activeChallenge.id));
                return NextResponse.json({ success: true, action: "force_loss", newBalance });
            }

            case "advance_day": {
                // Simulate daily reset
                if (!activeChallenge) {
                    return NextResponse.json({ error: "No active challenge" }, { status: 400 });
                }
                await db.update(challenges)
                    .set({
                        startOfDayBalance: activeChallenge.currentBalance,
                        lastDailyResetAt: new Date()
                    })
                    .where(eq(challenges.id, activeChallenge.id));
                return NextResponse.json({ success: true, action: "advance_day" });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error) {
        logger.error("DevTools action error:", error);
        return NextResponse.json({ error: "Action failed" }, { status: 500 });
    }
}
