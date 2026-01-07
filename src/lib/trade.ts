
import { db } from "@/db";
import { trades, positions, challenges } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { ChallengeManager } from "./challenges";
import { MarketService } from "./market";
import { RiskEngine } from "./risk";
import { PositionManager } from "./trading/PositionManager";
import { BalanceManager } from "./trading/BalanceManager";
import { ChallengeEvaluator } from "./evaluator";
import { TRADING_CONFIG } from "@/config/trading";
import { createLogger } from "./logger";
import {
    TradingError,
    InsufficientFundsError,
    MarketClosedError,
    PriceStaleError,
    PositionNotFoundError,
    RiskLimitExceededError
} from "@/errors/trading-errors";

const logger = createLogger('TradeExecutor');

export class TradeExecutor {

    /**
     * Executes a simulated trade.
     * @param userId User ID
     * @param challengeId Challenge ID (explicit selection for multi-account support)
     * @param marketId Polymarket Token ID (Asset ID)
     * @param side "BUY" or "SELL"
     * @param amount Dollar amount to trade (ignored for SELL if options.shares provided)
     * @param direction "YES" or "NO" - the outcome direction to trade
     * @param options Optional parameters for execution control
     */
    static async executeTrade(
        userId: string,
        challengeId: string,
        marketId: string,
        side: "BUY" | "SELL",
        amount: number,
        direction: "YES" | "NO" = "YES",
        options?: {
            maxSlippage?: number;  // Max acceptable slippage (e.g., 0.02 = 2%)
            shares?: number;       // For SELL: specify shares to close instead of dollar amount
        }
    ) {
        logger.info(`Requested ${side} $${amount} on ${marketId}`, { userId, challengeId, options });

        // 1. Get Challenge by ID (validate ownership)
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(and(
                eq(challenges.id, challengeId),
                eq(challenges.userId, userId)
            ));

        if (!challenge) {
            throw new TradingError("Challenge not found or access denied", 'INVALID_CHALLENGE', 403);
        }

        if (challenge.status !== "active") {
            throw new TradingError("Challenge is not active", 'CHALLENGE_INACTIVE', 400);
        }

        // 2. Get Real-Time Price
        const marketData = await MarketService.getLatestPrice(marketId);
        if (!marketData) throw new MarketClosedError(marketId);

        // Reject trades on demo data (no real price available)
        if (marketData.source === 'demo') {
            throw new TradingError('Market data unavailable - price feed down. Try again shortly.', 'NO_MARKET_DATA', 503);
        }

        // Configurable Staleness Check
        if (TRADING_CONFIG.risk.enableStalenessCheck) {
            const freshAge = TRADING_CONFIG.risk.priceFreshnessMs;
            if (!MarketService.isPriceFresh(marketData, freshAge)) {
                // Determine age for error report (mock logic as isPriceFresh boolean doesn't return age)
                // In production, isPriceFresh would return reason/age.
                throw new PriceStaleError(marketId, 9999);
            }
        }

        const currentPrice = parseFloat(marketData.price);

        // 3. Risk Check
        if (side === "BUY") {
            if (parseFloat(challenge.currentBalance) < amount) {
                throw new InsufficientFundsError(userId, amount, parseFloat(challenge.currentBalance));
            }

            const riskCheck = await RiskEngine.validateTrade(challenge.id, marketId, amount, 0, direction);
            if (!riskCheck.allowed) {
                throw new RiskLimitExceededError(riskCheck.reason || "Risk Check Failed");
            }
        }

        // 4. INTEGRITY CHECK: Calculate Impact Cost (Detailed Slippage)
        const book = await MarketService.getOrderBook(marketId);

        // Fallback: Strict Integrity Mode
        if (!book) {
            logger.warn(`No orderbook found for ${marketId}`, { userId });
            throw new TradingError("Market Liquidity Unavailable (Book Not Found)", 'NO_LIQUIDITY', 503);
        }

        // Reject trades on demo order book (synthetic is allowed - uses real prices)
        if (book.source === 'demo') {
            throw new TradingError('Order book unavailable - liquidity feed down. Try again shortly.', 'NO_ORDER_BOOK', 503);
        }

        const simulation = MarketService.calculateImpact(book, side, amount);

        if (!simulation.filled) {
            throw new TradingError(`Trade Rejected: ${simulation.reason}`, 'SLIPPAGE_TOO_HIGH', 400);
        }

        // Optional: Reject if slippage exceeds user's max tolerance
        if (options?.maxSlippage !== undefined && simulation.slippagePercent > options.maxSlippage) {
            throw new TradingError(
                `Slippage ${(simulation.slippagePercent * 100).toFixed(2)}% exceeds max ${(options.maxSlippage * 100).toFixed(2)}%`,
                'SLIPPAGE_EXCEEDED',
                400
            );
        }

        // For NO positions, convert YES-side order book price to NO price
        // In prediction markets: NO price = 1 - YES price
        const executionPrice = direction === "NO"
            ? (1 - simulation.executedPrice)
            : simulation.executedPrice;

        // Calculate shares - can be overridden by options.shares for SELL
        let shares: number;
        let finalAmount = amount;

        if (side === "SELL" && options?.shares !== undefined) {
            // SELL by share count - user specifies shares, we derive amount
            shares = options.shares;
            finalAmount = shares * executionPrice;
            logger.info(`SELL by shares: ${shares} shares @ ${executionPrice.toFixed(4)} = $${finalAmount.toFixed(2)}`);
        } else {
            // Standard flow - derive shares from amount
            shares = direction === "NO"
                ? amount / executionPrice  // Recalculate with correct NO price
                : simulation.totalShares;
        }

        const slippage = (simulation.slippagePercent * 100).toFixed(2);

        logger.info(`Execution Plan`, {
            marketId,
            amount: finalAmount,
            side,
            executionPrice: executionPrice.toFixed(4),
            spotPrice: currentPrice,
            slippage: `${slippage}%`
        });

        // 5. DB Transaction (with Row Lock for Race Condition Prevention)
        const tradeResult = await db.transaction(async (tx) => {
            // A. Lock the challenge row to prevent concurrent trades
            // This serializes trades per challenge, preventing exposure limit bypass
            await tx.execute(sql`SELECT id FROM challenges WHERE id = ${challenge.id} FOR UPDATE`);

            // B. Re-fetch challenge balance inside transaction (may have changed)
            const [lockedChallenge] = await tx.select().from(challenges).where(eq(challenges.id, challenge.id));

            // C. Re-validate risk inside transaction
            if (side === "BUY") {
                if (parseFloat(lockedChallenge.currentBalance) < amount) {
                    throw new InsufficientFundsError(userId, amount, parseFloat(lockedChallenge.currentBalance));
                }
                const riskCheck = await RiskEngine.validateTrade(lockedChallenge.id, marketId, amount, 0, direction);
                if (!riskCheck.allowed) {
                    throw new RiskLimitExceededError(riskCheck.reason || "Risk Check Failed");
                }
            }

            // D. Create Trade Record
            const [newTrade] = await tx.insert(trades).values({
                challengeId: challenge.id,
                marketId: marketId,
                type: side,
                amount: finalAmount.toString(), // Notional value
                price: executionPrice.toString(),
                shares: shares.toString(),
                executedAt: new Date(),
            }).returning();

            // B. Update Position (filter by direction too - YES/NO are separate positions!)
            const existingPos = await tx.query.positions.findFirst({
                where: and(
                    eq(positions.challengeId, challenge.id),
                    eq(positions.marketId, marketId),
                    eq(positions.direction, direction),
                    eq(positions.status, "OPEN")
                )
            });

            if (existingPos) {
                if (side === "BUY") {
                    await PositionManager.addToPosition(
                        tx,
                        existingPos.id,
                        shares,
                        executionPrice,
                        amount
                    );
                    // CRITICAL: Also deduct balance when adding to position!
                    await BalanceManager.deductCost(tx, challenge.id, amount);
                } else {
                    const { proceeds } = await PositionManager.reducePosition(
                        tx,
                        existingPos.id,
                        shares,
                        executionPrice  // Use live price from order book walk
                    );
                    await BalanceManager.creditProceeds(tx, challenge.id, proceeds);
                }
            } else {
                if (side === "SELL") throw new PositionNotFoundError(`No open position for ${marketId}`);

                await PositionManager.openPosition(
                    tx,
                    challenge.id,
                    marketId,
                    shares,
                    executionPrice,
                    amount,
                    direction  // Pass direction to position
                );
                await BalanceManager.deductCost(tx, challenge.id, amount);
            }

            return newTrade;
        });

        // 6. ADJUDICATION (fire-and-forget to avoid blocking trade response)
        // Evaluation can run in the background - trade response doesn't need to wait
        import("./evaluator")
            .then(({ ChallengeEvaluator }) => ChallengeEvaluator.evaluate(challenge.id))
            .catch((e) => logger.error("Adjudication failed post-trade", e));

        // 7. ACTIVITY TRACKING (for funded accounts)
        // Records trading days and checks consistency rules
        if (challenge.phase === "funded") {
            import("./activity-tracker")
                .then(({ ActivityTracker }) => {
                    ActivityTracker.recordTradingDay(challenge.id);
                    ActivityTracker.checkConsistency(challenge.id);
                })
                .catch((e) => logger.error("Activity tracking failed", e));
        }

        logger.info(`Trade Complete: ${tradeResult.id}`, { tradeId: tradeResult.id });

        // Calculate price age for transparency
        const priceAge = marketData.timestamp ? Date.now() - marketData.timestamp : null;

        return {
            ...tradeResult,
            priceAge,           // How old the price data was (ms)
            priceSource: marketData.source, // 'live', 'event_list', etc.
        };
    }
}
