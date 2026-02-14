/**
 * Single source of truth for market price validation.
 *
 * Valid market prices are in the range [0, 1] inclusive:
 *   - 0 = resolved NO (YES side lost)
 *   - 1 = resolved YES (YES side won)
 *   - (0, 1) = active market
 *
 * This function replaces 10+ scattered inline checks that drifted
 * over time (some used > 0, some > 0.01, etc.), causing silent
 * display bugs for resolved markets.
 */
export function isValidMarketPrice(price: number): boolean {
    return Number.isFinite(price) && price >= 0 && price <= 1;
}
