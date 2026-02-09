import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { publishAdminEvent } from "./events";
import { ChallengeRules } from "@/types/trading";
import { MarketService } from "./market";
import { FUNDED_RULES, FundedTier } from "./funded-rules";
import { getPortfolioValue } from "./position-utils";

// ─── Types ──────────────────────────────────────────────────────────

interface EvaluationResult {
    status: "active" | "passed" | "failed" | "pending_failure";
    reason?: string;
    equity?: number;
}

// ─── Challenge Evaluator ────────────────────────────────────────────

export class ChallengeEvaluator {

    /**
     * Post-trade challenge evaluation.
     *
     * Checks (in order): time expiry, max drawdown, daily loss limit,
     * profit target (challenge phase only), high water mark update.
     *
     * Returns the evaluation result with the challenge's new status.
     */
    static async evaluate(challengeId: string): Promise<EvaluationResult> {
        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, challengeId)
        });

        if (!challenge) return { status: "active" };
        if (challenge.status === "passed" || challenge.status === "failed") {
            return { status: challenge.status as "passed" | "failed" };
        }

        // ── Parse challenge state ──────────────────────────────────
        const currentBalance = parseFloat(challenge.currentBalance);
        const startingBalance = parseFloat(challenge.startingBalance);
        const highWaterMark = parseFloat(challenge.highWaterMark || challenge.startingBalance);
        const startOfDayBalance = parseFloat(challenge.startOfDayBalance || challenge.startingBalance);
        const rules = challenge.rulesConfig as unknown as ChallengeRules;
        const isFunded = challenge.phase === "funded";

        // Get tier-specific funded rules
        const fundedTier = this.getFundedTier(startingBalance);
        const fundedRules = FUNDED_RULES[fundedTier];

        const profitTarget = rules.profitTarget || 1000;

        // FUNDED: Static drawdown from initial balance (more lenient)
        // CHALLENGE: Trailing drawdown from High Water Mark (stricter)
        const maxDrawdown = isFunded
            ? fundedRules.maxTotalDrawdown
            : (rules.maxDrawdown || 1000);

        const maxDailyLoss = isFunded
            ? fundedRules.maxDailyDrawdown
            : (rules.maxDailyDrawdownPercent || 0.04) * startingBalance;

        // ── Calculate equity via shared utility ────────────────────
        const openPositions = await db.query.positions.findMany({
            where: and(eq(positions.challengeId, challengeId), eq(positions.status, "OPEN"))
        });

        const marketIds = openPositions.map(pos => pos.marketId);
        const livePrices = marketIds.length > 0
            ? await MarketService.getBatchOrderBookPrices(marketIds)
            : new Map();

        const portfolio = getPortfolioValue(openPositions, livePrices);
        const equity = currentBalance + portfolio.totalValue;

        // ── CHECK TIME EXPIRY ──────────────────────────────────────
        if (challenge.endsAt && new Date() > new Date(challenge.endsAt)) {
            console.log(`[Evaluator] ⏰ Challenge ${challengeId.slice(0, 8)} FAILED. Time Limit Exceeded.`);
            await db.update(challenges)
                .set({ status: "failed", endsAt: new Date() })
                .where(eq(challenges.id, challengeId));
            await this.closePositionsOnFailure(openPositions, livePrices);
            await publishAdminEvent("CHALLENGE_FAILED", { challengeId, reason: "Time Limit Exceeded" });
            return { status: "failed", reason: "Time limit exceeded", equity };
        }

        // ── CHECK MAX DRAWDOWN ─────────────────────────────────────
        const drawdownBase = isFunded ? startingBalance : highWaterMark;
        const drawdownAmount = drawdownBase - equity;
        const drawdownType = isFunded ? "Total" : "Trailing";

        if (drawdownAmount >= maxDrawdown) {
            console.log(`[Evaluator] ❌ ${isFunded ? "Funded" : "Challenge"} ${challengeId.slice(0, 8)} FAILED. ${drawdownType} Drawdown $${drawdownAmount.toFixed(2)} >= max $${maxDrawdown}`);
            await db.update(challenges)
                .set({ status: "failed", endsAt: new Date() })
                .where(eq(challenges.id, challengeId));
            await this.closePositionsOnFailure(openPositions, livePrices);
            await publishAdminEvent("CHALLENGE_FAILED", { challengeId, reason: `Max ${drawdownType} Drawdown Breached` });
            return { status: "failed", reason: `Max ${drawdownType.toLowerCase()} drawdown breached: $${drawdownAmount.toFixed(0)}`, equity };
        }

        // ── CHECK DAILY LOSS LIMIT ─────────────────────────────────
        const dailyLoss = startOfDayBalance - equity;
        if (dailyLoss >= maxDailyLoss) {
            if (!challenge.pendingFailureAt) {
                console.log(`[Evaluator] ⚠️ Challenge ${challengeId.slice(0, 8)} PENDING FAILURE. Daily loss $${dailyLoss.toFixed(2)} >= max $${maxDailyLoss}`);
                await db.update(challenges)
                    .set({ pendingFailureAt: new Date() })
                    .where(eq(challenges.id, challengeId));
            }
            return { status: "pending_failure", reason: `Daily loss limit hit: $${dailyLoss.toFixed(0)}`, equity };
        } else if (challenge.pendingFailureAt) {
            // Clear pending failure — user recovered
            await db.update(challenges)
                .set({ pendingFailureAt: null })
                .where(eq(challenges.id, challengeId));
        }

        // ── CHECK PROFIT TARGET (challenge phase only) ─────────────
        const profit = equity - startingBalance;

        // Structured forensic log (replaces scattered console.logs)
        console.log(`[EVALUATOR_FORENSIC] ${JSON.stringify({
            challengeId: challengeId.slice(0, 8),
            phase: challenge.phase,
            isFunded,
            cashBalance: currentBalance.toFixed(2),
            positionCount: openPositions.length,
            positionValue: portfolio.totalValue.toFixed(2),
            equity: equity.toFixed(2),
            startingBalance: startingBalance.toFixed(2),
            profit: profit.toFixed(2),
            profitTarget,
            wouldTransition: !isFunded && profit >= profitTarget,
        })}`);

        if (!isFunded && profit >= profitTarget) {
            console.log(`[Evaluator] 🎉 Challenge ${challengeId.slice(0, 8)} PASSED! Transitioning to FUNDED. Profit: $${profit.toFixed(2)}`);

            const now = new Date();
            const tier = this.getFundedTier(startingBalance);
            const tierRules = FUNDED_RULES[tier];

            // ── CLEAN SLATE: Close all open positions before transition ──
            // Without this, open positions carry phantom equity into the
            // funded phase (balance resets but positions survive).
            if (openPositions.length > 0) {
                console.log(`[Evaluator] 🧹 Closing ${openPositions.length} open position(s) for clean funded transition`);
                for (const pos of openPositions) {
                    const liveEntry = livePrices.get(pos.marketId);
                    const closePrice = liveEntry ? parseFloat(liveEntry.price) : parseFloat(pos.currentPrice || pos.entryPrice);
                    const shares = parseFloat(pos.shares);
                    const entryPrice = parseFloat(pos.entryPrice);
                    const pnl = shares * (closePrice - entryPrice);

                    await db.update(positions)
                        .set({
                            status: "CLOSED",
                            shares: "0",
                            closedAt: now,
                            closedPrice: closePrice.toString(),
                            pnl: pnl.toFixed(2),
                        })
                        .where(eq(positions.id, pos.id));
                }
            }

            await db.update(challenges)
                .set({
                    phase: "funded",
                    status: "active",
                    currentBalance: startingBalance.toString(),
                    highWaterMark: startingBalance.toString(),
                    profitSplit: tierRules.profitSplit.toString(),
                    payoutCap: tierRules.payoutCap.toString(),
                    payoutCycleStart: now,
                    activeTradingDays: 0,
                    lastActivityAt: now,
                    endsAt: null,
                })
                .where(eq(challenges.id, challengeId));

            await publishAdminEvent("CHALLENGE_FUNDED", { challengeId, reason: "Profit Target Hit - Now Funded" });
            return { status: "passed", reason: `Congratulations! You are now FUNDED. Profit: $${profit.toFixed(0)}`, equity };
        }

        // ── UPDATE HIGH WATER MARK ─────────────────────────────────
        if (equity > highWaterMark) {
            await db.update(challenges)
                .set({ highWaterMark: equity.toString() })
                .where(eq(challenges.id, challengeId));
            console.log(`[Evaluator] 📈 New high water mark: $${equity.toFixed(2)}`);
        }

        return { status: "active", equity };
    }

    /**
     * Determine the funded tier based on starting balance.
     */
    private static getFundedTier(startingBalance: number): FundedTier {
        if (startingBalance >= 25000) return "25k";
        if (startingBalance >= 10000) return "10k";
        return "5k";
    }

    /**
     * Close all open positions when a challenge fails.
     * Prevents orphaned positions that pollute portfolio queries and P&L.
     */
    private static async closePositionsOnFailure(
        openPositions: { id: string; marketId: string; entryPrice: string; currentPrice: string | null; shares: string; direction: string | null }[],
        livePrices: Map<string, { price: string; timestamp?: number }>
    ): Promise<void> {
        if (openPositions.length === 0) return;

        const now = new Date();
        for (const pos of openPositions) {
            const liveEntry = livePrices.get(pos.marketId);
            const rawPrice = liveEntry ? parseFloat(liveEntry.price) : parseFloat(pos.currentPrice || pos.entryPrice);
            const isNo = pos.direction === 'NO';
            const closePrice = isNo ? (1 - rawPrice) : rawPrice;
            const shares = parseFloat(pos.shares);
            const entryPrice = parseFloat(pos.entryPrice);
            const pnl = shares * (closePrice - entryPrice);

            await db.update(positions)
                .set({
                    status: "CLOSED",
                    shares: "0",
                    closedAt: now,
                    closedPrice: closePrice.toString(),
                    pnl: pnl.toFixed(2),
                })
                .where(eq(positions.id, pos.id));
        }
        console.log(`[Evaluator] 🧹 Closed ${openPositions.length} position(s) on failure`);
    }
}
