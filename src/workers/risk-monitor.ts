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
import { db, dbPool } from "../db";
import { challenges, positions, auditLogs, trades } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { FUNDED_RULES } from "../lib/funded-rules";
import { normalizeRulesConfig } from "../lib/normalize-rules";
import { createLogger } from "../lib/logger";
import { BalanceManager } from "../lib/trading/BalanceManager";
import { getDirectionAdjustedPrice } from "../lib/position-utils";
import { MarketService } from "../lib/market";
import { safeParseFloat } from "../lib/safe-parse";
import { type Transaction } from "../db/types";

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
            // HEARTBEAT: Write timestamp so the app can detect if this worker dies
            await this.redis.set('worker:risk-monitor:heartbeat', Date.now().toString(), 'EX', 120);

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
        // Daily DD baseline: equity at midnight. Falls back to cash-only for pre-migration accounts.
        const startOfDayEquityRaw = challenge.startOfDayEquity ? parseFloat(challenge.startOfDayEquity) : NaN;
        const dailyDrawdownBaseline = !isNaN(startOfDayEquityRaw) && startOfDayEquityRaw > 0 ? startOfDayEquityRaw : startOfDayBalance;
        const rules = challenge.rulesConfig as RulesConfig;
        const isFunded = challenge.phase === 'funded';

        // Calculate position value (NOT unrealized PnL!)
        // CRITICAL FIX: Must use cash + positionValue, not cash + unrealizedPnL
        // currentBalance already has trade costs deducted, so we need to add back
        // the full position value (shares * price), not just the PnL delta.
        // Example: $5k account, buy 200 shares at $0.50 for $100:
        //   cash = $4,900, positionValue = 200 * $0.50 = $100, equity = $5,000 ✓
        //   WRONG: unrealizedPnL = (0.50-0.50)*200 = $0, equity = $4,900 ✗
        // FAIL CLOSED: If we can't price positions, we can't assess risk.
        // Unknown equity is NOT safe equity — skip this challenge entirely.
        if (openPositions.length > 0) {
            const missingPrices = openPositions.filter(p => !livePrices.has(p.marketId));
            if (missingPrices.length > 0) {
                logger.error('HALT: Missing live prices for open positions — cannot compute equity', {
                    challengeId: challenge.id,
                    missing: missingPrices.length,
                    total: openPositions.length,
                    missingMarkets: missingPrices.map(p => p.marketId.slice(0, 12)),
                });
                return; // Do NOT continue with incomplete data
            }
        }

        let positionValue = 0;
        for (const pos of openPositions) {
            const livePrice = livePrices.get(pos.marketId)!; // Safe: guarded above
            const shares = parseFloat(pos.shares);
            const direction = (pos.direction as 'YES' | 'NO') || 'YES';

            // SINGLE SOURCE OF TRUTH: Use canonical direction adjustment
            const effectivePrice = getDirectionAdjustedPrice(livePrice, direction);
            positionValue += shares * effectivePrice;
        }


        // Calculate equity (current cash balance + total position value)
        const equity = currentBalance + positionValue;

        // FUNDED vs CHALLENGE: Use different drawdown rules
        // Funded accounts use static drawdown from FUNDED_RULES (more lenient).
        // Challenge accounts use stored rulesConfig with normalization guard.
        let maxDrawdown: number;
        let maxDailyDrawdown: number;
        let profitTarget: number;

        if (isFunded) {
            // Funded phase: Use tier-specific static rules
            const tier = startingBalance >= 25000 ? '25k' as const
                : startingBalance >= 10000 ? '10k' as const
                    : '5k' as const;
            const fundedRules = FUNDED_RULES[tier];

            maxDrawdown = fundedRules.maxTotalDrawdown;          // Static from initial balance
            // Dynamic daily limit = percent × dailyDrawdownBaseline (equity at midnight, grows with profits)
            // Must match evaluator.ts — split-brain between these two is a critical bug.
            maxDailyDrawdown = fundedRules.maxDailyDrawdownPercent * dailyDrawdownBaseline;
            profitTarget = Infinity;                              // No profit target in funded phase
        } else {
            // Challenge phase: Use stored rules with normalization guard
            const normalized = normalizeRulesConfig(rules as Record<string, unknown>, startingBalance);
            maxDrawdown = normalized.maxDrawdown;
            maxDailyDrawdown = ((rules.maxDailyDrawdownPercent as number) || 0.04) * startingBalance;
            profitTarget = normalized.profitTarget;
        }

        const maxDrawdownLimit = startingBalance - maxDrawdown;

        // Check Max Drawdown (HARD BREACH)
        if (equity < maxDrawdownLimit) {
            logger.warn('HARD BREACH: max drawdown', { challengeId: challenge.id, equity, limit: maxDrawdownLimit, phase: isFunded ? 'funded' : 'challenge' });
            await this.triggerBreach(challenge, 'max_drawdown', equity, maxDrawdownLimit);
            return;
        }

        const dailyDrawdownLimit = dailyDrawdownBaseline - maxDailyDrawdown;

        // Check Daily Drawdown (HARD BREACH - per cofounder request)
        if (equity < dailyDrawdownLimit) {
            logger.warn('DAILY BREACH: daily drawdown', { challengeId: challenge.id, equity, limit: dailyDrawdownLimit, phase: isFunded ? 'funded' : 'challenge' });
            await this.triggerBreach(challenge, 'daily_drawdown', equity, dailyDrawdownLimit);
            return;
        }

        // Check Profit Target (PASS condition) — only for non-funded phases
        const targetBalance = startingBalance + profitTarget;
        if (!isFunded && equity >= targetBalance) {
            logger.info('TARGET HIT: profit target', { challengeId: challenge.id, equity, target: targetBalance });
            await this.triggerPass(challenge, equity, targetBalance);
        }
    }

    /**
     * Trigger a breach (fail the challenge)
     * TRANSACTION SAFETY: status update + position closes + audit log are atomic.
     * If any step fails, everything rolls back — no orphaned states.
     */
    private async triggerBreach(
        challenge: ChallengeRecord,
        breachType: 'max_drawdown' | 'daily_drawdown',
        equity: number,
        limit: number
    ): Promise<void> {
        try {
            // Fetch live prices BEFORE the transaction (Redis is not transactional)
            const openPositions = await db.query.positions.findMany({
                where: and(
                    eq(positions.challengeId, challenge.id),
                    eq(positions.status, 'OPEN')
                )
            });
            const livePrices = await this.batchFetchPrices(openPositions.map(p => p.marketId));

            await dbPool.transaction(async (tx) => {
                // 1. Status guard prevents double-firing on already-failed challenges
                // endsAt mirrors evaluator.ts breach path (line 135) — both must set this
                // so audit queries for "when did this challenge end?" return a real timestamp.
                // Confirmed gap: $10K challenge (056d254d) has endsAt=null in production.
                const result = await tx.update(challenges)
                    .set({ status: 'failed', endsAt: new Date() })
                    .where(and(
                        eq(challenges.id, challenge.id),
                        eq(challenges.status, 'active')
                    ));

                if (!(result as unknown as { rowCount: number }).rowCount) {
                    return;
                }

                // 2. Close all positions + settle proceeds (atomic)
                await this.closeAllPositions(tx, challenge.id, openPositions, livePrices, 'breach_liquidation');

                // 3. Audit log
                await tx.insert(auditLogs).values({
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
            });

            logger.warn('Challenge FAILED', { challengeId: challenge.id, breachType, equity, limit });

        } catch (error: unknown) {
            logger.error('Failed to trigger breach', error instanceof Error ? error : null, { challengeId: challenge.id, breachType });
        }
    }

    /**
     * Trigger a pass (advance to next phase)
     * TRANSACTION SAFETY: status update + position closes + audit log are atomic.
     */
    private async triggerPass(
        challenge: ChallengeRecord,
        equity: number,
        target: number
    ): Promise<void> {
        try {
            const currentPhase = challenge.phase;

            // Fetch live prices BEFORE the transaction (Redis is not transactional)
            const openPositions = await db.query.positions.findMany({
                where: and(
                    eq(positions.challengeId, challenge.id),
                    eq(positions.status, 'OPEN')
                )
            });
            const livePrices = await this.batchFetchPrices(openPositions.map(p => p.marketId));

            // 1-STEP MODEL: challenge → funded directly (no verification phase)
            const startingBalance = parseFloat(challenge.startingBalance);
            const tier = startingBalance >= 25000 ? '25k' as const
                : startingBalance >= 10000 ? '10k' as const
                    : '5k' as const;
            const tierRules = FUNDED_RULES[tier];

            await dbPool.transaction(async (tx) => {
                const updatePayload: Record<string, unknown> = {
                    status: 'active',
                    phase: 'funded',
                    currentBalance: startingBalance.toString(),
                    highWaterMark: startingBalance.toString(),
                    profitSplit: tierRules.profitSplit.toString(),
                    payoutCap: tierRules.payoutCap.toString(),
                    payoutCycleStart: new Date(),
                    activeTradingDays: 0,
                    lastActivityAt: new Date(),
                    endsAt: null,
                    // Reset SOD fields so daily PnL displays correctly from transition time.
                    // Matches the same fix in evaluator.ts — both paths must initialize these.
                    startOfDayBalance: startingBalance.toString(),
                    startOfDayEquity: startingBalance.toString(),
                };

                // Status guard + PHASE guard prevents race with evaluator's triggerPass.
                // Without the phase guard, the evaluator transitions phase to 'funded' but status
                // remains 'active'. The risk-monitor's next loop would match status='active' again,
                // close positions a second time, and corrupt the balance.
                const result = await tx.update(challenges)
                    .set(updatePayload)
                    .where(and(
                        eq(challenges.id, challenge.id),
                        eq(challenges.status, 'active'),
                        eq(challenges.phase, 'challenge')
                    ));

                if (!(result as unknown as { rowCount: number }).rowCount) {
                    return;
                }

                // Close all positions + settle proceeds (atomic)
                await this.closeAllPositions(tx, challenge.id, openPositions, livePrices, 'pass_liquidation');

                // CRITICAL: Reset balance AFTER closing positions.
                // closeAllPositions credits liquidation proceeds to currentBalance,
                // but funded phase must start fresh at startingBalance.
                // Without this reset, funded traders start with
                // startingBalance + proceeds = inflated balance.
                // Mirrors evaluator.ts line 381 which also calls resetBalance.
                await BalanceManager.resetBalance(
                    tx, challenge.id, startingBalance, 'funded_transition'
                );

                // Audit log
                await tx.insert(auditLogs).values({
                    adminId: 'SYSTEM:RiskMonitor',
                    action: 'CHALLENGE_PASSED',
                    targetId: challenge.id,
                    details: {
                        fromPhase: currentPhase,
                        toPhase: 'funded',
                        equity: equity,
                        target: target,
                        timestamp: new Date().toISOString()
                    }
                });
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
     * TRANSACTION SAFETY: Runs inside the caller's transaction.
     * All position closes + balance credit are atomic — if any step fails,
     * everything rolls back. Uses BalanceManager for forensic logging.
     */
    private async closeAllPositions(
        tx: Transaction,
        challengeId: string,
        openPositions: PositionRecord[],
        livePrices: Map<string, number>,
        closureReason: 'breach_liquidation' | 'pass_liquidation' = 'breach_liquidation'
    ): Promise<void> {
        if (openPositions.length === 0) return;

        const now = new Date();
        let totalProceeds = 0;

        for (const pos of openPositions) {
            const livePrice = livePrices.get(pos.marketId);
            const entryPrice = parseFloat(pos.entryPrice);
            const shares = parseFloat(pos.shares);
            const direction = (pos.direction as 'YES' | 'NO') || 'YES';

            // SINGLE SOURCE OF TRUTH: Use canonical direction adjustment
            const closePrice = livePrice !== undefined
                ? getDirectionAdjustedPrice(livePrice, direction)
                : parseFloat(pos.currentPrice || pos.entryPrice);

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

            // AUDIT TRAIL: Create SELL trade record so liquidation PnL is visible in trade history
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
                closureReason: closureReason,
                executedAt: now,
            });
        }

        // CRITICAL: Settle proceeds to currentBalance via BalanceManager
        // Cash was deducted when positions were opened (BUY → deductCost).
        // Now we credit back the liquidation value (shares × closePrice).
        if (totalProceeds > 0) {
            await BalanceManager.creditProceeds(
                tx, challengeId, totalProceeds, 'position_liquidation'
            );
        }

        logger.info('Closed positions', { challengeId: challengeId.slice(0, 8), count: openPositions.length, totalProceeds: totalProceeds.toFixed(2) });
    }

    /**
     * Batch fetch prices using the SAME chain as the dashboard.
     *
     * INCIDENT 2026-03-04: Custom WS-first pricing was a dead letter — the WS
     * stream has been non-functional, so the risk monitor never had prices and
     * never detected breaches. Mat's account breached 133% daily drawdown
     * without being auto-failed.
     *
     * FIX: Delegate to MarketService.getBatchOrderBookPrices() which uses:
     *   1. Order book mid-price (best bid + best ask / 2)
     *   2. Event list price fallback
     *   3. Gamma API price fallback
     * This is the exact chain the dashboard uses — if the dashboard can show
     * a breach, the risk monitor WILL catch it.
     */
    private async batchFetchPrices(marketIds: string[]): Promise<Map<string, number>> {
        const prices = new Map<string, number>();
        if (marketIds.length === 0) return prices;

        try {
            const marketPrices = await MarketService.getBatchOrderBookPrices(marketIds);

            for (const [id, mp] of marketPrices) {
                const price = safeParseFloat(mp.price);
                if (price > 0) {
                    prices.set(id, price);
                }
            }

            // Log coverage for monitoring
            const missing = marketIds.length - prices.size;
            if (missing > 0) {
                logger.error('Price gap after MarketService chain', {
                    resolved: prices.size,
                    missing,
                    total: marketIds.length,
                    missingIds: marketIds.filter(id => !prices.has(id)).map(id => id.slice(0, 12)),
                });
            }
        } catch (error: unknown) {
            logger.error('Price fetch error', error instanceof Error ? error : null);
        }

        return prices;
    }
}
