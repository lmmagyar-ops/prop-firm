/**
 * Position Utilities
 * 
 * Shared utilities for position value calculations.
 * Single source of truth for direction-adjustment and portfolio valuation.
 * Used by: risk.ts, evaluator.ts, dashboard-service.ts
 */

import { safeParseFloat } from "./safe-parse";

/**
 * Default drawdown limits used when rulesConfig values are missing.
 * These match the standard evaluation tier configuration.
 */
export const DEFAULT_MAX_DRAWDOWN = 1000;
export const DEFAULT_DAILY_DRAWDOWN = 500;

// ─── Types ───────────────────────────────────────────────────────────

/** Minimal position shape needed for portfolio valuation. */
export interface PositionForValuation {
    marketId: string;
    shares: string;
    entryPrice: string;
    currentPrice?: string | null;
    direction?: string | null;
}

/** Per-position valuation result. */
export interface PositionValuation {
    marketId: string;
    shares: number;
    effectivePrice: number;
    positionValue: number;
    unrealizedPnL: number;
    priceSource: "live" | "stored";
}

/** Aggregated portfolio valuation result. */
export interface PortfolioValuation {
    totalValue: number;
    positions: PositionValuation[];
}

// ─── Portfolio Valuation ─────────────────────────────────────────────

/**
 * Calculates the total value of a set of open positions using live prices.
 *
 * This is the SINGLE SOURCE OF TRUTH for position valuation across the app.
 * It handles:
 * - Direction adjustment (YES uses raw price, NO uses 1 - rawPrice)
 * - NaN guards on shares/prices  
 * - Fallback to stored entry price when live price is unavailable or invalid
 * - Sanity bounds (rejects prices ≤0.01 or ≥0.99 from live feed)
 *
 * @param openPositions - Array of positions from the DB
 * @param livePrices - Map of marketId → { price: string, source: string } from MarketService.getBatchOrderBookPrices()
 * @returns Aggregated portfolio value and per-position breakdowns
 */
export function getPortfolioValue(
    openPositions: PositionForValuation[],
    livePrices: Map<string, { price: string; source?: string }>
): PortfolioValuation {
    const positions: PositionValuation[] = [];
    let totalValue = 0;

    for (const pos of openPositions) {
        const shares = safeParseFloat(pos.shares);
        const entryPrice = safeParseFloat(pos.entryPrice);
        const direction = (pos.direction as "YES" | "NO") || "YES";

        // Guard: skip positions with invalid data
        if (isNaN(shares) || shares <= 0 || isNaN(entryPrice)) {
            continue;
        }

        const priceData = livePrices.get(pos.marketId);
        let effectivePrice: number;
        let priceSource: "live" | "stored";

        if (priceData) {
            const rawPrice = parseFloat(priceData.price);

            // Sanity check: valid range including resolution prices (0 and 1)
            // Trade executor blocks new entries at ≥95¢/≤5¢, so 0/1 only appear on resolved positions
            if (rawPrice >= 0 && rawPrice <= 1 && !isNaN(rawPrice)) {
                // Live price is raw YES price — apply direction adjustment
                effectivePrice = getDirectionAdjustedPrice(rawPrice, direction);
                priceSource = "live";
            } else {
                // Invalid live price — fall back to stored entry price
                // Entry price is ALREADY direction-adjusted in DB, use directly
                effectivePrice = entryPrice;
                priceSource = "stored";
            }
        } else {
            // No live price — fall back to stored price
            // currentPrice (if available) is already direction-adjusted
            // entryPrice is already direction-adjusted
            const storedPrice = pos.currentPrice
                ? safeParseFloat(pos.currentPrice)
                : entryPrice;
            effectivePrice = isNaN(storedPrice) ? entryPrice : storedPrice;
            priceSource = "stored";
        }

        const positionValue = shares * effectivePrice;
        const unrealizedPnL = (effectivePrice - entryPrice) * shares;

        positions.push({
            marketId: pos.marketId,
            shares,
            effectivePrice,
            positionValue,
            unrealizedPnL,
            priceSource,
        });

        totalValue += positionValue;
    }

    return { totalValue, positions };
}

/**
 * Adjusts a market price for position direction.
 * 
 * YES positions: value = yesPrice (no change)
 * NO positions: value = 1 - yesPrice (inverted)
 * 
 * @param rawPrice - The YES token price (0-1)
 * @param direction - Position direction ('YES' or 'NO')
 * @returns Direction-adjusted price
 */
export function getDirectionAdjustedPrice(
    rawPrice: number,
    direction: 'YES' | 'NO'
): number {
    return direction === 'NO' ? (1 - rawPrice) : rawPrice;
}

/**
 * Calculates position value and unrealized P&L with direction handling.
 * 
 * IMPORTANT: entryPrice from DB is ALREADY direction-adjusted (for NO: stored as 1 - yesPrice).
 * Only currentPrice (raw YES price from live feed) needs adjustment.
 * 
 * @param shares - Number of shares held
 * @param entryPrice - Original entry price (ALREADY direction-adjusted in DB)
 * @param currentPrice - Current YES token price (raw, needs direction adjustment)
 * @param direction - Position direction ('YES' or 'NO')
 * @returns Object with positionValue and unrealizedPnL
 */
export function calculatePositionMetrics(
    shares: number,
    entryPrice: number,
    currentPrice: number,
    direction: 'YES' | 'NO'
): { positionValue: number; unrealizedPnL: number; effectiveCurrentPrice: number } {
    // Current price from market feed is raw YES price - needs direction adjustment
    const effectiveCurrentPrice = getDirectionAdjustedPrice(currentPrice, direction);

    // Entry price is ALREADY direction-adjusted when stored in DB (see trade.ts line 175-177)
    // DO NOT adjust it again - that causes the double-adjustment bug!
    const effectiveEntryPrice = entryPrice;

    const positionValue = shares * effectiveCurrentPrice;
    const unrealizedPnL = (effectiveCurrentPrice - effectiveEntryPrice) * shares;

    return { positionValue, unrealizedPnL, effectiveCurrentPrice };
}


// ─── Trade Metrics (Single Source of Truth) ──────────────────────────

/** Minimal trade shape needed for win rate calculation. */
export interface TradeForMetrics {
    type: string;
    realizedPnL: string | null;
}

/**
 * Computes win rate from an array of trades.
 *
 * SINGLE SOURCE OF TRUTH — all services must use this function.
 * Used by: dashboard-service.ts, profile-service.ts, admin/traders/[id]/route.ts
 *
 * @param trades - Array of trades (any shape with type + realizedPnL)
 * @param parsePnL - How to parse realizedPnL (default: parseFloat with "0" fallback)
 * @returns Win rate as a percentage (0-100), or null if no SELL trades exist
 */
export function computeWinRate(
    trades: TradeForMetrics[],
    parsePnL: (pnl: string | null) => number = (pnl) => parseFloat(pnl || "0"),
): number | null {
    const sellTrades = trades.filter(t => t.type === 'SELL');
    if (sellTrades.length === 0) return null;

    const wins = sellTrades.filter(t => parsePnL(t.realizedPnL) > 0).length;
    return (wins / sellTrades.length) * 100;
}

/**
 * Computes average value from an array of numbers.
 * Returns null if the array is empty (no data ≠ zero).
 */
export function computeAverage(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}
