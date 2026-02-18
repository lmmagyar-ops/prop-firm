import { db } from "@/db";
import { challenges, positions, trades } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { publishAdminEvent } from "./events";
import { ChallengeRules } from "@/types/trading";
import { MarketService } from "./market";
import { FUNDED_RULES, FundedTier, getFundedTier as getFundedTierShared } from "./funded-rules";
import { normalizeRulesConfig } from "./normalize-rules";
import { calculatePositionMetrics, getDirectionAdjustedPrice } from "./position-utils";
import { createLogger } from "./logger";
import { BalanceManager } from "./trading/BalanceManager";
import { OutageManager } from "./outage-manager";
import { alerts } from "./alerts";

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

        // SINGLE SOURCE OF TRUTH: Use canonical function from position-utils.ts
        let positionValue = 0;
        for (const pos of openPositions) {
            const livePrice = livePrices.get(pos.marketId);
            const shares = parseFloat(pos.shares);
            const entryPrice = parseFloat(pos.entryPrice);
            const direction = (pos.direction as 'YES' | 'NO') || 'YES';

            if (livePrice) {
                const yesPrice = parseFloat(livePrice.price);
                const { positionValue: pv } = calculatePositionMetrics(shares, entryPrice, yesPrice, direction);
                positionValue += pv;
            } else {
                // Fallback: Stored prices are ALREADY direction-adjusted in DB.
                // Use directly — no adjustment needed.
                const storedPrice = pos.currentPrice
                    ? parseFloat(pos.currentPrice)
                    : entryPrice;
                positionValue += shares * storedPrice;
            }
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

            // ═══════════════════════════════════════════════════════════════
            // SANITY GATE: PnL Cross-Reference
            // Before promoting, verify that realized PnL from actual trade
            // records roughly matches the equity-based profit. A large gap
            // indicates phantom PnL, calculation bugs, or data corruption.
            // ═══════════════════════════════════════════════════════════════
            const challengeTrades = await db.query.trades.findMany({
                where: eq(trades.challengeId, challengeId),
            });

            const realizedPnLSum = challengeTrades
                .filter(t => t.type === 'SELL' && t.realizedPnL)
                .reduce((sum, t) => sum + parseFloat(t.realizedPnL!), 0);

            // Unrealized PnL from open positions
            const unrealizedPnL = openPositions.reduce((sum, pos) => {
                const shares = parseFloat(pos.shares);
                const entry = parseFloat(pos.entryPrice);
                const liveData = livePrices.get(pos.marketId);
                if (!liveData) return sum;
                const yesPrice = parseFloat(liveData.price);
                const { unrealizedPnL: uPnL } = calculatePositionMetrics(shares, entry, yesPrice, (pos.direction as 'YES' | 'NO') || 'YES');
                return sum + uPnL;
            }, 0);

            const tradeDerivedProfit = realizedPnLSum + unrealizedPnL;
            const discrepancy = Math.abs(profit - tradeDerivedProfit);
            const discrepancyPct = profitTarget > 0 ? (discrepancy / profitTarget) * 100 : 0;

            logger.info('Sanity gate: PnL cross-reference', {
                challengeId: challengeId.slice(0, 8),
                equityProfit: profit.toFixed(2),
                realizedPnL: realizedPnLSum.toFixed(2),
                unrealizedPnL: unrealizedPnL.toFixed(2),
                tradeDerivedProfit: tradeDerivedProfit.toFixed(2),
                discrepancy: discrepancy.toFixed(2),
                discrepancyPct: discrepancyPct.toFixed(1),
                tradeCount: challengeTrades.length,
            });

            // FAIL CLOSED: Block promotion if PnL gap > 20% of target
            if (discrepancyPct > 20) {
                await alerts.anomaly('PROMOTION_PNL_MISMATCH', {
                    challengeId,
                    userId: challenge.userId,
                    equityProfit: profit.toFixed(2),
                    tradeDerivedProfit: tradeDerivedProfit.toFixed(2),
                    discrepancy: discrepancy.toFixed(2),
                    discrepancyPct: discrepancyPct.toFixed(1),
                    action: 'BLOCKED',
                });
                logger.error('SANITY GATE BLOCKED PROMOTION: PnL mismatch', {
                    challengeId: challengeId.slice(0, 8),
                    discrepancyPct: discrepancyPct.toFixed(1),
                });
                return {
                    status: 'active',
                    reason: 'Promotion blocked: PnL cross-reference failed. Admin review required.',
                    equity,
                };
            }

            // ═══════════════════════════════════════════════════════════════
            // SANITY GATE: Suspicious Speed Alert
            // Fire a warning (but don't block) if profit target was hit
            // unusually fast. This catches exploitation or system bugs.
            // ═══════════════════════════════════════════════════════════════
            const startedAt = challenge.startedAt ? new Date(challenge.startedAt) : new Date();
            const hoursActive = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60);
            const sellCount = challengeTrades.filter(t => t.type === 'SELL').length;

            if (hoursActive < 24 || sellCount < 5) {
                await alerts.anomaly('SUSPICIOUS_SPEED_PASS', {
                    challengeId,
                    userId: challenge.userId,
                    hoursActive: hoursActive.toFixed(1),
                    sellCount,
                    profit: profit.toFixed(2),
                    profitTarget,
                    action: 'ALERTED_NOT_BLOCKED',
                });
                logger.warn('Suspicious speed: challenge passed quickly', {
                    challengeId: challengeId.slice(0, 8),
                    hoursActive: hoursActive.toFixed(1),
                    sellCount,
                });
            }

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
                            closePrice = getDirectionAdjustedPrice(yesPrice, (pos.direction as 'YES' | 'NO') || 'YES');
                        } else {
                            // Stored prices are already direction-adjusted in DB
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

                        // AUDIT TRAIL: Create SELL trade record so funded-transition PnL is visible in trade history
                        await tx.insert(trades).values({
                            positionId: pos.id,
                            challengeId: challengeId,
                            marketId: pos.marketId,
                            type: 'SELL',
                            direction: pos.direction,
                            price: closePrice.toString(),
                            amount: proceeds.toFixed(2),
                            shares: shares.toString(),
                            realizedPnL: pnl.toFixed(2),
                            closureReason: 'pass_liquidation',
                            executedAt: now,
                        });
                    }

                    logger.info('Closed positions for funded transition', {
                        challengeId: challengeId.slice(0, 8),
                        count: openPositions.length,
                        totalProceeds: totalProceeds.toFixed(2),
                    });

                    // NOTE: We do NOT credit proceeds here. Balance is about to be reset
                    // to startingBalance, so crediting first is a no-op that can cause
                    // transaction ordering bugs (proceeds persist after reset).
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
