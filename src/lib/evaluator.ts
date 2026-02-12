import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { publishAdminEvent } from "./events";
import { ChallengeRules } from "@/types/trading";
import { MarketService } from "./market";
import { FUNDED_RULES, FundedTier, getFundedTier as getFundedTierShared } from "./funded-rules";
import { normalizeRulesConfig } from "./normalize-rules";
import { createLogger } from "./logger";
import { BalanceManager } from "./trading/BalanceManager";
import { OutageManager } from "./outage-manager";

const logger = createLogger('Evaluator');

interface EvaluationResult {
    status: 'active' | 'passed' | 'failed' | 'pending_failure';
    reason?: string;
    equity?: number;
}

export class ChallengeEvaluator {

    static async evaluate(challengeId: string): Promise<EvaluationResult> {
        // EXCHANGE HALT: Skip evaluation during outage or grace window.
        // Without this, traders could be failed due to stale/missing price data.
        const outageStatus = await OutageManager.getOutageStatus();
        if (outageStatus.isOutage || outageStatus.isGraceWindow) {
            logger.info('Evaluation skipped: exchange halt', {
                challengeId: challengeId.slice(0, 8),
                isOutage: outageStatus.isOutage,
                isGraceWindow: outageStatus.isGraceWindow,
            });
            return { status: 'active', reason: 'Exchange halt — evaluation paused' };
        }

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

        // DEFENSE-IN-DEPTH: Normalize rulesConfig to guard against decimal-vs-absolute bug.
        // Legacy challenges may have maxDrawdown=0.08 instead of $800.
        const normalized = normalizeRulesConfig(rules as unknown as Record<string, unknown>, startingBalance);
        const profitTarget = normalized.profitTarget;

        // FUNDED PHASE: Use static drawdown from initial balance (not HWM-based trailing)
        // This is more lenient - a trader can profit, give some back, and not fail
        const maxDrawdown = isFunded
            ? fundedRules.maxTotalDrawdown  // Static: e.g. $1000 for 10k tier
            : normalized.maxDrawdown;  // Trailing for challenge phase

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
            const shares = parseFloat(pos.shares);

            // CRITICAL FIX: Handle price sources differently
            // - Live prices from order book are RAW YES prices → need direction adjustment
            // - Stored prices (currentPrice, entryPrice) are ALREADY direction-adjusted → use directly
            let effectivePrice: number;

            if (livePrice) {
                // Live price is raw YES price - apply direction adjustment
                const yesPrice = parseFloat(livePrice.price);
                effectivePrice = pos.direction === 'NO' ? (1 - yesPrice) : yesPrice;
            } else {
                // Fallback: Use stored price (ALREADY direction-adjusted in DB)
                // DO NOT apply direction adjustment again - that causes double-adjustment bug!
                effectivePrice = pos.currentPrice
                    ? parseFloat(pos.currentPrice)
                    : parseFloat(pos.entryPrice);
            }

            positionValue += shares * effectivePrice;
        }

        const equity = currentBalance + positionValue;

