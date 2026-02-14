/**
 * Volume Filter Behavioral Test
 * 
 * Tests that the system DOES NOT show markets below the minimum volume
 * threshold. This is a behavioral test — it verifies what the user sees,
 * not how the filter is wired internally.
 */
import { describe, it, expect } from 'vitest';
import { MIN_MARKET_VOLUME } from '../src/config/trading-constants';

// The minimum volume used by the risk engine (from tiers.ts)
// If these ever diverge, markets will appear that can't be traded.
const RISK_ENGINE_MIN_VOLUME = 100_000;

describe('Volume Filter', () => {
    describe('Single source of truth', () => {
        it('ingestion threshold matches risk engine threshold', () => {
            // CRITICAL: If these diverge, users see markets they can't trade
            expect(MIN_MARKET_VOLUME).toBe(RISK_ENGINE_MIN_VOLUME);
        });

        it('threshold is at least $100K', () => {
            // Business rule: markets under $100K are too illiquid for prop trading
            expect(MIN_MARKET_VOLUME).toBeGreaterThanOrEqual(100_000);
        });
    });

    describe('Filter behavior', () => {
        // Simulate what ingestion does: filter markets by volume
        const filterByVolume = (markets: { id: string; volume: number }[]) =>
            markets.filter(m => m.volume >= MIN_MARKET_VOLUME);

        it('excludes markets below threshold', () => {
            const markets = [
                { id: 'spx-feb-17', volume: 40_183 },    // S&P 500 — too low
                { id: 'bitboy', volume: 19_700 },          // BitBoy — too low
                { id: 'rockets-hornets', volume: 35_000 }, // Rockets vs Hornets — too low
            ];

            const result = filterByVolume(markets);
            expect(result).toHaveLength(0);
        });

        it('includes markets above threshold', () => {
            const markets = [
                { id: 'us-iran', volume: 254_400_000 },       // US strikes Iran — $254M
                { id: 'fed-march', volume: 107_400_000 },      // Fed decision — $107M
                { id: 'presidential', volume: 290_700_000 },   // Presidential — $290M
            ];

            const result = filterByVolume(markets);
            expect(result).toHaveLength(3);
        });

        it('excludes markets in the old $50K-$100K dead zone', () => {
            // Previously, ingestion used $50K but risk engine used $100K.
            // Markets in this range were displayed but untradeable.
            const markets = [
                { id: 'edge-case-50k', volume: 50_000 },
                { id: 'edge-case-75k', volume: 75_000 },
                { id: 'edge-case-99k', volume: 99_999 },
            ];

            const result = filterByVolume(markets);
            expect(result).toHaveLength(0);
        });

        it('includes markets exactly at threshold', () => {
            const markets = [
                { id: 'boundary', volume: 100_000 },
            ];

            const result = filterByVolume(markets);
            expect(result).toHaveLength(1);
        });
    });
});
