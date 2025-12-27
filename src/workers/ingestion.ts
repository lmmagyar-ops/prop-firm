import WebSocket from "ws";
import * as dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config();

const CLOB_WS_URL = "wss://ws-live-data.polymarket.com";
// Gamma API Base: We append filters dynamically in fetchActiveMarkets
const GAMMA_API_URL = "https://gamma-api.polymarket.com/markets?limit=20&active=true&closed=false&order=volume&descending=true";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";

class IngestionWorker {
    private ws: WebSocket | null = null;
    private redis: Redis;
    private reconnectInterval = 5000;
    private activeTokenIds: string[] = [];

    constructor() {
        this.redis = new Redis(REDIS_URL);
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
            q.includes('bnb') || q.includes('ada') || q.includes('avax')) {
            return 'Crypto';
        }

        // Politics keywords
        if (q.includes('trump') || q.includes('biden') || q.includes('election') ||
            q.includes('president') || q.includes('senate') || q.includes('congress') ||
            q.includes('democrat') || q.includes('republican') || q.includes('political')) {
            return 'Politics';
        }

        // Sports keywords
        if (q.includes('nfl') || q.includes('nba') || q.includes('mlb') ||
            q.includes('nhl') || q.includes('super bowl') || q.includes('world cup') ||
            q.includes('olympics') || q.includes('championship')) {
            return 'Sports';
        }

        // Finance/Economics keywords
        if (q.includes('fed') || q.includes('interest rate') || q.includes('inflation') ||
            q.includes('gdp') || q.includes('stock') || q.includes('s&p') ||
            q.includes('dow') || q.includes('nasdaq')) {
            return 'Finance';
        }

        // Default
        return 'Other';
    }

    private async init() {
        await this.fetchActiveMarkets();
        this.connectWS();
        this.startBookPolling(); // Start the sidebar process
    }

    private async fetchActiveMarkets() {
        try {
            console.log("[Ingestion] Fetching High-Velocity Markets (Interim)...");

            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const endDateMax = thirtyDaysFromNow.toISOString();

            // Gamma API params
            const url = `${GAMMA_API_URL}&end_date_max=${endDateMax}`;

            console.log(`[Ingestion] Query: ${url}`);

            const response = await fetch(url);
            const data = await response.json();

            if (Array.isArray(data)) {
                // Filter and Map
                const markets: any[] = [];
                const tokens: string[] = [];

                data.forEach(m => {
                    try {
                        // Skip explicitly closed or archived markets
                        if (m.closed === true || m.archived === true) {
                            return;
                        }

                        // FILTER: Illiquid Markets
                        // User Rule: No illiquid markets (< $100k volume).
                        // Dev Config: Lowered to $1k to ensure market visibility during testing if live volume is low.
                        const volume24h = m.volume24hr || 0;
                        const liquidity = parseFloat(m.liquidity || "0");

                        // if (volume24h < 1000 && liquidity < 1000) {
                        //    return; // Keeping disabled for now to ensure we see "New" markets for UI testing
                        // }

                        const clobTokens = JSON.parse(m.clobTokenIds);
                        const yesToken = clobTokens[0]; // YES token

                        if (yesToken) {
                            tokens.push(yesToken);
                            markets.push({
                                id: yesToken,
                                question: m.question,
                                description: m.description,
                                image: m.image,
                                volume: m.volume,
                                outcomes: JSON.parse(m.outcomes),
                                end_date: m.endDate,
                                category: this.detectCategory(m.question), // NEW: Category detection
                                closed: m.closed,
                                accepting_orders: m.accepting_orders
                            });
                        }
                    } catch (e) {
                        // Skip invalid
                    }
                });

                // Metadata: Top 10 High Velocity
                const topMarkets = markets.slice(0, 10);
                this.activeTokenIds = topMarkets.map(m => m.id);

                // Store List in Redis for Frontend
                await this.redis.set("market:active_list", JSON.stringify(topMarkets));
                console.log(`[Ingestion] Stored ${topMarkets.length} markets in Redis.`);
            }
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