        // === CHECK TIME EXPIRY ===
        if (challenge.endsAt && new Date() > new Date(challenge.endsAt)) {
            logger.info('Challenge failed: time limit', { challengeId: challengeId.slice(0, 8), equity });
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
            logger.info('Challenge failed: drawdown breach', { challengeId: challengeId.slice(0, 8), phase: isFunded ? 'funded' : 'challenge', drawdownType, drawdownAmount, maxDrawdown });
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
                logger.warn('Challenge pending failure: daily loss', { challengeId: challengeId.slice(0, 8), dailyLoss, maxDailyLoss });
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
        logger.info('Evaluation state', {
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
        });

        if (!isFunded && profit >= profitTarget) {
            logger.info('Funded transition triggered', {
                challengeId: challengeId.slice(0, 8),
                profit: profit.toFixed(2),
                positions: openPositions.map(p => ({
                    marketId: p.marketId.slice(0, 12),
                    shares: p.shares,
                    direction: p.direction,
                    entryPrice: p.entryPrice,
                })),
            });

            const now = new Date();
            const tier = this.getFundedTier(startingBalance);
            const tierRules = FUNDED_RULES[tier];

            // TRANSACTION SAFETY: status guard + position closing + phase change + balance reset are atomic.
            // Status guard prevents race with risk-monitor's triggerPass.
            await db.transaction(async (tx) => {
                // 1. Status + phase guard: only transition active CHALLENGE-phase challenges.
                //    The status guard alone is insufficient because funded transition keeps
                //    status='active'. Without the phase guard, two concurrent evaluate() calls
                //    both see status='active' and both execute the transition.
                const result = await tx.update(challenges)
                    .set({
                        phase: 'funded',
                        status: 'active',
                        highWaterMark: startingBalance.toString(),
                        profitSplit: tierRules.profitSplit.toString(),
                        payoutCap: tierRules.payoutCap.toString(),
                        payoutCycleStart: now,
                        activeTradingDays: 0,
                        lastActivityAt: now,
                        endsAt: null,
                    })
                    .where(and(
                        eq(challenges.id, challengeId),
                        eq(challenges.status, 'active'),
                        eq(challenges.phase, 'challenge')
                    ));

                if (!result.rowCount || result.rowCount === 0) {
                    logger.info('Challenge already transitioned, skipping funded transition', { challengeId: challengeId.slice(0, 8) });
                    return;
                }

                // 2. Close all open positions and settle proceeds
                //    Without this, positions from the challenge phase would carry over
                //    while the balance resets — giving traders free position value.
                if (openPositions.length > 0) {
                    let totalProceeds = 0;
                    for (const pos of openPositions) {
                        const shares = parseFloat(pos.shares);
                        const entryPrice = parseFloat(pos.entryPrice);

                        // Use the same live price we already fetched earlier in this function
                        const liveData = livePrices.get(pos.marketId);
                        let closePrice: number;
                        if (liveData) {
                            const yesPrice = parseFloat(liveData.price);
                            closePrice = pos.direction === 'NO' ? (1 - yesPrice) : yesPrice;
                        } else {
                            closePrice = pos.currentPrice
                                ? parseFloat(pos.currentPrice)
                                : entryPrice;
                        }

                        const pnl = shares * (closePrice - entryPrice);
                        const proceeds = shares * closePrice;
                        totalProceeds += proceeds;

                        await tx.update(positions)
                            .set({
                                status: 'CLOSED',
                                shares: '0',
                                closedAt: now,
                                closedPrice: closePrice.toString(),
                                pnl: pnl.toFixed(2),
                            })
                            .where(eq(positions.id, pos.id));
                    }

                    // Credit proceeds before reset so BalanceManager logging shows the full flow
                    if (totalProceeds > 0) {
                        await BalanceManager.creditProceeds(
                            tx, challengeId, totalProceeds, 'funded_transition_liquidation'
                        );
                    }

                    logger.info('Closed positions for funded transition', {
                        challengeId: challengeId.slice(0, 8),
                        count: openPositions.length,
                        totalProceeds: totalProceeds.toFixed(2),
                    });
                }

                // 3. Reset balance to starting balance for funded phase
                await BalanceManager.resetBalance(
                    tx, challengeId, startingBalance, 'funded_transition'
                );
            });

            await publishAdminEvent("CHALLENGE_FUNDED", { challengeId, reason: "Profit Target Hit - Now Funded" });
            return { status: 'passed', reason: `Congratulations! You are now FUNDED. Profit: $${profit.toFixed(0)}`, equity };
        }

        // === UPDATE HIGH WATER MARK ===
        if (equity > highWaterMark) {
            await db.update(challenges)
                .set({ highWaterMark: equity.toString() })
                .where(eq(challenges.id, challengeId));
            logger.info('New high water mark', { challengeId: challengeId.slice(0, 8), equity: equity.toFixed(2) });
        }

        return { status: 'active', equity };
    }

    /**
     * Determine the funded tier based on starting balance.
     * Delegates to the shared function in funded-rules.ts.
     */
    private static getFundedTier(startingBalance: number): FundedTier {
        return getFundedTierShared(startingBalance);
    }
}
