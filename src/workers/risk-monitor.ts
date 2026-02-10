/**
 * Real-Time Risk Monitor
 * 
 * Continuously checks all active challenges for drawdown breaches
 * based on live market prices. Runs every 5 seconds inside the ingestion worker.
 * 
 * This is CRITICAL for protecting the firm's capital - breaches trigger
 * on price movements, not just on trades.
 */

import Redis from "ioredis";
import { db } from "../db";
import { challenges, positions, auditLogs } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { FUNDED_RULES } from "../lib/funded-rules";
import { normalizeRulesConfig } from "../lib/normalize-rules";
import { createLogger } from "../lib/logger";

const logger = createLogger('RiskMonitor');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChallengeRecord = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PositionRecord = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RulesConfig = Record<string, any>;

export class RiskMonitor {
    private redis: Redis;
    private isRunning = false;
    private checkInterval: NodeJS.Timeout | null = null;
    // COST OPTIMIZATION: 30s interval = 2,880 checks/day (vs 17,280 at 5s)
    private readonly CHECK_INTERVAL_MS = 30000;

    constructor(redis: Redis) {
        this.redis = redis;
    }

    /**
     * Start the risk monitoring loop
     */
    start(): void {
        if (this.isRunning) return;

        logger.info('Starting real-time breach monitoring (30s interval)');
        this.isRunning = true;

        // Initial check (catch to prevent unhandled rejection)
        this.checkAllChallenges().catch(err => {
            logger.error('Initial check failed', err instanceof Error ? err : null, { message: err instanceof Error ? err.message : String(err) });
        });

        // Continuous monitoring (wrapped to prevent silent failures)
        this.checkInterval = setInterval(() => {
            this.checkAllChallenges().catch(err => {
                logger.error('Monitoring cycle failed', err instanceof Error ? err : null, { message: err instanceof Error ? err.message : String(err) });
            });
        }, this.CHECK_INTERVAL_MS);
    }

    /**
     * Stop the risk monitoring loop
     */
    stop(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        logger.info('Stopped');
    }

    /**
     * Check all active challenges for breaches
     */
    private async checkAllChallenges(): Promise<void> {
        try {
            // Get all active challenges with open positions
            const activeChallenges = await db.query.challenges.findMany({
                where: eq(challenges.status, 'active'),
            });

            if (activeChallenges.length === 0) return;

            // Batch fetch all prices we need
            const allMarketIds = new Set<string>();
            const challengePositions = new Map<string, PositionRecord[]>();

            for (const challenge of activeChallenges) {
                const openPositions = await db.query.positions.findMany({
                    where: and(
                        eq(positions.challengeId, challenge.id),
                        eq(positions.status, 'OPEN')
                    )
                });

                challengePositions.set(challenge.id, openPositions);
                openPositions.forEach(p => allMarketIds.add(p.marketId));
            }

            // Fetch live prices from Redis
            const livePrices = await this.batchFetchPrices(Array.from(allMarketIds));

            // Check each challenge
            for (const challenge of activeChallenges) {
                const openPositions = challengePositions.get(challenge.id) || [];
                await this.checkChallenge(challenge, openPositions, livePrices);
            }

        } catch (error: unknown) {
            logger.error('Check error', error instanceof Error ? error : null, { message: error instanceof Error ? error.message : String(error) });
        }
    }

