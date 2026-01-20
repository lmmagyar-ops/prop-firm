/**
 * Position Utilities
 * 
 * Shared utilities for position value calculations.
 * Centralizes direction-adjustment logic to avoid duplication.
 */

/**
 * Default drawdown limits used when rulesConfig values are missing.
 * These match the standard evaluation tier configuration.
 */
export const DEFAULT_MAX_DRAWDOWN = 1000;
export const DEFAULT_DAILY_DRAWDOWN = 500;

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

