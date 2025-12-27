
import { db } from "@/db";
import { trades, positions, challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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
     * @param amount Dollar amount to trade
     */
    static async executeTrade(
        userId: string,
        challengeId: string,
        marketId: string,
        side: "BUY" | "SELL",
        amount: number
    ) {
        logger.info(`Requested ${side} $${amount} on ${marketId}`, { userId, challengeId });

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

            const riskCheck = await RiskEngine.validateTrade(challenge.id, marketId, amount);
            if (!riskCheck.allowed) {
                throw new RiskLimitExceededError(riskCheck.reason || "Risk Check Failed");
            }
        }

        // 4. INTEGIRTY CHECK: Calculate Impact Cost (Detailed Slippage)
        const book = await MarketService.getOrderBook(marketId);

        // Fallback: Strict Integrity Mode
        if (!book) {
            logger.warn(`No orderbook found for ${marketId}`, { userId });
            throw new TradingError("Market Liquidity Unavailable (Book Not Found)", 'NO_LIQUIDITY', 503);
        }

        const simulation = MarketService.calculateImpact(book, side, amount);

        if (!simulation.filled) {
            throw new TradingError(`Trade Rejected: ${simulation.reason}`, 'SLIPPAGE_TOO_HIGH', 400);
        }

        const executionPrice = simulation.executedPrice;
        const shares = simulation.totalShares;
        const slippage = (simulation.slippagePercent * 100).toFixed(2);

        logger.info(`Execution Plan`, {
            marketId,
            amount,
            side,
            executionPrice: executionPrice.toFixed(4),
            spotPrice: currentPrice,
            slippage: `${slippage}%`
        });

        // 5. DB Transaction
        const tradeResult = await db.transaction(async (tx) => {
            // A. Create Trade Record
            const [newTrade] = await tx.insert(trades).values({
                challengeId: challenge.id,
                marketId: marketId,
                type: side,
                amount: amount.toString(), // Notional value
                price: executionPrice.toString(),
                shares: shares.toString(),
                executedAt: new Date(),
            }).returning();

            // B. Update Position
            const existingPos = await tx.query.positions.findFirst({
                where: and(
                    eq(positions.challengeId, challenge.id),
                    eq(positions.marketId, marketId),
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
                } else {
                    const { proceeds } = await PositionManager.reducePosition(
                        tx,
                        existingPos.id,
                        shares
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
                    amount
                );
                await BalanceManager.deductCost(tx, challenge.id, amount);
            }

            return newTrade;
        });

        // 6. ADJUDICATION
        // We run this AFTER the transaction so we don't block the trade if adjudication is slow,
        // but for this demo we await it to ensure immediate feedback.
        try {
            const { ChallengeEvaluator } = await import("./evaluator");
            await ChallengeEvaluator.evaluate(challenge.id);
        } catch (e) {
            logger.error("Adjudication failed post-trade", e);
            // Non-blocking error, do not rethrow
        }

        logger.info(`Trade Complete: ${tradeResult.id}`, { tradeId: tradeResult.id });
        return tradeResult;
    }
}
