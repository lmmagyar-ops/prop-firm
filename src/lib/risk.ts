import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ChallengeRules } from "@/types/trading";
import { getActiveMarkets, getMarketById, MarketMetadata } from "@/app/actions/market";
import { ArbitrageDetector } from "./arbitrage-detector";
import { MarketService } from "./market";
import { getPortfolioValue } from "./position-utils";
import { createLogger } from "./logger";

const logger = createLogger('RiskEngine');

// ─── Types ──────────────────────────────────────────────────────────

interface RiskResult {
    allowed: boolean;
    reason?: string;
}

// ─── Risk Engine ────────────────────────────────────────────────────

export class RiskEngine {

    /**
     * Pre-trade risk validation — 9-layer protocol.
     *
     * Checks (in order): total drawdown, daily drawdown, per-event exposure,
     * category exposure, volume-tiered exposure, liquidity, minimum volume,
     * position limits, arbitrage detection.
     *
     * Returns { allowed: true } or { allowed: false, reason: string }.
     */
    static async validateTrade(
        challengeId: string,
        marketId: string,
        tradeAmount: number,
        estimatedLoss: number = 0,
        direction: "YES" | "NO" = "YES"
    ): Promise<RiskResult> {
        // ── Fetch challenge state ──────────────────────────────────
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId));

        if (!challenge || challenge.status !== "active") {
            return { allowed: false, reason: "Challenge not active" };
        }

        const rules = challenge.rulesConfig as unknown as ChallengeRules;
        const currentBalance = parseFloat(challenge.currentBalance);
        const startBalance = parseFloat(challenge.startingBalance);
        const sodBalance = parseFloat(challenge.startOfDayBalance || challenge.currentBalance);

        // ── Fetch all open positions ONCE (reused across rules) ────
        const allOpenPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.status, "OPEN")
            )
        });

        // ── Calculate equity via shared utility ────────────────────
        const positionMarketIds = allOpenPositions.map(p => p.marketId);
        const livePrices = positionMarketIds.length > 0
            ? await MarketService.getBatchOrderBookPrices(positionMarketIds)
            : new Map();

        const portfolio = getPortfolioValue(allOpenPositions, livePrices);
        const currentEquity = currentBalance + portfolio.totalValue;

        // ── Collect audit data as we evaluate rules ────────────────
        const audit: Record<string, unknown> = {
            challengeId: challengeId.slice(0, 8),
            marketId: marketId.slice(0, 12),
            tradeAmount,
            direction,
            cashBalance: currentBalance,
            positionValue: portfolio.totalValue,
            equity: currentEquity,
            startBalance,
            openPositions: allOpenPositions.length,
        };

        // ── RULE 1: MAX TOTAL DRAWDOWN (8% static) ────────────────
        const MAX_TOTAL_DD_PERCENT = rules.maxTotalDrawdownPercent || 0.08;
        const totalEquityFloor = startBalance * (1 - MAX_TOTAL_DD_PERCENT);

        if (currentEquity - estimatedLoss < totalEquityFloor) {
            return this.deny(`Max Total Drawdown (8%) Reached. Floor: $${totalEquityFloor.toFixed(2)}, Equity: $${currentEquity.toFixed(2)}`, audit);
        }

        // ── RULE 2: MAX DAILY DRAWDOWN (4% of STARTING balance) ───
        // AUDIT FIX: Use startBalance (not sodBalance) as base — aligns with
        // evaluator.ts and risk-monitor.ts for consistent enforcement.
        const MAX_DAILY_DD_PERCENT = rules.maxDailyDrawdownPercent || 0.04;
        const maxDailyLoss = MAX_DAILY_DD_PERCENT * startBalance;
        const dailyEquityFloor = sodBalance - maxDailyLoss;

        if (currentEquity - estimatedLoss < dailyEquityFloor) {
            return this.deny(`Max Daily Loss (${(MAX_DAILY_DD_PERCENT * 100).toFixed(0)}%) Reached. Daily Floor: $${dailyEquityFloor.toFixed(2)}, Equity: $${currentEquity.toFixed(2)}`, audit);
        }

        // ── RULE 3: PER-EVENT EXPOSURE (5%) ───────────────────────
        const { getEventInfoForMarket } = await import("@/app/actions/market");
        const eventInfo = await getEventInfoForMarket(marketId);
        const maxPerEvent = startBalance * (rules.maxPositionSizePercent || 0.05);

        // Sum exposure across ALL sibling markets in this event
        const marketIdsToCheck = eventInfo?.siblingMarketIds || [marketId];
        const currentExposure = allOpenPositions
            .filter(p => marketIdsToCheck.includes(p.marketId))
            .reduce((sum, p) => sum + parseFloat(p.sizeAmount), 0);

        const remainingEventCapacity = maxPerEvent - currentExposure;

        // Fail-safe: block large trades when event lookup fails
        if (!eventInfo && tradeAmount > maxPerEvent) {
            return this.deny(`Trade of $${tradeAmount.toFixed(2)} exceeds max per-market limit of $${maxPerEvent.toFixed(2)}`, audit);
        }

        // ── RULE 4: PER-CATEGORY EXPOSURE (10%) ───────────────────
        const market = await getMarketById(marketId);

        const marketCategories = market?.categories?.length
            ? market.categories
            : this.inferCategoriesFromTitle(market?.question || "");

        if (marketCategories.length > 0) {
            const maxPerCategory = startBalance * (rules.maxCategoryExposurePercent || 0.10);
            const allMarkets = await getActiveMarkets();

            for (const category of marketCategories) {
                const categoryExposure = this.getCategoryExposureFromCache(allOpenPositions, category, allMarkets);
                if (categoryExposure + tradeAmount > maxPerCategory) {
                    return this.deny(`Max ${category} exposure (10%) exceeded. Current: $${categoryExposure.toFixed(2)}, Limit: $${maxPerCategory.toFixed(2)}`, audit);
                }
            }
        }

        // ── RULES 5-7: VOLUME-BASED CHECKS ────────────────────────
        if (!market) {
            return this.deny("Market data unavailable. Please try again or choose a different market.", audit);
        }

        const rawVolume = market.volume;
        const marketVolume = typeof rawVolume === "string" ? parseFloat(rawVolume) : (rawVolume || 0);
        audit.marketVolume = marketVolume;

        // RULE 3+5 COMBINED: Show user the tighter of per-event remaining capacity
        // and volume-tiered single-trade limit to avoid cascading confusing errors
        const volumeExposureLimit = this.getExposureLimitByVolume(startBalance, marketVolume);
        const effectiveMax = volumeExposureLimit > 0
            ? Math.min(remainingEventCapacity, volumeExposureLimit)
            : remainingEventCapacity;

        if (tradeAmount > effectiveMax && effectiveMax > 0) {
            const limitPercent = ((effectiveMax / startBalance) * 100).toFixed(1);
            return this.deny(`Max single trade for this market: $${effectiveMax.toFixed(0)} (${limitPercent}% of account). Enter a smaller amount.`, audit);
        }

        // Edge case: both limits are 0 or negative (fully allocated)
        if (effectiveMax <= 0 && tradeAmount > 0) {
            return this.deny(`You've reached max exposure for this event. Close existing positions to open new ones.`, audit);
        }

        // RULE 6: Liquidity enforcement (10% of 24h volume)
        const maxImpact = marketVolume * (rules.maxVolumeImpactPercent || 0.10);
        if (tradeAmount > maxImpact && maxImpact > 0) {
            return this.deny(`Trade too large for this market. Max trade: $${maxImpact.toFixed(0)}. Try a smaller amount.`, audit);
        }

        // RULE 7: Minimum volume filter
        const minVolume = rules.minMarketVolume || 100_000;
        if (marketVolume < minVolume) {
            return this.deny(`This market has insufficient volume ($${marketVolume.toLocaleString()}). Minimum required: $${minVolume.toLocaleString()}.`, audit);
        }

        // ── RULE 8: MAX OPEN POSITIONS (tiered) ───────────────────
        const maxPositions = this.getMaxPositionsForTier(startBalance);
        if (allOpenPositions.length >= maxPositions) {
            return this.deny(`Max ${maxPositions} open positions allowed for your account tier. Currently: ${allOpenPositions.length}`, audit);
        }

        // ── RULE 9: ARBITRAGE BLOCK ───────────────────────────────
        const arbCheck = await ArbitrageDetector.wouldCreateArbitrage(
            challengeId, marketId, direction, challenge.platform as "polymarket" | "kalshi"
        );
        if (arbCheck.isArb) {
            return this.deny(arbCheck.reason || "Arbitrage detected", audit);
        }

        // ── ALL RULES PASSED ──────────────────────────────────────
        audit.result = "ALLOWED";
        logger.info('Risk check passed', audit);
        return { allowed: true };
    }

    // ─── Helper: Deny trade with structured log ──────────────────

    private static deny(reason: string, audit: Record<string, unknown>): RiskResult {
        audit.result = "BLOCKED";
        audit.reason = reason;
        logger.warn('Risk check blocked', audit);
        return { allowed: false, reason };
    }

    // ─── Tier-based position limits ──────────────────────────────

    private static getMaxPositionsForTier(startingBalance: number): number {
        if (startingBalance >= 25000) return 20;
        if (startingBalance >= 10000) return 15;
        if (startingBalance >= 5000) return 10;
        return 5;
    }

    // ─── Volume-tiered exposure limits ───────────────────────────

    private static getExposureLimitByVolume(balance: number, volume: number): number {
        if (volume >= 10_000_000) return balance * 0.05;   // >$10M → 5%
        if (volume >= 1_000_000) return balance * 0.025;   // $1-10M → 2.5%
        if (volume >= 100_000) return balance * 0.02;      // $100k-1M → 2%
        return 0; // Block trading on <$100k volume (handled by RULE 7)
    }

    // ─── Category exposure (in-memory, using pre-fetched positions) ──

    private static getCategoryExposureFromCache(
        openPositions: { marketId: string; sizeAmount: string }[],
        category: string,
        markets: MarketMetadata[]
    ): number {
        let totalExposure = 0;
        for (const pos of openPositions) {
            const market = markets.find(m => m.id === pos.marketId);
            const marketCategories = market?.categories?.length
                ? market.categories
                : this.inferCategoriesFromTitle(market?.question || "");
            if (marketCategories.includes(category)) {
                totalExposure += parseFloat(pos.sizeAmount);
            }
        }
        return totalExposure;
    }

    // ─── Category inference from market titles ───────────────────

    private static inferCategoriesFromTitle(title: string): string[] {
        const categories: string[] = [];
        const t = title.toLowerCase();

        const CATEGORY_KEYWORDS: [string, string[]][] = [
            ["Crypto", ["bitcoin", "btc", "ethereum", "eth", "crypto", "solana", "sol", "dogecoin", "doge", "xrp", "ripple", "blockchain", "nft", "defi"]],
            ["Politics", ["trump", "biden", "president", "election", "congress", "senate", "governor", "vote", "democrat", "republican", "political", "kamala", "harris", "desantis", "white house"]],
            ["Geopolitics", ["ukraine", "russia", "china", "taiwan", "nato", "war", "military", "invasion", "ceasefire", "sanctions", "treaty", "diplomacy", "iran", "israel", "palestine", "gaza", "middle east", "north korea"]],
            ["Sports", ["nfl", "nba", "mlb", "nhl", "super bowl", "championship", "playoffs", "game", "match", "football", "basketball", "baseball", "soccer", "ufc", "boxing", "tennis", "golf", "olympics"]],
            ["Finance", ["fed", "interest rate", "inflation", "gdp", "unemployment", "recession", "stock", "s&p", "nasdaq", "dow", "treasury", "bond", "yield", "market", "economy", "jobs report", "earnings"]],
            ["Tech", ["apple", "google", "microsoft", "meta", "amazon", "nvidia", "tesla", "ai", "artificial intelligence", "chatgpt", "openai", "tech", "iphone", "android", "software", "startup"]],
            ["Culture", ["oscars", "grammy", "celebrity", "movie", "film", "tv show", "netflix", "disney", "music", "album", "twitter", "tiktok", "viral", "influencer", "kardashian", "swift", "taylor"]],
            ["World", ["climate", "earthquake", "hurricane", "pandemic", "who", "united nations", "world cup", "pope", "royal", "queen", "king charles", "paris", "london", "tokyo", "brazil", "india", "africa"]],
        ];

        for (const [category, keywords] of CATEGORY_KEYWORDS) {
            if (keywords.some(kw => t.includes(kw))) {
                categories.push(category);
            }
        }

        return categories;
    }
}
