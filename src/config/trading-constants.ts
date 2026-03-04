/**
 * Trading Constants — Shared across ingestion and risk engine
 * 
 * These constants define platform-wide trading boundaries.
 * The ingestion worker uses them to filter what markets enter the system,
 * and the risk engine uses them as a last-resort trade-time guard.
 * 
 * IMPORTANT: If you change MIN_MARKET_VOLUME, markets below the new
 * threshold will stop appearing in the trade grid after the next
 * ingestion cycle (~5 minutes). Existing open positions are unaffected.
 */

/**
 * Minimum total volume (USD) for a market to be tradeable.
 * Markets below this threshold are filtered out at ingestion time
 * AND blocked by the risk engine at trade time (defense in depth).
 * 
 * This value matches `minMarketVolume` in tiers.ts — if tiers ever
 * diverge (e.g., higher-tier accounts get access to lower-volume markets),
 * update the ingestion filter to use the LOWEST tier's threshold.
 */
export const MIN_MARKET_VOLUME = parseInt(process.env.MIN_MARKET_VOLUME || '100000', 10);

/**
 * Max per-trade exposure for hourly crypto "Up or Down" markets.
 * These are short-lived (1h), lower-liquidity markets — Mat's directive caps
 * them at 1% of starting balance vs the normal 5% per-event limit.
 *
 * Used by risk.ts to override maxPositionSizePercent for markets
 * detected as hourly crypto (via category + question pattern).
 */
export const HOURLY_CRYPTO_MAX_POSITION_PERCENT = 0.01; // 1% of balance
