import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ChallengeRules } from "@/types/trading";
import { getActiveMarkets, getMarketById, MarketMetadata } from "@/app/actions/market";
import { ArbitrageDetector } from "./arbitrage-detector";
import { MarketService } from "./market";
import { getDirectionAdjustedPrice } from "./position-utils";

export class RiskEngine {

    /**
     * Checks if a new trade is allowed based on risk parameters.
     * Returns { allowed: true } or { allowed: false, reason: string }
     */
    static async validateTrade(
        challengeId: string,
        marketId: string,
        tradeAmount: number,
        estimatedLoss: number = 0,
        direction: "YES" | "NO" = "YES"
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

        // PERF: Fetch ALL open positions ONCE - derive all metrics in memory
        const allOpenPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.status, "OPEN")
            )
        });

        // Calculate total position value for EQUITY-based drawdown checks
        // CRITICAL: currentBalance is CASH only. Equity = Cash + Position Value
        let totalPositionValue = 0;
        if (allOpenPositions.length > 0) {
            const positionMarketIds = allOpenPositions.map(p => p.marketId);
            const livePrices = await MarketService.getBatchOrderBookPrices(positionMarketIds);

            for (const pos of allOpenPositions) {
                const shares = parseFloat(pos.shares);
                const direction = (pos.direction as 'YES' | 'NO') || 'YES';
                const priceData = livePrices.get(pos.marketId);
                const rawPrice = priceData ? parseFloat(priceData.price) : parseFloat(pos.entryPrice);
                const effectivePrice = getDirectionAdjustedPrice(rawPrice, direction);
                totalPositionValue += shares * effectivePrice;
            }
        }
        const currentEquity = currentBalance + totalPositionValue;
        console.log("Position Value: $" + totalPositionValue.toFixed(2));
        console.log("Current Equity: $" + currentEquity.toFixed(2));

        // --- RULE 1: MAX TOTAL DRAWDOWN (8% Static) ---
        const MAX_TOTAL_DD_PERCENT = rules.maxTotalDrawdownPercent || 0.08;
        const totalEquityFloor = startBalance * (1 - MAX_TOTAL_DD_PERCENT);

        // Use EQUITY (not just cash) for drawdown comparison
        if (currentEquity - estimatedLoss < totalEquityFloor) {
            return { allowed: false, reason: `Max Total Drawdown (8%) Reached. Floor: $${totalEquityFloor.toFixed(2)}, Equity: $${currentEquity.toFixed(2)}` };
        }

        // --- RULE 2: MAX DAILY DRAWDOWN (4% of SOD Balance) ---
        const MAX_DAILY_DD_PERCENT = rules.maxDailyDrawdownPercent || 0.04;
        const dailyEquityFloor = sodBalance * (1 - MAX_DAILY_DD_PERCENT);

        // Use EQUITY (not just cash) for daily drawdown comparison
        if (currentEquity - estimatedLoss < dailyEquityFloor) {
            return { allowed: false, reason: `Max Daily Loss (4%) Reached. Daily Floor: $${dailyEquityFloor.toFixed(2)}, Equity: $${currentEquity.toFixed(2)}` };
        }

        // --- RULE 3: PER-EVENT EXPOSURE (5%) ---
        // Changed from per-market to per-EVENT: all markets within same event count together
        // e.g., "Bitcoin dip to $85k" and "Bitcoin reach $100k" are part of same event
        const { getEventInfoForMarket } = await import("@/app/actions/market");
        const eventInfo = await getEventInfoForMarket(marketId);

        const maxPerEvent = startBalance * (rules.maxPositionSizePercent || 0.05);

        // Sum exposure across ALL markets in this event (or just this market if standalone)
        const marketIdsToCheck = eventInfo?.siblingMarketIds || [marketId];
        const currentExposure = allOpenPositions
            .filter(p => marketIdsToCheck.includes(p.marketId))
            .reduce((sum, p) => sum + parseFloat(p.sizeAmount), 0);

        const eventLabel = eventInfo?.eventTitle
            ? `"${eventInfo.eventTitle.slice(0, 30)}..."`
            : "this market";

        // DETAILED LOGGING for debugging per-event limit bypasses
        console.log(`[RISK] --- RULE 3: PER-EVENT EXPOSURE ---`);
        console.log(`[RISK]   Event: ${eventLabel}`);
        console.log(`[RISK]   Event found: ${!!eventInfo}`);
        console.log(`[RISK]   Markets in event: ${marketIdsToCheck.length}`);
        console.log(`[RISK]   Current exposure: $${currentExposure.toFixed(2)}`);
        console.log(`[RISK]   Trade amount: $${tradeAmount.toFixed(2)}`);
        console.log(`[RISK]   Max per event: $${maxPerEvent.toFixed(2)} (5% of $${startBalance})`);
        console.log(`[RISK]   Total after trade: $${(currentExposure + tradeAmount).toFixed(2)}`);
        console.log(`[RISK]   Would exceed limit: ${(currentExposure + tradeAmount) > maxPerEvent}`);

        if (currentExposure + tradeAmount > maxPerEvent) {
            console.log(`[RISK]   ❌ BLOCKED: Per-event limit exceeded`);
            return {
                allowed: false,
                reason: `Max exposure for ${eventLabel} (5%) exceeded. Current: $${currentExposure.toFixed(2)}, Limit: $${maxPerEvent.toFixed(2)}`
            };
        }
        console.log(`[RISK]   ✅ PASS: Per-event limit OK`);


        // --- RULE 4: PER-CATEGORY EXPOSURE (10%) ---
        // Use efficient single-market lookup instead of fetching all markets
        const market = await getMarketById(marketId);

        // DEBUG: Log market lookup result
        console.log(`[RISK] Market lookup for ${marketId.slice(0, 12)}...:`);
        console.log(`[RISK]   Found: ${!!market}`);
        console.log(`[RISK]   Volume: $${market?.volume?.toLocaleString() || 'undefined'}`);
        console.log(`[RISK]   Question: ${market?.question?.slice(0, 50) || 'unknown'}`);

        // Infer categories from market title if not provided by API
        // (Polymarket/Kalshi don't include categories in their data)
        const marketCategories = market?.categories?.length
            ? market.categories
            : this.inferCategoriesFromTitle(market?.question || '');

        console.log(`[RISK]   Categories: ${marketCategories.length > 0 ? marketCategories.join(', ') : 'none detected'}`);

        if (marketCategories.length > 0) {
            const maxPerCategory = startBalance * (rules.maxCategoryExposurePercent || 0.10);
            // For category exposure, we need all markets for category mapping
            const allMarkets = await getActiveMarkets();
            for (const category of marketCategories) {
                // PERF: Use cached positions instead of DB query
                const categoryExposure = this.getCategoryExposureFromCache(allOpenPositions, category, allMarkets);
                console.log(`[RISK]   ${category} exposure: $${categoryExposure.toFixed(2)} / $${maxPerCategory.toFixed(2)}`);
                if (categoryExposure + tradeAmount > maxPerCategory) {
                    return {
                        allowed: false,
                        reason: `Max ${category} exposure (10%) exceeded. Current: $${categoryExposure.toFixed(2)}, Limit: $${maxPerCategory.toFixed(2)}`
                    };
                }
            }
        }

        // --- RULE 5-7: VOLUME-BASED CHECKS ---
        // DEFENSIVE: Block trade if market data unavailable (prevents bypassing volume rules)
        if (!market) {
            console.log(`[RISK] ❌ BLOCKED: Market data unavailable for ${marketId}`);
            return {
                allowed: false,
                reason: "Market data unavailable. Please try again or choose a different market."
            };
        }

        const marketVolume = market.volume || 0;

        // Additional safety: if volume is 0, something is wrong with data
        if (marketVolume === 0) {
            console.log(`[RISK] ⚠️ WARNING: Market volume is $0 - possible data issue`);
            console.log(`[RISK]   Market: ${market.question?.slice(0, 50) || marketId}`);
        }

        // --- RULE 5: VOLUME-TIERED EXPOSURE ---
        // >$10M = 5%, $1-10M = 2.5%, $100k-1M = 2%, <$100k = blocked (RULE 7)
        const exposureLimit = this.getExposureLimitByVolume(startBalance, marketVolume);
        const volumeTier = this.getVolumeTierLabel(marketVolume);

        console.log(`  [RULE 5] Volume-Tiered Exposure Check:`);
        console.log(`    Market Volume: $${marketVolume.toLocaleString()}`);
        console.log(`    Tier: ${volumeTier}`);
        console.log(`    Max Exposure: $${exposureLimit.toFixed(2)}`);
        console.log(`    Trade Amount: $${tradeAmount.toFixed(2)}`);

        if (tradeAmount > exposureLimit && exposureLimit > 0) {
            console.log(`  ❌ BLOCKED: Volume-Tiered Exposure Limit`);
            return {
                allowed: false,
                reason: `This market has limited liquidity. Max trade: $${exposureLimit.toFixed(0)}. Try a smaller amount or choose a higher-volume market.`
            };
        }
        console.log(`  ✅ PASS`);

        // --- RULE 6: LIQUIDITY ENFORCEMENT (10% of 24h Volume) ---
        const maxImpact = marketVolume * (rules.maxVolumeImpactPercent || 0.10);
        if (tradeAmount > maxImpact && maxImpact > 0) {
            return {
                allowed: false,
                reason: `Trade too large for this market. Max trade: $${maxImpact.toFixed(0)}. Try a smaller amount.`
            };
        }

        // --- RULE 7: MINIMUM VOLUME FILTER ---
        const minVolume = rules.minMarketVolume || 100_000;
        if (marketVolume < minVolume) {
            return {
                allowed: false,
                reason: `This market has insufficient volume ($${marketVolume.toLocaleString()}). Minimum required: $${minVolume.toLocaleString()}.`
            };
        }

        // --- RULE 8: MAX OPEN POSITIONS (Tiered by Account Size) ---
        // PERF: Use cached positions count instead of DB query
        const maxPositions = this.getMaxPositionsForTier(startBalance);
        const openPositionCount = allOpenPositions.length;

        if (openPositionCount >= maxPositions) {
            return {
                allowed: false,
                reason: `Max ${maxPositions} open positions allowed for your account tier. Currently: ${openPositionCount}`
            };
        }

        // --- RULE 9: ARBITRAGE BLOCK ---
        // Block trades that would create risk-free arb positions
        console.log(`\n[RULE 9] Arbitrage Detection:`);
        const arbCheck = await ArbitrageDetector.wouldCreateArbitrage(challengeId, marketId, direction, challenge.platform as "polymarket" | "kalshi");
        if (arbCheck.isArb) {
            console.log(`  ❌ BLOCKED: Arbitrage Detected`);
            return { allowed: false, reason: arbCheck.reason };
        }
        console.log(`  ✅ PASS`);

        console.log("\n✅ ALL RULES PASSED - Trade Allowed");
        console.log("=== RISK VALIDATION END ===\n");
        return { allowed: true };
    }

    /**
     * Get max positions allowed based on account tier
     */
    private static getMaxPositionsForTier(startingBalance: number): number {
        if (startingBalance >= 25000) return 20;
        if (startingBalance >= 10000) return 15;
        if (startingBalance >= 5000) return 10;
        return 5; // Default for very small accounts
    }

    /**
     * Count open positions for a challenge
     */
    private static async getOpenPositionCount(challengeId: string): Promise<number> {
        const openPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.status, "OPEN")
            )
        });
        return openPositions.length;
    }

    /**
     * Get exposure limit based on market volume tier
     * More permissive limits to allow proper trading while protecting against illiquid markets
     * >$10M = 5%, $1-10M = 2.5%, $100k-1M = 2%, <$100k = blocked
     */
    private static getExposureLimitByVolume(balance: number, volume: number): number {
        if (volume >= 10_000_000) return balance * 0.05;   // 5% for high volume ($1250 on $25k)
        if (volume >= 1_000_000) return balance * 0.025;   // 2.5% for medium volume ($625 on $25k)
        if (volume >= 100_000) return balance * 0.02;      // 2% for low volume ($500 on $25k)
        return 0; // Block trading on <$100k volume markets (handled by RULE 7)
    }

    /**
     * Get human-readable volume tier label
     */
    private static getVolumeTierLabel(volume: number): string {
        if (volume >= 10_000_000) return "high volume (>$10M)";
        if (volume >= 1_000_000) return "medium volume ($1-10M)";
        if (volume >= 100_000) return "low volume ($100k-1M)";
        return "insufficient volume (<$100k)";
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
     * PERF: In-memory category exposure calculation using pre-fetched positions
     * Avoids N+1 DB queries when positions are already loaded
     */
    private static getCategoryExposureFromCache(
        openPositions: { marketId: string; sizeAmount: string }[],
        category: string,
        markets: MarketMetadata[]
    ): number {
        let totalExposure = 0;
        for (const pos of openPositions) {
            const market = markets.find(m => m.id === pos.marketId);
            // Use API categories if available, otherwise infer from title
            const marketCategories = market?.categories?.length
                ? market.categories
                : this.inferCategoriesFromTitle(market?.question || '');
            if (marketCategories.includes(category)) {
                totalExposure += parseFloat(pos.sizeAmount);
            }
        }
        return totalExposure;
    }

    /**
     * Infer categories from market title keywords
     * Used when Polymarket/Kalshi don't provide category data
     * Matches the UI category tabs: Crypto, Politics, Geopolitics, Sports, Finance, Tech, Culture, World
     */
    private static inferCategoriesFromTitle(title: string): string[] {
        const categories: string[] = [];
        const titleLower = title.toLowerCase();

        // Crypto keywords
        const cryptoKeywords = ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'solana', 'sol', 'dogecoin', 'doge', 'xrp', 'ripple', 'blockchain', 'nft', 'defi'];
        if (cryptoKeywords.some(kw => titleLower.includes(kw))) {
            categories.push('Crypto');
        }

        // Politics keywords (domestic US politics)
        const politicsKeywords = ['trump', 'biden', 'president', 'election', 'congress', 'senate', 'governor', 'vote', 'democrat', 'republican', 'political', 'kamala', 'harris', 'desantis', 'white house'];
        if (politicsKeywords.some(kw => titleLower.includes(kw))) {
            categories.push('Politics');
        }

        // Geopolitics keywords (international relations, wars, treaties)
        const geopoliticsKeywords = ['ukraine', 'russia', 'china', 'taiwan', 'nato', 'war', 'military', 'invasion', 'ceasefire', 'sanctions', 'treaty', 'diplomacy', 'iran', 'israel', 'palestine', 'gaza', 'middle east', 'north korea'];
        if (geopoliticsKeywords.some(kw => titleLower.includes(kw))) {
            categories.push('Geopolitics');
        }

        // Sports keywords
        const sportsKeywords = ['nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'championship', 'playoffs', 'game', 'match', 'football', 'basketball', 'baseball', 'soccer', 'ufc', 'boxing', 'tennis', 'golf', 'olympics'];
        if (sportsKeywords.some(kw => titleLower.includes(kw))) {
            categories.push('Sports');
        }

        // Finance keywords (markets, stocks, economy)
        const financeKeywords = ['fed', 'interest rate', 'inflation', 'gdp', 'unemployment', 'recession', 'stock', 's&p', 'nasdaq', 'dow', 'treasury', 'bond', 'yield', 'market', 'economy', 'jobs report', 'earnings'];
        if (financeKeywords.some(kw => titleLower.includes(kw))) {
            categories.push('Finance');
        }

        // Tech keywords
        const techKeywords = ['apple', 'google', 'microsoft', 'meta', 'amazon', 'nvidia', 'tesla', 'ai', 'artificial intelligence', 'chatgpt', 'openai', 'tech', 'iphone', 'android', 'software', 'startup'];
        if (techKeywords.some(kw => titleLower.includes(kw))) {
            categories.push('Tech');
        }

        // Culture keywords (entertainment, celebrities, social)
        const cultureKeywords = ['oscars', 'grammy', 'celebrity', 'movie', 'film', 'tv show', 'netflix', 'disney', 'music', 'album', 'twitter', 'tiktok', 'viral', 'influencer', 'kardashian', 'swift', 'taylor'];
        if (cultureKeywords.some(kw => titleLower.includes(kw))) {
            categories.push('Culture');
        }

        // World keywords (international events not geopolitical)
        const worldKeywords = ['climate', 'earthquake', 'hurricane', 'pandemic', 'who', 'united nations', 'world cup', 'pope', 'royal', 'queen', 'king charles', 'paris', 'london', 'tokyo', 'brazil', 'india', 'africa'];
        if (worldKeywords.some(kw => titleLower.includes(kw))) {
            categories.push('World');
        }

        return categories;
    }

    /**
     * Called to update High Water Mark after a profitable trade closed
     * Note: HWM is now updated by the ChallengeEvaluator after each trade.
     * This method is kept for backward compatibility but is effectively a no-op.
     */
    static async updateHighWaterMark(challengeId: string, newBalance: number) {
        // HWM updates are handled by ChallengeEvaluator.evaluate()
        // See evaluator.ts lines 102-107
        console.log(`[RiskEngine] HWM update called for ${challengeId.slice(0, 8)}, delegating to evaluator`);
    }
}
