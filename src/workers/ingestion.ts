import WebSocket from "ws";
import * as dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config();

const CLOB_WS_URL = "wss://ws-live-data.polymarket.com";
// Gamma API Base: We append filters dynamically in fetchActiveMarkets
const GAMMA_API_URL = "https://gamma-api.polymarket.com/markets?limit=100&active=true&closed=false&order=volume&descending=true";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";

class IngestionWorker {
    private ws: WebSocket | null = null;
    private redis: Redis;
    private reconnectInterval = 5000;
    private activeTokenIds: string[] = [];

    constructor() {
        if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
            console.log(`[Ingestion] Connecting to Redis via HOST/PORT/PASS config...`);
            this.redis = new Redis({
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT || "6379"),
                password: process.env.REDIS_PASSWORD,
                tls: {} // Required for Upstash
            });
        } else {
            const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";
            console.log(`[Ingestion] Connecting to Redis via URL...`);
            this.redis = new Redis(REDIS_URL);
        }

        this.init();
    }

    /**
     * Get all applicable categories for a market
     * Returns array so markets can appear in multiple tabs (like Polymarket)
     */
    private getCategories(apiCategory: string | null, question: string): string[] {
        const categories: string[] = [];
        const q = question.toLowerCase();

        // Map Polymarket's native category first
        const categoryMap: Record<string, string> = {
            'US-current-affairs': 'Politics',
            'Crypto': 'Crypto',
            'Sports': 'Sports',
            'NBA Playoffs': 'Sports',
            'Olympics': 'Sports',
            'Business': 'Business',
            'Tech': 'Tech',
            'Science': 'Science',
            'Pop-Culture': 'Culture',
            'Pop-Culture ': 'Culture',
            'NFTs': 'Crypto',
            'Coronavirus': 'World',
        };

        if (apiCategory && categoryMap[apiCategory]) {
            categories.push(categoryMap[apiCategory]);
        }

        // US Politics (domestic)
        if (q.includes('trump') || q.includes('biden') || q.includes('election') ||
            q.includes('president') || q.includes('congress') || q.includes('senate') ||
            q.includes('democrat') || q.includes('republican') || q.includes('doge ') ||
            q.includes('musk') || q.includes('elon') || q.includes('cabinet')) {
            if (!categories.includes('Politics')) categories.push('Politics');
        }

        // Geopolitics (international)
        if (q.includes('putin') || q.includes('ukraine') || q.includes('russia') ||
            q.includes('zelensky') || q.includes('nato') || q.includes('israel') ||
            q.includes('netanyahu') || q.includes('iran') || q.includes('china') ||
            q.includes('xi') || q.includes('ceasefire') || q.includes('war') ||
            q.includes('nuclear') || q.includes('maduro') || q.includes('venezuela') ||
            q.includes('kim jong') || q.includes('north korea') || q.includes('sanctions')) {
            if (!categories.includes('Geopolitics')) categories.push('Geopolitics');
        }

        // Crypto
        if (q.includes('bitcoin') || q.includes('btc') || q.includes('ethereum') ||
            q.includes('eth') || q.includes('crypto') || q.includes('solana') ||
            q.includes('xrp') || q.includes('tether') || q.includes('usdt')) {
            if (!categories.includes('Crypto')) categories.push('Crypto');
        }

        // Sports
        if (q.includes('nfl') || q.includes('nba') || q.includes('super bowl') ||
            q.includes('world cup') || q.includes('playoffs') || q.includes('championship') ||
            q.includes('world series') || q.includes('stanley cup') || q.includes('ufc')) {
            if (!categories.includes('Sports')) categories.push('Sports');
        }

        // Business/Finance
        if (q.includes('fed') || q.includes('recession') || q.includes('gdp') ||
            q.includes('stock') || q.includes('ceo') || q.includes('market cap') ||
            q.includes('ipo') || q.includes('earnings') || q.includes('s&p') ||
            q.includes('nasdaq') || q.includes('dow')) {
            if (!categories.includes('Business')) categories.push('Business');
        }

        // Tech
        if (q.includes('ai') || q.includes('openai') || q.includes('chatgpt') ||
            q.includes('google') || q.includes('apple') || q.includes('microsoft') ||
            q.includes('spacex') || q.includes('nvidia') || q.includes('tesla') ||
            q.includes('meta') || q.includes('amazon')) {
            if (!categories.includes('Tech')) categories.push('Tech');
        }

        // Culture (Entertainment, Pop Culture)
        if (q.includes('movie') || q.includes('oscar') || q.includes('grammy') ||
            q.includes('emmy') || q.includes('marvel') || q.includes('disney') ||
            q.includes('netflix') || q.includes('stranger things') || q.includes('kardashian') ||
            q.includes('celebrity') || q.includes('epstein') || q.includes('youtube') ||
            q.includes('tiktok') || q.includes('logan paul') || q.includes('mr beast') ||
            q.includes('avatar') || q.includes('star wars') || q.includes('album')) {
            if (!categories.includes('Culture')) categories.push('Culture');
        }

        // Default to Other if no categories matched
        if (categories.length === 0) {
            categories.push('Other');
        }

        return categories;
    }

    /**
     * Check if market is short-term spam (e.g., 5-minute crypto bets)
     */
    private isSpamMarket(question: string): boolean {
        const q = question.toLowerCase();
        // Filter out "Up or Down" minute-by-minute markets
        if (q.includes('up or down') && (q.includes('am') || q.includes('pm') || q.includes('et'))) {
            return true;
        }
        return false;
    }

    private async init() {
        await this.fetchFeaturedEvents(); // Fetch curated trending events first
        await this.fetchActiveMarkets(); // Then fetch remaining markets
        this.connectWS();
        this.startBookPolling();
    }

    /**
     * Fetch featured/curated events from Polymarket's Events API
     * These are the trending events displayed on Polymarket's homepage
     */
    private async fetchFeaturedEvents() {
        try {
            console.log("[Ingestion] Fetching Featured Events (Polymarket Trending)...");

            const url = "https://gamma-api.polymarket.com/events?featured=true&active=true&closed=false&limit=50";
            const response = await fetch(url);
            const events = await response.json();

            if (!Array.isArray(events)) {
                console.error("[Ingestion] Invalid response from Events API");
                return;
            }

            const processedEvents: any[] = [];
            const allEventTokenIds: string[] = [];

            for (const event of events) {
                try {
                    if (!event.markets || event.markets.length === 0) continue;

                    // Process each market within the event
                    const subMarkets: any[] = [];
                    for (const market of event.markets) {
                        if (market.closed || market.archived) continue;

                        const clobTokens = JSON.parse(market.clobTokenIds || '[]');
                        const outcomes = JSON.parse(market.outcomes || '[]');
                        const prices = JSON.parse(market.outcomePrices || '[]');

                        if (clobTokens.length === 0) continue;

                        // For events, each market is typically binary (Yes/No for each outcome)
                        const tokenId = clobTokens[0];
                        const yesPrice = parseFloat(prices[0] || "0.5");

                        if (yesPrice < 0.001) continue; // Skip near-zero markets

                        allEventTokenIds.push(tokenId);

                        subMarkets.push({
                            id: tokenId,
                            question: market.question,
                            outcomes: outcomes,
                            price: Math.max(yesPrice, 0.01),
                            volume: parseFloat(market.volume || "0"),
                        });
                    }

                    if (subMarkets.length === 0) continue;

                    // Sort sub-markets by price descending (highest probability first)
                    subMarkets.sort((a, b) => b.price - a.price);

                    const categories = this.getCategories(null, event.title);

                    processedEvents.push({
                        id: event.id || event.slug,
                        title: event.title,
                        slug: event.slug,
                        description: event.description,
                        image: event.image,
                        volume: event.volume || 0,
                        categories: categories,
                        markets: subMarkets,
                        isMultiOutcome: subMarkets.length > 1,
                    });
                } catch (e) {
                    // Skip invalid event
                }
            }

            // Store events in Redis
            await this.redis.set("event:active_list", JSON.stringify(processedEvents));
            console.log(`[Ingestion] Stored ${processedEvents.length} featured events (${allEventTokenIds.length} total markets).`);

            // Add event token IDs to active polling
            this.activeTokenIds = [...this.activeTokenIds, ...allEventTokenIds];

        } catch (err) {
            console.error("[Ingestion] Failed to fetch featured events:", err);
        }
    }


    private async fetchActiveMarkets() {
        try {
            console.log("[Ingestion] Fetching Diverse Markets (Category-Balanced)...");

            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const endDateMax = thirtyDaysFromNow.toISOString();

            // Fetch a large pool of active markets (high number to account for spam filtering)
            // Note: Removed end_date filter to get more variety
            const url = `https://gamma-api.polymarket.com/markets?limit=1000&active=true&closed=false`;
            console.log(`[Ingestion] Fetching pool of 1000 markets...`);

            const response = await fetch(url);
            const data = await response.json();

            if (!Array.isArray(data)) {
                console.error("[Ingestion] Invalid response from Gamma API");
                return;
            }

            // Minimum volume threshold for liquidity protection
            const MIN_VOLUME = 50000; // $50k minimum

            const categoryCounts: Record<string, number> = {};
            const allMarkets: any[] = [];
            const seenIds = new Set<string>();

            for (const m of data) {
                try {
                    if (m.closed === true || m.archived === true) continue;

                    // Filter out spam markets (5-minute crypto bets)
                    if (this.isSpamMarket(m.question)) continue;

                    // LIQUIDITY FILTER: Minimum volume to prevent manipulation
                    const volume = parseFloat(m.volume || "0");
                    if (volume < MIN_VOLUME) continue;

                    const clobTokens = JSON.parse(m.clobTokenIds);
                    const outcomes = JSON.parse(m.outcomes);
                    const prices = JSON.parse(m.outcomePrices || '[]');

                    // Determine if this is a multi-outcome market
                    const isMultiOutcome = outcomes.length > 2;

                    if (isMultiOutcome) {
                        // MULTI-OUTCOME: Explode into separate markets, one per outcome
                        for (let i = 0; i < outcomes.length; i++) {
                            const tokenId = clobTokens[i];
                            if (!tokenId || seenIds.has(tokenId)) continue;

                            const outcomePrice = parseFloat(prices[i] || "0.5");

                            // Skip outcomes with near-zero probability
                            if (outcomePrice < 0.001) continue;

                            const categories = this.getCategories(m.category, m.question);

                            seenIds.add(tokenId);
                            for (const cat of categories) {
                                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                            }

                            allMarkets.push({
                                id: tokenId,
                                question: `${m.question}: ${outcomes[i]}`, // Format: "Fed decision in January?: 50+ bps decrease"
                                description: m.description,
                                image: m.image,
                                volume: m.volume,
                                outcomes: ["Yes", "No"], // Each outcome is now binary
                                end_date: m.endDate,
                                categories: categories,
                                basePrice: Math.max(outcomePrice, 0.01),
                                closed: m.closed,
                                accepting_orders: m.accepting_orders,
                                parentQuestion: m.question, // For future grouping (Option C)
                                outcomeLabel: outcomes[i], // Original outcome label
                            });
                        }
                    } else {
                        // BINARY MARKET: Process as before
                        const yesToken = clobTokens[0];
                        if (!yesToken || seenIds.has(yesToken)) continue;

                        const categories = this.getCategories(m.category, m.question);

                        for (const cat of categories) {
                            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                        }

                        seenIds.add(yesToken);

                        let basePrice = 0.5;
                        try {
                            const yesPrice = parseFloat(prices[0]);
                            const noPrice = parseFloat(prices[1]);

                            // Skip stale markets where both prices are 0 or near-0
                            if (yesPrice < 0.001 && noPrice < 0.001) {
                                continue;
                            }

                            basePrice = Math.max(yesPrice, 0.01);
                        } catch { }

                        allMarkets.push({
                            id: yesToken,
                            question: m.question,
                            description: m.description,
                            image: m.image,
                            volume: m.volume,
                            outcomes: outcomes,
                            end_date: m.endDate,
                            categories: categories,
                            basePrice: basePrice,
                            closed: m.closed,
                            accepting_orders: m.accepting_orders
                        });
                    }
                } catch (e) {
                    // Skip invalid market
                }
            }

            // Store in Redis
            this.activeTokenIds = allMarkets.map(m => m.id);
            await this.redis.set("market:active_list", JSON.stringify(allMarkets));
            console.log(`[Ingestion] Stored ${allMarkets.length} diverse markets in Redis.`);
            console.log(`[Ingestion] Category breakdown:`, categoryCounts);

        } catch (err) {
            console.error("[Ingestion] Failed to fetch markets:", err);
        }
    }

    // --- 1. WebSocket (Real-Time Price Ticks for UI) ---
    private connectWS() {
        if (this.activeTokenIds.length === 0) {
            setTimeout(() => this.init(), 5000);
            return;
        }

        console.log(`[Ingestion] WS Connecting...`);
        this.ws = new WebSocket(CLOB_WS_URL);

        this.ws.on("open", () => {
            console.log("[Ingestion] WS Connected.");
            this.subscribeWS();
        });

        this.ws.on("message", (data) => {
            try { this.processMessage(JSON.parse(data.toString())); }
            catch (err) { console.error("Parse Error", err); }
        });

        this.ws.on("close", () => {
            console.log("[Ingestion] WS Closed. Reconnecting...");
            setTimeout(() => this.connectWS(), this.reconnectInterval);
        });

        this.ws.on("error", (err) => {
            console.error("[Ingestion] WS Error:", err);
            this.ws?.close();
        });
    }

    private subscribeWS() {
        const payload = {
            type: "subscribe",
            channels: [{ name: "price", token_ids: this.activeTokenIds }]
        };
        this.ws?.send(JSON.stringify(payload));
    }

    private async processMessage(message: any) {
        const msgs = Array.isArray(message) ? message : [message];
        for (const msg of msgs) {
            // Publish to UI
            const payload = JSON.stringify(msg);
            await this.redis.publish("market:prices", payload);

            // Update Last Price Cache
            if (msg.asset_id && msg.price) {
                await this.redis.set(`market:price:${msg.asset_id}`, payload);
            }
        }
    }

    // --- 2. REST Polling (Order Books for Slippage Engine) ---
    private startBookPolling() {
        console.log("[Ingestion] Starting Order Book Poller (2s interval)...");
        setInterval(async () => {
            if (this.activeTokenIds.length === 0) return;

            for (const tokenId of this.activeTokenIds) {
                try {
                    const res = await fetch(`https://clob.polymarket.com/book?token_id=${tokenId}`);
                    if (!res.ok) continue;
                    const book = await res.json();

                    // Store Snapshot: market:book:{tokenId}
                    await this.redis.set(`market:book:${tokenId}`, JSON.stringify(book));
                } catch (err) {
                    // Silent fail
                }
            }
        }, 2000);
    }
}

new IngestionWorker();
