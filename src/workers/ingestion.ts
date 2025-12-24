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

    private async init() {
        await this.fetchActiveMarkets();
        this.connectWS();
        this.startBookPolling(); // Start the sidebar process
    }

    private async fetchActiveMarkets() {
        try {
            console.log("[Ingestion] Fetching High-Velocity Markets (Interim)...");

            // VELOCITY FILTER:
            // 1. Expiring within 30 days (High Theta/Gamma)
            // 2. High Volume (Liquidity)
            // 3. Relevant Tags (Sports, Crypto, Politics) - implicit in Volume usually

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
                const tokens = data.map(m => {
                    // Safety check for valid CLOB token
                    try {
                        const t = JSON.parse(m.clobTokenIds);
                        return t[0]; // YES token
                    } catch (e) { return null; }
                })
                    .filter(Boolean)
                    .slice(0, 10); // Track Top 10 Velocity Markets

                this.activeTokenIds = tokens as string[];
            }
            console.log(`[Ingestion] Found ${this.activeTokenIds.length} Velocity tokens to track.`);
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