    /**
     * Check a single challenge for breaches
     */
    private async checkChallenge(
        challenge: ChallengeRecord,
        openPositions: PositionRecord[],
        livePrices: Map<string, number>
    ): Promise<void> {
        const startingBalance = parseFloat(challenge.startingBalance);
        const currentBalance = parseFloat(challenge.currentBalance);
        const startOfDayBalance = parseFloat(challenge.startOfDayBalance);
        const rules = challenge.rulesConfig as RulesConfig;

        // Calculate position value (NOT unrealized PnL!)
        // CRITICAL FIX: Must use cash + positionValue, not cash + unrealizedPnL
        // currentBalance already has trade costs deducted, so we need to add back
        // the full position value (shares * price), not just the PnL delta.
        // Example: $5k account, buy 200 shares at $0.50 for $100:
        //   cash = $4,900, positionValue = 200 * $0.50 = $100, equity = $5,000 ✓
        //   WRONG: unrealizedPnL = (0.50-0.50)*200 = $0, equity = $4,900 ✗
        let positionValue = 0;
        for (const pos of openPositions) {
            const livePrice = livePrices.get(pos.marketId);

            const entryPrice = parseFloat(pos.entryPrice);
            const shares = parseFloat(pos.shares);
            const isNo = pos.direction === 'NO';

            // Get effective price for valuation
            let effectivePrice: number;
            if (livePrice !== undefined) {
                // Live price is raw YES price - apply direction adjustment
                effectivePrice = isNo ? (1 - livePrice) : livePrice;
            } else {
                // Fallback: use stored entry price (already direction-adjusted)
                effectivePrice = entryPrice;
                logger.warn('No live price, using entry price', { marketId: pos.marketId.slice(0, 12), entryPrice });
            }

            positionValue += shares * effectivePrice;
        }


        // Calculate equity (current cash balance + total position value)
        const equity = currentBalance + positionValue;

        // DEFENSE-IN-DEPTH: Normalize to guard against decimal-vs-absolute bug.
        const normalized = normalizeRulesConfig(rules as Record<string, unknown>, startingBalance);
        const maxDrawdown = normalized.maxDrawdown;
        const maxDrawdownLimit = startingBalance - maxDrawdown;

        // Check Max Drawdown (HARD BREACH)
        if (equity < maxDrawdownLimit) {
            logger.warn('HARD BREACH: max drawdown', { challengeId: challenge.id, equity, limit: maxDrawdownLimit });
            await this.triggerBreach(challenge, 'max_drawdown', equity, maxDrawdownLimit);
            return;
        }

        // AUDIT FIX: Use percentage-based daily drawdown (matches risk.ts)
        const maxDailyDrawdown = ((rules.maxDailyDrawdownPercent as number) || 0.04) * startingBalance;
        const dailyDrawdownLimit = startOfDayBalance - maxDailyDrawdown;

        // Check Daily Drawdown (HARD BREACH - per cofounder request)
        if (equity < dailyDrawdownLimit) {
            logger.warn('DAILY BREACH: daily drawdown', { challengeId: challenge.id, equity, limit: dailyDrawdownLimit });
            await this.triggerBreach(challenge, 'daily_drawdown', equity, dailyDrawdownLimit);
            return;
        }

        // DEFENSE-IN-DEPTH: Use normalized value (guards against decimal-vs-absolute bug)
        const profitTarget = normalized.profitTarget;
        const targetBalance = startingBalance + profitTarget;

        // Check Profit Target (PASS condition) — only for non-funded phases
        const isFunded = challenge.phase === 'funded';
        if (!isFunded && equity >= targetBalance) {
            logger.info('TARGET HIT: profit target', { challengeId: challenge.id, equity, target: targetBalance });
            await this.triggerPass(challenge, equity, targetBalance);
        }
    }

    /**
     * Trigger a breach (fail the challenge)
     */
    private async triggerBreach(
        challenge: ChallengeRecord,
        breachType: 'max_drawdown' | 'daily_drawdown',
        equity: number,
        limit: number
    ): Promise<void> {
        try {
            // AUDIT FIX: Status guard prevents double-firing on already-failed challenges
            // NOTE: Do NOT overwrite currentBalance with equity — that double-counts
            // unrealized P&L since positions still exist. Keep cash balance as-is.
            const result = await db.update(challenges)
                .set({
                    status: 'failed',
                })
                .where(and(
                    eq(challenges.id, challenge.id),
                    eq(challenges.status, 'active')
                ));

            // If no rows updated, challenge was already failed/passed
            if (!result.rowCount || result.rowCount === 0) {
                logger.info('Challenge already transitioned, skipping breach', { challengeId: challenge.id });
                return;
            }

            // Close all open positions to prevent orphans
            await this.closeAllPositions(challenge.id);

            // Log to audit
            await db.insert(auditLogs).values({
                adminId: 'SYSTEM:RiskMonitor',
                action: 'CHALLENGE_FAILED',
                targetId: challenge.id,
                details: {
                    reason: breachType,
                    equity: equity,
                    limit: limit,
                    timestamp: new Date().toISOString(),
                    detectionMethod: 'real_time_monitoring'
                }
            });

            logger.warn('Challenge FAILED', { challengeId: challenge.id, breachType, equity, limit });

        } catch (error: unknown) {
            logger.error('Failed to trigger breach', error instanceof Error ? error : null, { challengeId: challenge.id, breachType });
        }
    }

