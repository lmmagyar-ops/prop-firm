
import { db } from "@/db";
import { trades, positions, challenges } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { MarketService } from "./market";
import { RiskEngine } from "./risk";
import { PositionManager } from "./trading/PositionManager";
import { BalanceManager } from "./trading/BalanceManager";
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
            console.log(`[Trade] ❌ No market data for ${marketId} - falling back to demo`);
            throw new TradingError(
                'This market is currently unavailable. It may have been removed or is temporarily offline. Please refresh and try a different market.',
                'NO_MARKET_DATA',
                503
            );
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

        // EXTREME PRICE GUARD: Block trades on resolved/near-resolved markets
        // Prices ≤0.01 or ≥0.99 indicate the market has effectively resolved
        if (currentPrice <= 0.01 || currentPrice >= 0.99) {
            logger.warn(`EXTREME PRICE BLOCKED: ${currentPrice.toFixed(4)} for ${marketId.slice(0, 12)}`);
            throw new TradingError(
                'This market has effectively resolved and is no longer tradable. Please choose a different market.',
                'MARKET_RESOLVED',
                400
            );
        }

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
        // DEFENSE-IN-DEPTH: Fetch FRESH order book at trade time, bypassing 5-min cache.
        // This guarantees the execution price matches current market conditions.
        const book = await MarketService.getOrderBookFresh(marketId);

        // Fallback: Strict Integrity Mode
        if (!book) {
            logger.warn(`No orderbook found for ${marketId}`, { userId });
            throw new TradingError("Market Liquidity Unavailable (Book Not Found)", 'NO_LIQUIDITY', 503);
        }

        // DEBUG: Log order book details to diagnose price discrepancy
        logger.info(`ORDER BOOK DEBUG`, {
            marketId: marketId.slice(0, 12),
            source: book.source,
            topAsk: book.asks?.[0]?.price,
            topBid: book.bids?.[0]?.price,
            askCount: book.asks?.length || 0,
            bidCount: book.bids?.length || 0,
        });

        // Reject trades on demo order book (synthetic is allowed - uses real prices)
        if (book.source === 'demo') {
            throw new TradingError('Order book unavailable - liquidity feed down. Try again shortly.', 'NO_ORDER_BOOK', 503);
        }

        // AUDIT FIX: Log synthetic order book usage for operational visibility
        // Synthetic books are built from event list prices - acceptable for B-Book model
        if (book.source === 'synthetic') {
            logger.warn(`SYNTHETIC ORDERBOOK USED for trade on ${marketId.slice(0, 12)}`, {
                userId,
                side,
                amount,
            });
        }

        // For NO direction trades, flip the order book side to match correct counterparty:
        //   - BUY NO: Match against YES BIDS (YES buyers implicitly sell NO at 1-bid)
        //   - SELL NO: Match against YES ASKS (YES sellers implicitly buy NO at 1-ask)
        // This is because prediction markets only have one order book (YES), and NO
        // is the complement. When you buy NO at 32¢, you're matching with someone
        // willing to buy YES at 68¢ (their bid).
        const effectiveSide = direction === "NO"
            ? (side === "BUY" ? "SELL" : "BUY")
            : side;

        const simulation = MarketService.calculateImpact(book, effectiveSide, amount);

        // DEFENSE-IN-DEPTH LAYER 2: Price Deviation Guard (3% threshold)
        // Compare execution price against the display price the user saw.
        // If deviation exceeds 3%, REJECT the trade and return the fresh price
        // so the UI can show a re-quote. Never silently fill at a bad price.
        const eventListPrice = await MarketService.lookupPriceFromEvents(marketId);
        if (eventListPrice && simulation.filled) {
            const displayPrice = parseFloat(eventListPrice.price);
            // For NO direction, compare against the NO equivalent
            const comparableExecPrice = direction === "NO" ? (1 - simulation.executedPrice) : simulation.executedPrice;
            const comparableDisplayPrice = direction === "NO" ? (1 - displayPrice) : displayPrice;
            const priceDeviation = Math.abs(comparableExecPrice - comparableDisplayPrice) / comparableDisplayPrice;

            if (priceDeviation > 0.03) { // More than 3% deviation
                logger.warn(`PRICE_MOVED: execution=${comparableExecPrice.toFixed(4)} vs display=${comparableDisplayPrice.toFixed(4)} (${(priceDeviation * 100).toFixed(1)}% deviation)`, {
                    marketId: marketId.slice(0, 12),
                    bookSource: book.source,
                    direction,
                });

                // Return fresh price to client for re-quote UI
                const freshPrice = direction === "NO" ? (1 - simulation.executedPrice) : simulation.executedPrice;
                throw new TradingError(
                    `Price moved to ${(freshPrice * 100).toFixed(0)}¢. Tap Buy again to confirm at the new price.`,
                    'PRICE_MOVED',
                    409, // Conflict status code
                    { freshPrice: parseFloat(freshPrice.toFixed(4)) }
                );
            }
        }

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

        // DEBUG: Log final execution price after all corrections
        logger.info(`FINAL EXECUTION PRICE`, {
            executionPrice: executionPrice.toFixed(4),
            direction,
            simulationPrice: simulation.executedPrice.toFixed(4),
        });

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

        // ================================================
        // INVARIANT ASSERTIONS - Catch impossible states
        // These guards ensure no corrupted data enters the DB
        // ================================================

        // Shares must be positive and finite
        if (!Number.isFinite(shares) || shares <= 0) {
            logger.error('INVARIANT VIOLATION: Invalid shares', { shares, amount, executionPrice });
            throw new TradingError(
                'Trade calculation error: invalid share count',
                'INVARIANT_VIOLATION',
                500
            );
        }

        // Execution price must be valid (between 0 and 1 for prediction markets)
        if (!Number.isFinite(executionPrice) || executionPrice <= 0 || executionPrice >= 1) {
            logger.error('INVARIANT VIOLATION: Invalid execution price', { executionPrice });
            throw new TradingError(
                'Trade calculation error: invalid execution price',
                'INVARIANT_VIOLATION',
                500
            );
        }

        // Amount must be positive and finite
        if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
            logger.error('INVARIANT VIOLATION: Invalid amount', { finalAmount });
            throw new TradingError(
                'Trade calculation error: invalid trade amount',
                'INVARIANT_VIOLATION',
                500
            );
        }

        // For BUY: ensure we won't create negative balance
        if (side === 'BUY') {
            const preTradeBalance = parseFloat(challenge.currentBalance);
            if (!Number.isFinite(preTradeBalance) || preTradeBalance < finalAmount) {
                logger.error('INVARIANT VIOLATION: Would create negative balance', {
                    preTradeBalance,
                    finalAmount,
                    difference: preTradeBalance - finalAmount,
                });
                throw new TradingError(
                    'Trade would result in negative balance',
                    'INVARIANT_VIOLATION',
                    500
                );
            }
        }

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

                    // Link trade → position
                    await tx.update(trades)
                        .set({ positionId: existingPos.id })
                        .where(eq(trades.id, newTrade.id));
                } else {
                    // Calculate realized PnL BEFORE reducing position
                    // PnL = proceeds - cost = (shares * exitPrice) - (shares * entryPrice)
                    const entryPrice = parseFloat(existingPos.entryPrice);
                    const realizedPnL = shares * (executionPrice - entryPrice);

                    const { proceeds } = await PositionManager.reducePosition(
                        tx,
                        existingPos.id,
                        shares,
                        executionPrice  // Use live price from order book walk
                    );
                    await BalanceManager.creditProceeds(tx, challenge.id, proceeds);

                    // Store realized PnL and link trade → position
                    await tx.update(trades)
                        .set({
                            realizedPnL: realizedPnL.toFixed(2),
                            positionId: existingPos.id
                        })
                        .where(eq(trades.id, newTrade.id));

                    logger.info(`Realized PnL: $${realizedPnL.toFixed(2)}`, {
                        shares,
                        entryPrice: entryPrice.toFixed(4),
                        exitPrice: executionPrice.toFixed(4),
                    });
                }
            } else {
                if (side === "SELL") throw new PositionNotFoundError(`No open position for ${marketId}`);

                const newPos = await PositionManager.openPosition(
                    tx,
                    challenge.id,
                    marketId,
                    shares,
                    executionPrice,
                    amount,
                    direction  // Pass direction to position
                );
                await BalanceManager.deductCost(tx, challenge.id, amount);

                // Link trade → position
                await tx.update(trades)
                    .set({ positionId: newPos.id })
                    .where(eq(trades.id, newTrade.id));
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
