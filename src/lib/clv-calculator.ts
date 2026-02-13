/**
 * CLV Calculator (Closing Line Value)
 * 
 * FUTURE(v2): Not wired into v1 — requires clvPercent and closingPrice
 * columns in the trades schema. Core logic is implemented and tested,
 * but persistence is deferred until the schema migration.
 * 
 * Measures trader skill by comparing entry price to closing price.
 * CLV > 0 = trader "beat the market" (skill)
 * CLV < 0 = trader "lost to the market" (luck or anti-skill)
 * 
 * Formula: CLV% = ((closingPrice - entryPrice) / entryPrice) * 100
 * 
 * @module CLVCalculator
 */

import { db } from "@/db";
import { trades } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { MarketService } from "@/lib/market";
import { createLogger } from "@/lib/logger";
const logger = createLogger("ClvCalculator");

// ============================================================================
// Types
// ============================================================================

interface CLVResult {
    tradeId: string;
    entryPrice: number;
    closingPrice: number;
    clvPercent: number;
}

interface CLVSummary {
    totalTrades: number;
    tradesWithCLV: number;
    averageCLV: number;
    classification: 'sharp' | 'gambler' | 'unknown';
}

// ============================================================================
// CLV Calculator
// ============================================================================

export class CLVCalculator {
    /**
     * Calculate CLV for a specific trade.
     * Should be called when an event closes/goes live.
     */
    static async calculateForTrade(
        tradeId: string,
        closingPrice: number
    ): Promise<CLVResult> {
        // Input validation
        if (!tradeId) {
            throw new Error('Trade ID is required');
        }
        if (closingPrice < 0 || closingPrice > 1) {
            throw new Error(`Invalid closing price: ${closingPrice}. Must be between 0 and 1.`);
        }

        const trade = await db.query.trades.findFirst({
            where: eq(trades.id, tradeId),
        });

        if (!trade) {
            throw new Error(`Trade ${tradeId} not found`);
        }

        const entryPrice = parseFloat(trade.price);

        // Defensive: prevent division by zero
        if (entryPrice <= 0) {
            logger.warn(`[CLV] Trade ${tradeId} has invalid entry price: ${entryPrice}`);
            return { tradeId, entryPrice, closingPrice, clvPercent: 0 };
        }

        const clvPercent = ((closingPrice - entryPrice) / entryPrice) * 100;

        // FUTURE(v2): Add closingPrice and clvPercent columns to trades schema to persist CLV data
        // For now, we calculate but don't persist (schema migration needed)
        // await db.update(trades)
        //     .set({
        //         closingPrice: closingPrice.toString(),
        //         clvPercent: clvPercent.toString(),
        //     })
        //     .where(eq(trades.id, tradeId));

        logger.info(`[CLV] Trade ${tradeId.slice(0, 8)}: Entry ${(entryPrice * 100).toFixed(0)}¢ → Close ${(closingPrice * 100).toFixed(0)}¢ = CLV ${clvPercent.toFixed(2)}%`);

        return { tradeId, entryPrice, closingPrice, clvPercent };
    }

    /**
     * Calculate CLV for all trades in a specific market when it closes.
     * This is called by the ingestion worker when a market resolves.
     */
    static async calculateForMarket(marketId: string): Promise<CLVResult[]> {
        // Get closing price from Redis/API
        const marketData = await MarketService.getLatestPrice(marketId);

        if (!marketData) {
            logger.info(`[CLV] No market data for ${marketId}, skipping CLV calculation`);
            return [];
        }

        const closingPrice = parseFloat(marketData.price);

        // FUTURE(v2): clvPercent column doesn't exist in trades schema yet
        // For now, calculate CLV for all trades in this market (no filtering by null clvPercent)
        const pendingTrades = await db.query.trades.findMany({
            where: eq(trades.marketId, marketId),
        });

        logger.info(`[CLV] Calculating CLV for ${pendingTrades.length} trades in market ${marketId.slice(0, 16)}...`);

        const results: CLVResult[] = [];
        for (const trade of pendingTrades) {
            const result = await this.calculateForTrade(trade.id, closingPrice);
            results.push(result);
        }

        return results;
    }

    /**
     * Get CLV summary for a trader (challenge).
     * Used for trader classification (sharp vs gambler).
     * 
     * FUTURE(v2): Requires clvPercent column in trades schema to function properly.
     * Currently returns 'unknown' classification for all traders.
     */
    static async getSummary(challengeId: string): Promise<CLVSummary> {
        const allTrades = await db.query.trades.findMany({
            where: eq(trades.challengeId, challengeId),
        });

        // FUTURE(v2): clvPercent column doesn't exist yet in trades schema
        // Return unknown classification until schema migration is complete
        return {
            totalTrades: allTrades.length,
            tradesWithCLV: 0,
            averageCLV: 0,
            classification: 'unknown',
        };
    }

    /**
     * Classify all active funded traders.
     * Used for admin dashboard reporting.
     */
    static async classifyAllTraders(): Promise<Map<string, CLVSummary>> {
        // This would be called periodically or on-demand by admin
        // Returns a map of challengeId -> CLV summary
        // Implementation would fetch all funded challenges and summarize
        logger.info('[CLV] Trader classification not yet implemented for bulk queries');
        return new Map();
    }
}
