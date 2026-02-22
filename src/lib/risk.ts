import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ChallengeRules } from "@/types/trading";
import { getActiveMarkets, getAllMarketsFlat, getMarketById, MarketMetadata } from "@/app/actions/market";
import { ArbitrageDetector } from "./arbitrage-detector";
import { MarketService } from "./market";
import { getPortfolioValue } from "./position-utils";
import { MIN_MARKET_VOLUME } from "@/config/trading-constants";
import { createLogger } from "./logger";

const logger = createLogger('RiskEngine');

// ─── Types ──────────────────────────────────────────────────────────

interface RiskResult {
    allowed: boolean;
    reason?: string;
}

// ─── Preflight Types ────────────────────────────────────────────────

export interface TradeLimits {
    effectiveMax: number;
    bindingConstraint: string;
    limits: {
        balance: number;
        perEvent: number;
        perEventRemaining: number;
        perCategory: number;
        perCategoryRemaining: number;
        volumeLimit: number;
        liquidityLimit: number;
        dailyLossRemaining: number;
        drawdownRemaining: number;
    };
    meta: {
        openPositions: number;
        maxPositions: number;
        categories: string[];
        startingBalance: number;
        positionsAtCap: boolean;
    };
}

// ─── Shared challenge context (reused by validate + preflight) ──────

interface ChallengeContext {
    challenge: {
        id: string;
        status: string;
        currentBalance: string;
        startingBalance: string;
        startOfDayBalance: string | null;
        rulesConfig: unknown;
        platform: string | null;
    };
    rules: ChallengeRules;
    currentBalance: number;
    startBalance: number;
    sodBalance: number;
    allOpenPositions: { id: string; marketId: string; sizeAmount: string; challengeId: string | null; shares: string; direction: string; entryPrice: string; currentPrice: string | null; status: string | null }[];
    currentEquity: number;
    portfolioValue: number;
}

// ─── Noise categories that Polymarket applies to every trending market ──
// These are too broad to be meaningful for exposure limits — "Breaking"
// groups unrelated markets like Fed rate decisions and Iran strikes.
const NOISE_CATEGORIES = new Set(['Breaking', 'New', 'Featured', 'Popular']);

