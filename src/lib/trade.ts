import { db } from "@/db";
import { trades, positions, challenges } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { MarketService } from "./market";
import { RiskEngine } from "./risk";
import { PositionManager } from "./trading/PositionManager";
import { BalanceManager } from "./trading/BalanceManager";
import { createLogger } from "./logger";
import { invariant, softInvariant } from "./invariant";
import {
    TradingError,
    InsufficientFundsError,
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

        // ================================================
        // PRICE RESOLUTION — Single Source of Truth
        // ================================================
        // We're a B-Book: we don't route to Polymarket.
        // The Gamma API event list already has the correct price
        // (aggregating both YES and NO token liquidity).
        // One price source → one synthetic book → one trade.

        const canonicalPrice = await MarketService.getCanonicalPrice(marketId);

        if (canonicalPrice === null) {
            throw new TradingError(
                'This market is currently unavailable. It may have been removed or is temporarily offline.',
                'NO_MARKET_DATA',
                503
            );
        }

        // Resolution guard: reject trades on markets at ≥95¢ or ≤5¢
        if (canonicalPrice >= 0.95 || canonicalPrice <= 0.05) {
            throw new TradingError(
                `This market has nearly resolved (${(canonicalPrice * 100).toFixed(0)}¢) and can no longer be traded.`,
                'MARKET_RESOLVED',
                409,
                { freshPrice: canonicalPrice }
            );
        }

        const currentPrice = canonicalPrice;

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

        // 4. Build synthetic order book from canonical price
        const book = MarketService.buildSyntheticOrderBookPublic(canonicalPrice);
        const bookWithSource = { ...book, source: 'synthetic' as const };

        logger.info(`Trade execution`, {
            marketId: marketId.slice(0, 12),
            canonicalPrice: canonicalPrice.toFixed(4),
            direction,
            side,
            amount,
        });

        // For NO direction trades, flip the order book side to match correct counterparty:
        //   - BUY NO: Match against YES BIDS (YES buyers implicitly sell NO at 1-bid)
        //   - SELL NO: Match against YES ASKS (YES sellers implicitly buy NO at 1-ask)
        const effectiveSide = direction === "NO"
            ? (side === "BUY" ? "SELL" : "BUY")
            : side;

        const simulation = MarketService.calculateImpact(bookWithSource, effectiveSide, amount);

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
        // INVARIANT ASSERTIONS — Catch impossible states
        // These guards ensure no corrupted data enters the DB.
        // invariant() throws in dev, fires Sentry + logs in prod.
        // ================================================

        invariant(
            Number.isFinite(shares) && shares > 0,
            'Invalid shares: must be positive and finite',
            { shares, amount, executionPrice }
        );

        invariant(
            Number.isFinite(executionPrice) && executionPrice > 0 && executionPrice < 1,
            'Invalid execution price: must be 0 < p < 1',
            { executionPrice }
        );

        invariant(
            Number.isFinite(finalAmount) && finalAmount > 0,
            'Invalid trade amount: must be positive and finite',
            { finalAmount }
        );

        if (side === 'BUY') {
            const preTradeBalance = parseFloat(challenge.currentBalance);
            invariant(
                Number.isFinite(preTradeBalance) && preTradeBalance >= finalAmount,
                'Would create negative balance',
                { preTradeBalance, finalAmount, difference: preTradeBalance - finalAmount }
            );
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
                direction: direction, // YES or NO — audit trail
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

        // STRUCTURED AUDIT LOG
        logger.info('Trade audit', {
            tradeId: tradeResult.id,
            userId: userId.slice(0, 8),
            challengeId: challengeId.slice(0, 8),
            marketId: marketId.slice(0, 12),
            side,
            direction,
            amount: parseFloat(finalAmount.toFixed(2)),
            shares: parseFloat(shares.toFixed(4)),
            executionPrice: parseFloat(executionPrice.toFixed(4)),
            canonicalPrice,
            bookSource: 'synthetic',
            slippagePct: parseFloat(simulation.slippagePercent.toFixed(4)),
        });

        return {
            ...tradeResult,
            priceSource: 'canonical',
        };
    }
}
