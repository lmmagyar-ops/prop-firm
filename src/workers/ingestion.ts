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
     * Detect market category based on question keywords
     */
    private detectCategory(question: string): string {
        const q = question.toLowerCase();

        // Crypto keywords
        if (q.includes('bitcoin') || q.includes('btc') || q.includes('ethereum') ||
            q.includes('eth') || q.includes('crypto') || q.includes('solana') ||
            q.includes('sol') || q.includes('xrp') || q.includes('doge') ||
            q.includes('bnb') || q.includes('ada') || q.includes('avax') ||
            q.includes('tether') || q.includes('usdt') || q.includes('usdc')) {
            return 'Crypto';
        }

        // Politics/Geopolitics keywords (expanded)
        if (q.includes('trump') || q.includes('biden') || q.includes('election') ||
            q.includes('president') || q.includes('senate') || q.includes('congress') ||
            q.includes('democrat') || q.includes('republican') || q.includes('political') ||
            q.includes('putin') || q.includes('ukraine') || q.includes('russia') ||
            q.includes('nato') || q.includes('netanyahu') || q.includes('israel') ||
            q.includes('iran') || q.includes('china') || q.includes('xi jinping') ||
            q.includes('khamenei') || q.includes('ceasefire') || q.includes('war') ||
            q.includes('nuclear') || q.includes('sanctions') || q.includes('tariff')) {
            return 'Politics';
        }

        // Sports keywords
        if (q.includes('nfl') || q.includes('nba') || q.includes('mlb') ||
            q.includes('nhl') || q.includes('super bowl') || q.includes('world cup') ||
            q.includes('olympics') || q.includes('championship') || q.includes('playoffs') ||
            q.includes('premier league') || q.includes('champions league')) {
            return 'Sports';
        }

        // Finance/Economics keywords
        if (q.includes('fed') || q.includes('interest rate') || q.includes('inflation') ||
            q.includes('gdp') || q.includes('stock') || q.includes('s&p') ||
            q.includes('dow') || q.includes('nasdaq') || q.includes('recession') ||
            q.includes('market cap') || q.includes('nvidia') || q.includes('apple') ||
            q.includes('microsoft') || q.includes('google') || q.includes('tesla') ||
            q.includes('ceo') || q.includes('spacex')) {
            return 'Finance';
        }

        // Default
        return 'Other';
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
        await this.fetchActiveMarkets();
        this.connectWS();
        this.startBookPolling(); // Start the sidebar process
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
                    const yesToken = clobTokens[0];
                    if (!yesToken || seenIds.has(yesToken)) continue;

                    const category = this.detectCategory(m.question);

                    // Track counts for logging (no caps - let frontend handle filtering)
                    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

                    seenIds.add(yesToken);
                    allMarkets.push({
                        id: yesToken,
                        question: m.question,
                        description: m.description,
                        image: m.image,
                        volume: m.volume,
                        outcomes: JSON.parse(m.outcomes),
                        end_date: m.endDate,
                        category: category,
                        closed: m.closed,
                        accepting_orders: m.accepting_orders
                    });
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
