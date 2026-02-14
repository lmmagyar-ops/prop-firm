/**
 * Category Audit Script
 * 
 * Audits market categorization coverage to determine if the $1,000 category cap
 * is being properly enforced. Checks how many markets fall into each category
 * vs. the "other" catch-all bucket.
 * 
 * Usage: npx tsx scripts/audit-categories.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Inline the category inference logic from risk.ts to avoid import issues
function inferCategoriesFromTitle(title: string): string[] {
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

async function main() {
    // Fetch market data from Redis via the worker-client pattern
    // We need to access the same data the risk engine uses
    const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL;

    if (!REDIS_URL) {
        console.error("❌ REDIS_URL or KV_URL not set. Run with: REDIS_URL=<url> npx tsx scripts/audit-categories.ts");
        process.exit(1);
    }

    // Use ioredis for direct Redis access
    const { default: Redis } = await import("ioredis");
    const redis = new Redis(REDIS_URL);

    try {
        // Fetch the same data getAllMarketData() uses
        const [marketsRaw, eventsRaw, kalshiRaw] = await Promise.all([
            redis.get("market:active_list"),
            redis.get("event:active_list"),
            redis.get("kalshi:active_list"),
        ]);

        const markets = marketsRaw ? JSON.parse(marketsRaw) : [];
        const events = eventsRaw ? JSON.parse(eventsRaw) : [];
        const kalshi = kalshiRaw ? JSON.parse(kalshiRaw) : [];

        console.log(`\n📊 Category Audit Report`);
        console.log(`${"=".repeat(60)}\n`);
        console.log(`Data sources:`);
        console.log(`  Binary markets: ${markets.length}`);
        console.log(`  Polymarket events: ${events.length}`);
        console.log(`  Kalshi events: ${kalshi.length}\n`);

        // Collect ALL markets (same logic as getAllMarketsFlat)
        interface MarketEntry {
            id: string;
            question: string;
            apiCategories: string[];
            inferredCategories: string[];
            effectiveCategories: string[];
            source: string;
        }

        const allMarkets: MarketEntry[] = [];

        // Binary markets
        for (const m of markets) {
            const apiCats = m.categories || [];
            const inferredCats = inferCategoriesFromTitle(m.question || "");
            const effective = apiCats.length > 0 ? apiCats : (inferredCats.length > 0 ? inferredCats : ["other"]);

            allMarkets.push({
                id: m.id,
                question: m.question || "(no title)",
                apiCategories: apiCats,
                inferredCategories: inferredCats,
                effectiveCategories: effective,
                source: "binary",
            });
        }

        // Polymarket event sub-markets
        for (const event of events) {
            const eventCats = event.categories || [];
            for (const sub of (event.markets || [])) {
                const inferredCats = inferCategoriesFromTitle(sub.question || event.title || "");
                const effective = eventCats.length > 0 ? eventCats : (inferredCats.length > 0 ? inferredCats : ["other"]);

                allMarkets.push({
                    id: sub.id,
                    question: sub.question || "(no title)",
                    apiCategories: eventCats,
                    inferredCategories: inferredCats,
                    effectiveCategories: effective,
                    source: "polymarket-event",
                });
            }
        }

        // Kalshi event sub-markets
        for (const event of kalshi) {
            const eventCats = event.categories || [];
            for (const sub of (event.markets || [])) {
                const inferredCats = inferCategoriesFromTitle(sub.question || event.title || "");
                const effective = eventCats.length > 0 ? eventCats : (inferredCats.length > 0 ? inferredCats : ["other"]);

                allMarkets.push({
                    id: sub.id,
                    question: sub.question || "(no title)",
                    apiCategories: eventCats,
                    inferredCategories: inferredCats,
                    effectiveCategories: effective,
                    source: "kalshi-event",
                });
            }
        }

        console.log(`Total tradable markets: ${allMarkets.length}\n`);

        // Category distribution
        const categoryCount: Record<string, number> = {};
        for (const m of allMarkets) {
            for (const cat of m.effectiveCategories) {
                categoryCount[cat] = (categoryCount[cat] || 0) + 1;
            }
        }

        console.log(`📂 Category Distribution (effective):`);
        console.log(`${"─".repeat(40)}`);
        const sorted = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
        for (const [cat, count] of sorted) {
            const pct = ((count / allMarkets.length) * 100).toFixed(1);
            const bar = "█".repeat(Math.round(count / 2));
            console.log(`  ${cat.padEnd(15)} ${String(count).padStart(4)} (${pct.padStart(5)}%) ${bar}`);
        }

        // API vs inferred breakdown
        const apiCoverage = allMarkets.filter(m => m.apiCategories.length > 0).length;
        const inferredOnly = allMarkets.filter(m => m.apiCategories.length === 0 && m.inferredCategories.length > 0).length;
        const uncategorized = allMarkets.filter(m => m.effectiveCategories.includes("other")).length;

        console.log(`\n📡 Categorization Source:`);
        console.log(`${"─".repeat(40)}`);
        console.log(`  API categories:      ${String(apiCoverage).padStart(4)} (${((apiCoverage / allMarkets.length) * 100).toFixed(1)}%)`);
        console.log(`  Keyword inference:   ${String(inferredOnly).padStart(4)} (${((inferredOnly / allMarkets.length) * 100).toFixed(1)}%)`);
        console.log(`  Uncategorized:       ${String(uncategorized).padStart(4)} (${((uncategorized / allMarkets.length) * 100).toFixed(1)}%) ⚠️`);

        // Show uncategorized markets
        if (uncategorized > 0) {
            console.log(`\n⚠️  "Other" bucket markets (no category match):`);
            console.log(`${"─".repeat(60)}`);
            const otherMarkets = allMarkets.filter(m => m.effectiveCategories.includes("other"));
            for (const m of otherMarkets.slice(0, 20)) {
                console.log(`  [${m.source}] ${m.question.slice(0, 70)}`);
            }
            if (otherMarkets.length > 20) {
                console.log(`  ... and ${otherMarkets.length - 20} more`);
            }
        }

        // Risk assessment
        console.log(`\n🎯 Risk Assessment:`);
        console.log(`${"─".repeat(40)}`);
        if (uncategorized === 0) {
            console.log(`  ✅ All markets are categorized. Category cap enforcement is solid.`);
        } else if (uncategorized <= 5) {
            console.log(`  ✅ Only ${uncategorized} uncategorized markets. Low risk of cap bypass.`);
        } else if (uncategorized <= 15) {
            console.log(`  ⚠️  ${uncategorized} uncategorized markets sharing one "other" bucket.`);
            console.log(`     A trader can only deploy $1,000 across ALL of these combined.`);
            console.log(`     This is MORE restrictive than intended, not less. No cap bypass risk.`);
        } else {
            console.log(`  🔴 ${uncategorized} uncategorized markets in "other" bucket.`);
            console.log(`     Risk: Many unrelated markets share one $1,000 limit.`);
            console.log(`     This over-constrains traders, but does NOT allow bypassing caps.`);
            console.log(`     Consider expanding keyword lists for better coverage.`);
        }

        console.log(`\n${"=".repeat(60)}\n`);

    } finally {
        await redis.quit();
    }
}

main().catch(console.error);
