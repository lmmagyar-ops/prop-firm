/**
 * Arbitrage Sentinel (Circuit Breaker)
 * 
 * Protects against latency arbitrage by detecting when prices diverge
 * rapidly across platforms (Polymarket/Kalshi) - typically due to breaking news.
 * 
 * When detected:
 * 1. Freezes trading on affected markets for 30 seconds
 * 2. Allows prices to converge before execution resumes
 * 
 * @module ArbitrageSentinel
 */

import Redis from "ioredis";

// ============================================================================
// Types
// ============================================================================

interface PriceSnapshot {
    price: number;
    timestamp: number;
}

interface CircuitBreakerStatus {
    frozen: boolean;
    reason?: string;
    frozenAt?: number;
    expiresAt?: number;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
    // Price divergence threshold (5% move in 1 second triggers freeze)
    DIVERGENCE_THRESHOLD: 0.05,
    TIME_WINDOW_MS: 1000,

    // Freeze duration
    FREEZE_DURATION_SECONDS: 30,

    // Redis key prefix
    REDIS_PREFIX: 'circuit_breaker:',
    PRICE_HISTORY_PREFIX: 'price_history:',
};

// ============================================================================
// Arbitrage Sentinel
// ============================================================================

export class ArbitrageSentinel {
    private redis: Redis;

    constructor(redis: Redis) {
        this.redis = redis;
    }

    /**
     * Check if a market is currently frozen.
     * Called by TradeExecutor before executing trades.
     */
    async isMarketFrozen(marketId: string): Promise<CircuitBreakerStatus> {
        const key = `${CONFIG.REDIS_PREFIX}${marketId}`;
        const data = await this.redis.get(key);

        if (!data) {
            return { frozen: false };
        }

        try {
            const parsed = JSON.parse(data);
            return {
                frozen: true,
                reason: parsed.reason,
                frozenAt: parsed.frozenAt,
                expiresAt: parsed.expiresAt,
            };
        } catch {
            return { frozen: true, reason: 'Circuit breaker active' };
        }
    }

    /**
     * Record a price update and check for rapid movement.
     * Called by ingestion worker on every price update.
     */
    async recordPriceUpdate(
        marketId: string,
        platform: 'polymarket' | 'kalshi',
        newPrice: number
    ): Promise<boolean> {
        const historyKey = `${CONFIG.PRICE_HISTORY_PREFIX}${platform}:${marketId}`;
        const now = Date.now();

        // Get last price
        const lastSnapshot = await this.redis.get(historyKey);

        if (lastSnapshot) {
            try {
                const parsed: PriceSnapshot = JSON.parse(lastSnapshot);
                const timeDelta = now - parsed.timestamp;
                const priceDelta = Math.abs(newPrice - parsed.price);

                // Check for rapid movement (5% in 1 second)
                if (timeDelta <= CONFIG.TIME_WINDOW_MS && priceDelta >= CONFIG.DIVERGENCE_THRESHOLD) {
                    await this.triggerCircuitBreaker(
                        marketId,
                        `Rapid price movement: ${(parsed.price * 100).toFixed(0)}¢ → ${(newPrice * 100).toFixed(0)}¢ in ${timeDelta}ms`
                    );
                    return true; // Circuit breaker triggered
                }
            } catch {
                // Invalid data, continue
            }
        }

        // Store new snapshot
        const snapshot: PriceSnapshot = { price: newPrice, timestamp: now };
        await this.redis.set(historyKey, JSON.stringify(snapshot), 'EX', 60); // 1 min TTL

        return false;
    }

    /**
     * Compare prices across platforms for same event.
     * Triggers circuit breaker if significant divergence detected.
     */
    async checkCrossPlatformDivergence(
        eventId: string,
        polymarketPrice: number,
        kalshiPrice: number
    ): Promise<boolean> {
        const divergence = Math.abs(polymarketPrice - kalshiPrice);

        if (divergence >= CONFIG.DIVERGENCE_THRESHOLD) {
            await this.triggerCircuitBreaker(
                eventId,
                `Cross-platform divergence: Polymarket ${(polymarketPrice * 100).toFixed(0)}¢ vs Kalshi ${(kalshiPrice * 100).toFixed(0)}¢ (diff: ${(divergence * 100).toFixed(0)}¢)`
            );
            return true;
        }

        return false;
    }

    /**
     * Trigger circuit breaker for a market.
     */
    private async triggerCircuitBreaker(marketId: string, reason: string): Promise<void> {
        const key = `${CONFIG.REDIS_PREFIX}${marketId}`;
        const now = Date.now();

        const data = {
            reason,
            frozenAt: now,
            expiresAt: now + (CONFIG.FREEZE_DURATION_SECONDS * 1000),
        };

        await this.redis.set(
            key,
            JSON.stringify(data),
            'EX',
            CONFIG.FREEZE_DURATION_SECONDS
        );

        console.log(`[ArbitrageSentinel] 🔒 CIRCUIT BREAKER TRIGGERED for ${marketId.slice(0, 16)}...`);
        console.log(`[ArbitrageSentinel]    Reason: ${reason}`);
        console.log(`[ArbitrageSentinel]    Frozen for ${CONFIG.FREEZE_DURATION_SECONDS}s`);
    }

    /**
     * Manually clear a circuit breaker (admin action).
     */
    async clearCircuitBreaker(marketId: string): Promise<void> {
        const key = `${CONFIG.REDIS_PREFIX}${marketId}`;
        await this.redis.del(key);
        console.log(`[ArbitrageSentinel] 🔓 Circuit breaker cleared for ${marketId}`);
    }
}

// ============================================================================
// Singleton for easy import
// ============================================================================

let _sentinel: ArbitrageSentinel | null = null;

export function getArbitrageSentinel(redis: Redis): ArbitrageSentinel {
    if (!_sentinel) {
        _sentinel = new ArbitrageSentinel(redis);
    }
    return _sentinel;
}
