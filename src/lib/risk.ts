import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ChallengeRules } from "@/types/trading";
import { getActiveMarkets, MarketMetadata } from "@/app/actions/market";

export class RiskEngine {

    /**
     * Checks if a new trade is allowed based on risk parameters.
     * Returns { allowed: true } or { allowed: false, reason: string }
     */
    static async validateTrade(
        challengeId: string,
        marketId: string,
        tradeAmount: number,
        estimatedLoss: number = 0
    ) {
        console.log("\n=== RISK VALIDATION START ===");
        console.log("Challenge ID:", challengeId);
        console.log("Market ID:", marketId);
        console.log("Trade Amount: $" + tradeAmount);

        // 1. Fetch Challenge State
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId));

        if (!challenge || challenge.status !== "active") {
            return { allowed: false, reason: "Challenge not active" };
        }

        const rules = challenge.rulesConfig as unknown as ChallengeRules;
        console.log("Rules Config:", JSON.stringify(rules, null, 2));

        const currentBalance = parseFloat(challenge.currentBalance);
        const startBalance = parseFloat(challenge.startingBalance);
        console.log("Current Balance: $" + currentBalance);
        console.log("Starting Balance: $" + startBalance);

        // Use Start of Day Balance (default to current/start if missing)
        const sodBalance = parseFloat(challenge.startOfDayBalance || challenge.currentBalance);

        // --- RULE 1: MAX TOTAL DRAWDOWN (8% Static) ---
        const MAX_TOTAL_DD_PERCENT = rules.maxTotalDrawdownPercent || 0.08;
        const totalEquityFloor = startBalance * (1 - MAX_TOTAL_DD_PERCENT);

        if (currentBalance - estimatedLoss < totalEquityFloor) {
            return { allowed: false, reason: `Max Total Drawdown (8%) Reached. Floor: $${totalEquityFloor.toFixed(2)}` };
        }

        // --- RULE 2: MAX DAILY DRAWDOWN (4% of SOD Balance) ---
        const MAX_DAILY_DD_PERCENT = rules.maxDailyDrawdownPercent || 0.04;
        const dailyEquityFloor = sodBalance * (1 - MAX_DAILY_DD_PERCENT);

        if (currentBalance - estimatedLoss < dailyEquityFloor) {
            return { allowed: false, reason: `Max Daily Loss (4%) Reached. Daily Floor: $${dailyEquityFloor.toFixed(2)}` };
        }

        // --- RULE 3: PER-MARKET EXPOSURE (5%) ---
        console.log("\n[RULE 3] Per-Market Exposure Check:");
        console.log("  maxPositionSizePercent:", rules.maxPositionSizePercent);
        const maxPerMarket = startBalance * (rules.maxPositionSizePercent || 0.05);
        console.log("  Max Per Market: $" + maxPerMarket.toFixed(2));
        const currentExposure = await this.getMarketExposure(challengeId, marketId);
        console.log("  Current Exposure: $" + currentExposure.toFixed(2));
        console.log("  New Total: $" + (currentExposure + tradeAmount).toFixed(2));

        if (currentExposure + tradeAmount > maxPerMarket) {
            console.log("  ❌ BLOCKED: Per-Market Limit");
            return {
                allowed: false,
                reason: `Max per-market exposure (5%) exceeded. Current: $${currentExposure.toFixed(2)}, Limit: $${maxPerMarket.toFixed(2)}`
            };
        }
        console.log("  ✅ PASS");

        // --- RULE 4: PER-CATEGORY EXPOSURE (10%) ---
        const markets = await getActiveMarkets();
        const market = markets.find(m => m.id === marketId);

        if (market?.categories && market.categories.length > 0) {
            const maxPerCategory = startBalance * (rules.maxCategoryExposurePercent || 0.10);
            // Check exposure for each category the market is in
            for (const category of market.categories) {
                const categoryExposure = await this.getCategoryExposure(challengeId, category, markets);
                if (categoryExposure + tradeAmount > maxPerCategory) {
                    return {
                        allowed: false,
                        reason: `Max ${category} exposure (10%) exceeded. Current: $${categoryExposure.toFixed(2)}, Limit: $${maxPerCategory.toFixed(2)}`
                    };
                }
            }
        }

        // --- RULE 5: LOW-VOLUME MARKET CAP (2.5%) ---
        if (market) {
            const marketVolume = market.volume || 0;
            if (marketVolume < (rules.lowVolumeThreshold || 10_000_000)) {
                const lowVolMax = startBalance * (rules.lowVolumeMaxPositionPercent || 0.025);
                if (tradeAmount > lowVolMax) {
                    return {
                        allowed: false,
                        reason: `Low-volume market (<$10M). Max position: $${lowVolMax.toFixed(2)}`
                    };
                }
            }

            // --- RULE 6: LIQUIDITY ENFORCEMENT (10% of 24h Volume) ---
            const maxImpact = marketVolume * (rules.maxVolumeImpactPercent || 0.10);
            if (tradeAmount > maxImpact) {
                return {
                    allowed: false,
                    reason: `Trade too large for market liquidity. Max: $${maxImpact.toFixed(2)} (10% of $${marketVolume.toFixed(0)} 24h volume)`
                };
            }

            // --- RULE 7: MINIMUM VOLUME FILTER ---
            if (marketVolume < (rules.minMarketVolume || 100_000)) {
                return {
                    allowed: false,
                    reason: `Market volume too low (<$100k). Trading blocked for safety.`
                };
            }
        }

        console.log("\n✅ ALL RULES PASSED - Trade Allowed");
        console.log("=== RISK VALIDATION END ===\n");
        return { allowed: true };
    }

    /**
     * Calculate total exposure (open positions) in a specific market
     */
    private static async getMarketExposure(challengeId: string, marketId: string): Promise<number> {
        const openPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.marketId, marketId),
                eq(positions.status, "OPEN")
            )
        });

        return openPositions.reduce((sum, pos) => sum + parseFloat(pos.sizeAmount), 0);
    }

    /**
     * Calculate total exposure across all markets in a category
     */
    private static async getCategoryExposure(
        challengeId: string,
        category: string,
        markets: MarketMetadata[]
    ): Promise<number> {
        // 1. Get all open positions for this challenge
        const openPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.status, "OPEN")
            )
        });

        // 2. Sum exposure for positions in this category
        let totalExposure = 0;
        for (const pos of openPositions) {
            const market = markets.find(m => m.id === pos.marketId);
            if (market?.categories?.includes(category)) {
                totalExposure += parseFloat(pos.sizeAmount);
            }
        }

        return totalExposure;
    }

    /**
     * Called to update High Water Mark after a profitable trade closed
     */
    static async updateHighWaterMark(challengeId: string, newBalance: number) {
        // Logic to fetch and update if newBalance > HWM
        // ...
    }
}
