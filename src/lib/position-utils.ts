/**
 * Position Utilities
 * 
 * Shared utilities for position value calculations.
 * Single source of truth for direction-adjustment and portfolio valuation.
 * Used by: risk.ts, evaluator.ts, dashboard-service.ts
 */

import { safeParseFloat } from "./safe-parse";
import { isValidMarketPrice } from "./price-validation";

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

            // SINGLE SOURCE OF TRUTH: Use canonical price validator from price-validation.ts
            if (isValidMarketPrice(rawPrice)) {
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

