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

interface ChallengeRiskState {
    challengeId: string;
    userId: string;
    currentBalance: number;
    startingBalance: number;
    startOfDayBalance: number;
    maxDrawdownPercent: number;
    maxDailyDrawdownPercent: number;
    openPositions: Array<{
        marketId: string;
        direction: 'YES' | 'NO';
        shares: number;
        entryPrice: number;
    }>;
}

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

        console.log('[RiskMonitor] 🛡️ Starting real-time breach monitoring (5s interval)...');
        this.isRunning = true;

        // Initial check
        this.checkAllChallenges();

        // Continuous monitoring
        this.checkInterval = setInterval(() => {
            this.checkAllChallenges();
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
        console.log('[RiskMonitor] Stopped.');
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
            const challengePositions = new Map<string, any[]>();

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

        } catch (error: any) {
            console.error('[RiskMonitor] Check error:', error.message);
        }
    }

    /**
     * Check a single challenge for breaches
     */
    private async checkChallenge(
        challenge: any,
        openPositions: any[],
        livePrices: Map<string, number>
    ): Promise<void> {
        const startingBalance = parseFloat(challenge.startingBalance);
        const currentBalance = parseFloat(challenge.currentBalance);
        const startOfDayBalance = parseFloat(challenge.startOfDayBalance);
        const rules = challenge.rulesConfig as any;

        // Calculate unrealized P&L from open positions
        let unrealizedPnL = 0;
        for (const pos of openPositions) {
            const livePrice = livePrices.get(pos.marketId);
            if (livePrice === undefined) continue;

            const entryPrice = parseFloat(pos.entryPrice);
            const shares = parseFloat(pos.shares);
            const isNo = pos.direction === 'NO';

            // Current price from live feed is raw YES price - needs direction adjustment
            const effectiveCurrentValue = isNo ? (1 - livePrice) : livePrice;

            // Entry price is ALREADY direction-adjusted when stored in DB (see trade.ts line 175-177)
            // DO NOT adjust it again - that causes double-adjustment bug!
            const effectiveEntryValue = entryPrice;

            unrealizedPnL += (effectiveCurrentValue - effectiveEntryValue) * shares;
        }


        // Calculate equity (current balance + unrealized P&L)
        const equity = currentBalance + unrealizedPnL;

        // Check Max Drawdown (HARD BREACH)
        const maxDrawdownLimit = startingBalance * (1 - (rules.maxDrawdown / 100));
        if (equity < maxDrawdownLimit) {
            console.log(`[RiskMonitor] 🔴 HARD BREACH: Challenge ${challenge.id} equity $${equity.toFixed(2)} < limit $${maxDrawdownLimit.toFixed(2)}`);
            await this.triggerBreach(challenge, 'max_drawdown', equity, maxDrawdownLimit);
            return;
        }

        // Check Daily Drawdown (HARD BREACH - per cofounder request)
        const dailyDrawdownLimit = startOfDayBalance * (1 - (rules.maxDailyDrawdown / 100));
        if (equity < dailyDrawdownLimit) {
            console.log(`[RiskMonitor] 🔴 DAILY BREACH: Challenge ${challenge.id} equity $${equity.toFixed(2)} < daily limit $${dailyDrawdownLimit.toFixed(2)}`);
            await this.triggerBreach(challenge, 'daily_drawdown', equity, dailyDrawdownLimit);
            return;
        }

        // Check Profit Target (PASS condition)
        const targetBalance = startingBalance * (1 + (rules.profitTarget / 100));
        if (equity >= targetBalance) {
            console.log(`[RiskMonitor] 🟢 TARGET HIT: Challenge ${challenge.id} equity $${equity.toFixed(2)} >= target $${targetBalance.toFixed(2)}`);
            await this.triggerPass(challenge, equity, targetBalance);
        }
    }

    /**
     * Trigger a breach (fail the challenge)
     */
    private async triggerBreach(
        challenge: any,
        breachType: 'max_drawdown' | 'daily_drawdown',
        equity: number,
        limit: number
    ): Promise<void> {
        try {
            // Update challenge status to failed
            await db.update(challenges)
                .set({
                    status: 'failed',
                    currentBalance: equity.toString() // Store final equity
                })
                .where(eq(challenges.id, challenge.id));

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

            console.log(`[RiskMonitor] ❌ Challenge ${challenge.id} FAILED (${breachType})`);

        } catch (error: any) {
            console.error(`[RiskMonitor] Failed to trigger breach:`, error.message);
        }
    }

    /**
     * Trigger a pass (advance to next phase)
     */
    private async triggerPass(
        challenge: any,
        equity: number,
        target: number
    ): Promise<void> {
        try {
            const currentPhase = challenge.phase;
            let newPhase = currentPhase;
            let newStatus = 'passed';

            // Determine next phase
            if (currentPhase === 'challenge') {
                newPhase = 'verification';
                newStatus = 'active'; // Verification starts immediately
            } else if (currentPhase === 'verification') {
                newPhase = 'funded';
                newStatus = 'active';
            }

            await db.update(challenges)
                .set({
                    status: newStatus,
                    phase: newPhase,
                    currentBalance: equity.toString()
                })
                .where(eq(challenges.id, challenge.id));

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

            console.log(`[RiskMonitor] ✅ Challenge ${challenge.id} PASSED (${currentPhase} → ${newPhase})`);

        } catch (error: any) {
            console.error(`[RiskMonitor] Failed to trigger pass:`, error.message);
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
        } catch (error: any) {
            console.error('[RiskMonitor] Price fetch error:', error.message);
        }

        return prices;
    }
}
