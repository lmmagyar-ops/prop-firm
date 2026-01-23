import { db } from "@/db";
import { challenges, positions, businessRules } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { publishAdminEvent } from "./events";
import { ChallengeRules } from "@/types/trading";
import { MarketService } from "./market";
import { FUNDED_RULES, FundedTier } from "./funded-rules";

interface EvaluationResult {
    status: 'active' | 'passed' | 'failed' | 'pending_failure';
    reason?: string;
    equity?: number;
}

export class ChallengeEvaluator {

    static async evaluate(challengeId: string): Promise<EvaluationResult> {
        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, challengeId)
        });

        if (!challenge) return { status: 'active' };
        if (challenge.status === 'passed' || challenge.status === 'failed') {
            return { status: challenge.status as 'passed' | 'failed' };
        }

        const currentBalance = parseFloat(challenge.currentBalance);
        const startingBalance = parseFloat(challenge.startingBalance);
        const highWaterMark = parseFloat(challenge.highWaterMark || challenge.startingBalance);
        const startOfDayBalance = parseFloat(challenge.startOfDayBalance || challenge.startingBalance);
        const rules = challenge.rulesConfig as unknown as ChallengeRules;
        const isFunded = challenge.phase === 'funded';

        // Get tier-specific funded rules if in funded phase
        const fundedTier = this.getFundedTier(startingBalance);
        const fundedRules = FUNDED_RULES[fundedTier];

        // Default rules (absolute dollar amounts or percentages)
        const profitTarget = rules.profitTarget || 1000;       // $1000 profit target

        // FUNDED PHASE: Use static drawdown from initial balance (not HWM-based trailing)
        // This is more lenient - a trader can profit, give some back, and not fail
        const maxDrawdown = isFunded
            ? fundedRules.maxTotalDrawdown  // Static: e.g. $1000 for 10k tier
            : (rules.maxDrawdown || 1000);  // Trailing for challenge phase

        // Daily loss limit from percentage
        const maxDailyLoss = isFunded
            ? fundedRules.maxDailyDrawdown  // Static daily limit
            : (rules.maxDailyDrawdownPercent || 0.04) * startingBalance;

        // Calculate Equity (Cash + Unrealized Value of Open Positions)
        const openPositions = await db.query.positions.findMany({
            where: and(eq(positions.challengeId, challengeId), eq(positions.status, 'OPEN'))
        });

        // PERF: Batch fetch all prices at once instead of N sequential Redis calls
        const marketIds = openPositions.map(pos => pos.marketId);
        const livePrices = marketIds.length > 0
            ? await MarketService.getBatchOrderBookPrices(marketIds)
            : new Map();

        let positionValue = 0;
        for (const pos of openPositions) {
            const livePrice = livePrices.get(pos.marketId);
            // Market data returns YES price, so for NO positions we need (1 - yesPrice)
            const yesPrice = livePrice
                ? parseFloat(livePrice.price)
                : (pos.currentPrice ? parseFloat(pos.currentPrice) : parseFloat(pos.entryPrice));

            // For NO positions, value = shares * (1 - yesPrice)
            const effectivePrice = pos.direction === 'NO' ? (1 - yesPrice) : yesPrice;
            positionValue += parseFloat(pos.shares) * effectivePrice;
        }

        const equity = currentBalance + positionValue;

        // === CHECK TIME EXPIRY ===
        if (challenge.endsAt && new Date() > new Date(challenge.endsAt)) {
            console.log(`[Evaluator] ⏰ Challenge ${challengeId.slice(0, 8)} FAILED. Time Limit Exceeded.`);
            await db.update(challenges)
                .set({ status: 'failed', endsAt: new Date() })
                .where(eq(challenges.id, challengeId));
            await publishAdminEvent("CHALLENGE_FAILED", { challengeId, reason: "Time Limit Exceeded" });
            return { status: 'failed', reason: 'Time limit exceeded', equity };
        }

        // === CHECK MAX DRAWDOWN ===
        // FUNDED PHASE: Static drawdown from initial balance (more lenient)
        // CHALLENGE PHASE: Trailing drawdown from High Water Mark (stricter)
        const drawdownBase = isFunded ? startingBalance : highWaterMark;
        const drawdownAmount = drawdownBase - equity;
        const drawdownType = isFunded ? 'Total' : 'Trailing';

        if (drawdownAmount >= maxDrawdown) {
            console.log(`[Evaluator] ❌ ${isFunded ? 'Funded' : 'Challenge'} ${challengeId.slice(0, 8)} FAILED. ${drawdownType} Drawdown $${drawdownAmount.toFixed(2)} >= max $${maxDrawdown}`);
            await db.update(challenges)
                .set({ status: 'failed', endsAt: new Date() })
                .where(eq(challenges.id, challengeId));
            await publishAdminEvent("CHALLENGE_FAILED", { challengeId, reason: `Max ${drawdownType} Drawdown Breached` });
            return { status: 'failed', reason: `Max ${drawdownType.toLowerCase()} drawdown breached: $${drawdownAmount.toFixed(0)}`, equity };
        }

        // === CHECK DAILY LOSS LIMIT ===
        const dailyLoss = startOfDayBalance - equity;
        if (dailyLoss >= maxDailyLoss) {
            // Set pending failure (user can recover if they profit back before end of day)
            if (!challenge.pendingFailureAt) {
                console.log(`[Evaluator] ⚠️ Challenge ${challengeId.slice(0, 8)} PENDING FAILURE. Daily loss $${dailyLoss.toFixed(2)} >= max $${maxDailyLoss}`);
                await db.update(challenges)
                    .set({ pendingFailureAt: new Date() })
                    .where(eq(challenges.id, challengeId));
            }
            return { status: 'pending_failure', reason: `Daily loss limit hit: $${dailyLoss.toFixed(0)}`, equity };
        } else if (challenge.pendingFailureAt) {
            // Clear pending failure if they recovered
            await db.update(challenges)
                .set({ pendingFailureAt: null })
                .where(eq(challenges.id, challengeId));
        }

        // === CHECK PROFIT TARGET (Challenge/Verification phase only) ===
        // Funded accounts do NOT have a profit target - they accumulate profit for payouts
        const profit = equity - startingBalance;

        // FORENSIC LOGGING: Always log evaluation state for debugging
        console.log(`[EVALUATOR_FORENSIC] ${JSON.stringify({
            challengeId: challengeId.slice(0, 8),
            phase: challenge.phase,
            isFunded,
            cashBalance: currentBalance.toFixed(2),
            positionCount: openPositions.length,
            positionValue: positionValue.toFixed(2),
            equity: equity.toFixed(2),
            startingBalance: startingBalance.toFixed(2),
            profit: profit.toFixed(2),
            profitTarget,
            wouldTransition: !isFunded && profit >= profitTarget,
        })}`);

        if (!isFunded && profit >= profitTarget) {
            // FORENSIC: Log detailed transition info
            console.log(`[EVALUATOR_FORENSIC] ⚠️ FUNDED TRANSITION TRIGGERED`, {
                challengeId: challengeId.slice(0, 8),
                positions: openPositions.map(p => ({
                    marketId: p.marketId.slice(0, 12),
                    shares: p.shares,
                    direction: p.direction,
                    entryPrice: p.entryPrice,
                })),
            });

            // Transition to funded phase
            console.log(`[Evaluator] 🎉 Challenge ${challengeId.slice(0, 8)} PASSED! Transitioning to FUNDED. Profit: $${profit.toFixed(2)}`);

            const now = new Date();
            const tier = this.getFundedTier(startingBalance);
            const tierRules = FUNDED_RULES[tier];

            await db.update(challenges)
                .set({
                    phase: 'funded',
                    status: 'active', // Stay active in funded phase
                    // Reset for funded phase
                    currentBalance: startingBalance.toString(), // Reset to starting balance
                    highWaterMark: startingBalance.toString(),
                    profitSplit: tierRules.profitSplit.toString(), // From tier config
                    payoutCap: tierRules.payoutCap.toString(), // Max payout = tier cap
                    payoutCycleStart: now,
                    activeTradingDays: 0,
                    lastActivityAt: now,
                    endsAt: null, // No time limit for funded
                })
                .where(eq(challenges.id, challengeId));

            await publishAdminEvent("CHALLENGE_FUNDED", { challengeId, reason: "Profit Target Hit - Now Funded" });
            return { status: 'passed', reason: `Congratulations! You are now FUNDED. Profit: $${profit.toFixed(0)}`, equity };
        }

        // === UPDATE HIGH WATER MARK ===
        if (equity > highWaterMark) {
            await db.update(challenges)
                .set({ highWaterMark: equity.toString() })
                .where(eq(challenges.id, challengeId));
            console.log(`[Evaluator] 📈 New high water mark: $${equity.toFixed(2)}`);
        }

        return { status: 'active', equity };
    }

    /**
     * Determine the funded tier based on starting balance.
     */
    private static getFundedTier(startingBalance: number): FundedTier {
        if (startingBalance >= 25000) return '25k';
        if (startingBalance >= 10000) return '10k';
        return '5k';
    }
}