export function filterNoiseCategories(categories: string[]): string[] {
    const meaningful = categories.filter(c => !NOISE_CATEGORIES.has(c));
    // If ALL categories are noise, keep original list (don't bypass limits entirely)
    return meaningful.length > 0 ? meaningful : categories;
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

        // ── RULES 1-2: DRAWDOWN CHECK (HARD BLOCK) ─────────────────
        // Instantly reject trades if trader is already in drawdown breach.
        // This closes the 30s window that existed when only the risk-monitor checked.
        const MAX_TOTAL_DD_PERCENT = rules.maxTotalDrawdownPercent || 0.08;
        const totalEquityFloor = startBalance * (1 - MAX_TOTAL_DD_PERCENT);
        const MAX_DAILY_DD_PERCENT = rules.maxDailyDrawdownPercent || 0.04;
        const maxDailyLoss = MAX_DAILY_DD_PERCENT * startBalance;
        const dailyEquityFloor = sodBalance - maxDailyLoss;

        audit.drawdownRoom = currentEquity - totalEquityFloor;
        audit.dailyLossRoom = currentEquity - dailyEquityFloor;

        // RULE 1: Total drawdown hard block
        if (currentEquity <= totalEquityFloor) {
            return this.deny(
                `Account breached max drawdown. Equity: $${currentEquity.toFixed(0)}, Floor: $${totalEquityFloor.toFixed(0)}. Trading disabled.`,
                audit
            );
        }

        // RULE 2: Daily drawdown hard block
        if (currentEquity <= dailyEquityFloor) {
            return this.deny(
                `Daily loss limit breached. Equity: $${currentEquity.toFixed(0)}, Daily floor: $${dailyEquityFloor.toFixed(0)}. Trading disabled until tomorrow.`,
                audit
            );
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

        // Fail-safe: if event lookup fails, use per-event limit directly (conservative)
        if (!eventInfo && tradeAmount > maxPerEvent) {
            const limitPercent = ((maxPerEvent / startBalance) * 100).toFixed(1);
            return this.deny(`Max single trade for this market: $${maxPerEvent.toFixed(0)} (${limitPercent}% of account). Enter a smaller amount.`, audit);
        }

        // ── RULE 4: PER-CATEGORY EXPOSURE (10%) ───────────────────
        const market = await getMarketById(marketId);

        const rawCategories = market?.categories?.length
            ? market.categories
            : this.inferCategoriesFromTitle(market?.question || "");

        // Filter Polymarket noise categories ("Breaking", "New") that group unrelated markets
        const marketCategories = filterNoiseCategories(rawCategories);

        // Fallback: uncategorized markets count against an "other" catch-all
        // This prevents uncategorized markets from bypassing category exposure limits
        const effectiveCategories = marketCategories.length > 0
            ? marketCategories
            : ["other"];

        {
            const maxPerCategory = startBalance * (rules.maxCategoryExposurePercent || 0.10);
            const allMarkets = await getAllMarketsFlat();

            for (const category of effectiveCategories) {
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
        // Use the LOWER of per-challenge rule and global env var.
        // Existing challenges have minMarketVolume=100K baked into rulesConfig.
        // Math.min lets the env var loosen restrictions across all challenges.
        const minVolume = Math.min(
            rules.minMarketVolume || MIN_MARKET_VOLUME,
            MIN_MARKET_VOLUME
        );
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
            challengeId, marketId, direction
        );
        if (arbCheck.isArb) {
            return this.deny(arbCheck.reason || "Arbitrage detected", audit);
        }

        // ── ALL RULES PASSED ──────────────────────────────────────
        audit.result = "ALLOWED";
        logger.info('Risk check passed', audit);
        return { allowed: true };
    }

    // ─── Preflight: Return all limits as structured data ─────────

    static async getPreflightLimits(
        challengeId: string,
        marketId: string
    ): Promise<TradeLimits> {
        const ctx = await this.fetchChallengeContext(challengeId);

        if (!ctx) {
            return this.emptyLimits('No active challenge');
        }

        const { rules, currentBalance, startBalance, sodBalance, allOpenPositions, currentEquity } = ctx;

        // ── Per-event limit ────────────────────────────────────────
        const { getEventInfoForMarket } = await import("@/app/actions/market");
        const eventInfo = await getEventInfoForMarket(marketId);
        const perEvent = startBalance * (rules.maxPositionSizePercent || 0.05);
        const marketIdsToCheck = eventInfo?.siblingMarketIds || [marketId];
        const currentEventExposure = allOpenPositions
            .filter(p => marketIdsToCheck.includes(p.marketId))
            .reduce((sum, p) => sum + parseFloat(p.sizeAmount), 0);
        const perEventRemaining = Math.max(0, perEvent - currentEventExposure);

        // ── Per-category limit ─────────────────────────────────────
        const market = await getMarketById(marketId);
        const rawCats = market?.categories?.length
            ? market.categories
            : this.inferCategoriesFromTitle(market?.question || "");
        const marketCategories = filterNoiseCategories(rawCats);

        const perCategory = startBalance * (rules.maxCategoryExposurePercent || 0.10);
        let perCategoryRemaining = perCategory;

        if (marketCategories.length > 0) {
            const allMarkets = await getAllMarketsFlat();
            // Find the tightest category constraint
            for (const category of marketCategories) {
                const catExposure = this.getCategoryExposureFromCache(allOpenPositions, category, allMarkets);
                const remaining = Math.max(0, perCategory - catExposure);
                if (remaining < perCategoryRemaining) {
                    perCategoryRemaining = remaining;
                }
            }
        }

        // ── Volume-based limits ────────────────────────────────────
        const rawVolume = market?.volume ?? 0;
        const marketVolume = typeof rawVolume === "string" ? parseFloat(rawVolume) : rawVolume;
        const volumeLimit = this.getExposureLimitByVolume(startBalance, marketVolume);
        const liquidityLimit = marketVolume * (rules.maxVolumeImpactPercent || 0.10);

        // ── Drawdown limits ───────────────────────────────────────
        const MAX_TOTAL_DD = rules.maxTotalDrawdownPercent || 0.08;
        const totalEquityFloor = startBalance * (1 - MAX_TOTAL_DD);
        const drawdownRemaining = Math.max(0, currentEquity - totalEquityFloor);

        const MAX_DAILY_DD = rules.maxDailyDrawdownPercent || 0.04;
        const maxDailyLoss = MAX_DAILY_DD * startBalance;
        const dailyEquityFloor = sodBalance - maxDailyLoss;
        const dailyLossRemaining = Math.max(0, currentEquity - dailyEquityFloor);

        // ── Position count ────────────────────────────────────────
        const maxPositions = this.getMaxPositionsForTier(startBalance);
        const positionsAtCap = allOpenPositions.length >= maxPositions;

        // ── Compute effective max ─────────────────────────────────
        // Drawdown is NOT a pre-trade sizing constraint.
        // Max is based on the per-event cap, not remaining drawdown room.
        // Drawdown breach is evaluated post-resolution by the evaluator.
        const candidateLimits: { name: string; value: number }[] = [
            { name: 'balance', value: currentBalance },
            { name: 'per_event', value: perEventRemaining },
            { name: 'per_category', value: perCategoryRemaining },
        ];

        // Only include volume/liquidity if they're meaningful (> 0)
        if (volumeLimit > 0) candidateLimits.push({ name: 'volume_tier', value: volumeLimit });
        if (liquidityLimit > 0) candidateLimits.push({ name: 'liquidity', value: liquidityLimit });

        // If positions are at cap, effective max is 0
        if (positionsAtCap) candidateLimits.push({ name: 'max_positions', value: 0 });

        const binding = candidateLimits.reduce((min, c) => c.value < min.value ? c : min, candidateLimits[0]);
        const effectiveMax = Math.max(0, Math.floor(binding.value));

        return {
            effectiveMax,
            bindingConstraint: binding.name,
            limits: {
                balance: Math.floor(currentBalance),
                perEvent,
                perEventRemaining: Math.floor(perEventRemaining),
                perCategory,
                perCategoryRemaining: Math.floor(perCategoryRemaining),
                volumeLimit: Math.floor(volumeLimit),
                liquidityLimit: Math.floor(liquidityLimit),
                dailyLossRemaining: Math.floor(dailyLossRemaining),
                drawdownRemaining: Math.floor(drawdownRemaining),
            },
            meta: {
                openPositions: allOpenPositions.length,
                maxPositions,
                categories: marketCategories,
                startingBalance: startBalance,
                positionsAtCap,
            },
        };
    }

    // ─── Shared data fetch for challenge context ─────────────────

    private static async fetchChallengeContext(challengeId: string): Promise<ChallengeContext | null> {
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId));

        if (!challenge || challenge.status !== "active") return null;

        const rules = challenge.rulesConfig as unknown as ChallengeRules;
        const currentBalance = parseFloat(challenge.currentBalance);
        const startBalance = parseFloat(challenge.startingBalance);
        const sodBalance = parseFloat(challenge.startOfDayBalance || challenge.currentBalance);

        const allOpenPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.status, "OPEN")
            )
        });

        const positionMarketIds = allOpenPositions.map(p => p.marketId);
        const livePrices = positionMarketIds.length > 0
            ? await MarketService.getBatchOrderBookPrices(positionMarketIds)
            : new Map();

        const portfolio = getPortfolioValue(allOpenPositions, livePrices);
        const currentEquity = currentBalance + portfolio.totalValue;

        return {
            challenge,
            rules,
            currentBalance,
            startBalance,
            sodBalance,
            allOpenPositions,
            currentEquity,
            portfolioValue: portfolio.totalValue,
        };
    }

    // ─── Empty limits fallback ───────────────────────────────────

    private static emptyLimits(reason: string): TradeLimits {
        return {
            effectiveMax: 0,
            bindingConstraint: reason,
            limits: {
                balance: 0, perEvent: 0, perEventRemaining: 0,
                perCategory: 0, perCategoryRemaining: 0,
                volumeLimit: 0, liquidityLimit: 0,
                dailyLossRemaining: 0, drawdownRemaining: 0,
            },
            meta: {
                openPositions: 0, maxPositions: 0,
                categories: [], startingBalance: 0, positionsAtCap: true,
            },
        };
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
        if (volume >= MIN_MARKET_VOLUME) return balance * 0.015; // Configurable floor → 1.5%
        return 0; // Block trading below MIN_MARKET_VOLUME (handled by RULE 7)
    }

    // ─── Category exposure (in-memory, using pre-fetched positions) ──

    private static getCategoryExposureFromCache(
        openPositions: { marketId: string; sizeAmount: string; shares: string; entryPrice: string }[],
        category: string,
        markets: MarketMetadata[]
    ): number {
        let totalExposure = 0;
        for (const pos of openPositions) {
            const market = markets.find(m => m.id === pos.marketId);
            const rawCats = market?.categories?.length
                ? market.categories
                : this.inferCategoriesFromTitle(market?.question || "");
            const marketCategories = filterNoiseCategories(rawCats);
            if (marketCategories.includes(category)) {
                // Use notional value (shares × entry price) not cost basis (sizeAmount).
                // sizeAmount understates exposure when prices move.
                const shares = parseFloat(pos.shares);
                const price = parseFloat(pos.entryPrice);
                // Round to 2dp to prevent float erosion ($500.0002 → $500.00)
                totalExposure += Math.round(shares * price * 100) / 100;
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