    /**
     * Trigger a pass (advance to next phase)
     */
    private async triggerPass(
        challenge: ChallengeRecord,
        equity: number,
        target: number
    ): Promise<void> {
        try {
            const currentPhase = challenge.phase;

            // 1-STEP MODEL: challenge → funded directly (no verification phase)
            // This matches the evaluator and the marketing promise.
            const newPhase = 'funded';
            const newStatus = 'active';

            // Build update payload — full funded reset
            const startingBalance = parseFloat(challenge.startingBalance);
            const tier = startingBalance >= 25000 ? '25k' as const
                : startingBalance >= 10000 ? '10k' as const
                    : '5k' as const;
            const tierRules = FUNDED_RULES[tier];

            const updatePayload: Record<string, unknown> = {
                status: newStatus,
                phase: newPhase,
                currentBalance: startingBalance.toString(),
                highWaterMark: startingBalance.toString(),
                profitSplit: tierRules.profitSplit.toString(),
                payoutCap: tierRules.payoutCap.toString(),
                payoutCycleStart: new Date(),
                activeTradingDays: 0,
                lastActivityAt: new Date(),
                endsAt: null,
            };

            // AUDIT FIX: Status guard prevents race with evaluator
            const result = await db.update(challenges)
                .set(updatePayload)
                .where(and(
                    eq(challenges.id, challenge.id),
                    eq(challenges.status, 'active')
                ));

            // If no rows updated, challenge was already transitioned
            if (!result.rowCount || result.rowCount === 0) {
                logger.info('Challenge already transitioned, skipping pass', { challengeId: challenge.id });
                return;
            }

            // Close all open positions for clean funded transition
            await this.closeAllPositions(challenge.id);

            // Log to audit
            await db.insert(auditLogs).values({
                adminId: 'SYSTEM:RiskMonitor',
                action: 'CHALLENGE_PASSED',
                targetId: challenge.id,
                details: {
                    fromPhase: currentPhase,
                    toPhase: newPhase,
                    equity: equity,
                    target: target,
                    timestamp: new Date().toISOString()
                }
            });

            logger.info('Challenge PASSED', { challengeId: challenge.id, fromPhase: currentPhase, toPhase: 'funded' });

        } catch (error: unknown) {
            logger.error('Failed to trigger pass', error instanceof Error ? error : null, { challengeId: challenge.id });
        }
    }

    /**
     * Close all open positions for a challenge and settle PnL to balance.
     * Used on both breach and pass transitions.
     * 
     * CRITICAL: Previously this only marked positions CLOSED without updating
     * currentBalance, causing orphaned PnL. Now it atomically settles proceeds.
     */
    private async closeAllPositions(challengeId: string): Promise<void> {
        try {
            const openPositions = await db.query.positions.findMany({
                where: and(
                    eq(positions.challengeId, challengeId),
                    eq(positions.status, 'OPEN')
                )
            });

            if (openPositions.length === 0) return;

            const livePrices = await this.batchFetchPrices(
                openPositions.map(p => p.marketId)
            );

            const now = new Date();
            let totalProceeds = 0;

            for (const pos of openPositions) {
                const livePrice = livePrices.get(pos.marketId);
                const entryPrice = parseFloat(pos.entryPrice);
                const shares = parseFloat(pos.shares);
                const isNo = pos.direction === 'NO';

                // Live price is raw YES — adjust for NO direction
                const closePrice = livePrice !== undefined
                    ? (isNo ? 1 - livePrice : livePrice)
                    : parseFloat(pos.currentPrice || pos.entryPrice);

                const pnl = shares * (closePrice - entryPrice);
                const proceeds = shares * closePrice;
                totalProceeds += proceeds;

                await db.update(positions)
                    .set({
                        status: 'CLOSED',
                        shares: '0',
                        closedAt: now,
                        closedPrice: closePrice.toString(),
                        pnl: pnl.toFixed(2),
                    })
                    .where(eq(positions.id, pos.id));
            }

            // CRITICAL: Settle proceeds to currentBalance
            // Cash was deducted when positions were opened (BUY → deductCost).
            // Now we credit back the liquidation value (shares × closePrice).
            if (totalProceeds > 0) {
                const [challenge] = await db.select()
                    .from(challenges)
                    .where(eq(challenges.id, challengeId));

                if (challenge) {
                    const currentBalance = parseFloat(challenge.currentBalance);
                    const newBalance = currentBalance + totalProceeds;
                    await db.update(challenges)
                        .set({ currentBalance: newBalance.toFixed(2) })
                        .where(eq(challenges.id, challengeId));

                    logger.info('Settled PnL to balance', {
                        challengeId: challengeId.slice(0, 8),
                        cashBefore: currentBalance.toFixed(2),
                        proceeds: totalProceeds.toFixed(2),
                        cashAfter: newBalance.toFixed(2),
                    });
                }
            }

            logger.info('Closed positions', { challengeId: challengeId.slice(0, 8), count: openPositions.length, totalProceeds: totalProceeds.toFixed(2) });
        } catch (error: unknown) {
            logger.error('Failed to close positions', error instanceof Error ? error : null, { challengeId: challengeId.slice(0, 8) });
        }
    }

    /**
     * Batch fetch prices from Redis - reads from single consolidated key
     */
    private async batchFetchPrices(marketIds: string[]): Promise<Map<string, number>> {
        const prices = new Map<string, number>();
        if (marketIds.length === 0) return prices;

        try {
            // COST OPTIMIZATION: Read from single key instead of 300+ individual keys
            // This is 1 Redis command instead of ~300!
            const data = await this.redis.get('market:prices:all');
            if (!data) return prices;

            const allPrices = JSON.parse(data);
            for (const id of marketIds) {
                if (allPrices[id]) {
                    const parsed = allPrices[id];
                    prices.set(id, parseFloat(parsed.price || parsed.mid || '0'));
                }
            }
        } catch (error: unknown) {
            logger.error('Price fetch error', error instanceof Error ? error : null);
        }

        return prices;
    }
}
