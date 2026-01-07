import WebSocket from "ws";
import * as dotenv from "dotenv";
import Redis from "ioredis";
import crypto from "crypto";

dotenv.config();

const KALSHI_API_BASE = "https://api.elections.kalshi.com/trade-api/v2";
const KALSHI_WS_URL = "wss://trading-api.kalshi.com/trade-api/ws/v2";

/**
 * Kalshi Ingestion Worker
 * 
 * Connects to Kalshi WebSocket for real-time price updates.
 * Falls back to REST polling if WebSocket is unavailable.
 * 
 * Requires: KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY
 */
class KalshiIngestionWorker {
    private ws: WebSocket | null = null;
    private redis: Redis;
    private reconnectInterval = 5000;
    private activeMarkets: string[] = [];
    private pollingInterval: NodeJS.Timeout | null = null;

    constructor() {
        if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
            console.log(`[Kalshi] Connecting to Redis via HOST/PORT/PASS config...`);
            this.redis = new Redis({
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT || "6379"),
                password: process.env.REDIS_PASSWORD,
                tls: {}
            });
        } else {
            const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";
            console.log(`[Kalshi] Connecting to Redis via URL...`);
            this.redis = new Redis(REDIS_URL);
        }

        this.init();
    }

    private async init() {
        console.log("[Kalshi] 🚀 Starting Kalshi Ingestion Worker...");

        // Fetch active markets first
        await this.fetchActiveMarkets();

        // Try WebSocket if credentials are available
        if (process.env.KALSHI_API_KEY_ID && process.env.KALSHI_PRIVATE_KEY) {
            console.log("[Kalshi] API credentials found, attempting WebSocket connection...");
            this.connectWebSocket();
        } else {
            console.log("[Kalshi] No API credentials, using REST polling only...");
            this.startPolling();
        }
    }

    /**
     * Fetch active markets from Kalshi REST API
     */
    private async fetchActiveMarkets() {
        try {
            const url = `${KALSHI_API_BASE}/markets?limit=200&status=open`;
            const response = await fetch(url, {
                headers: { "Accept": "application/json" }
            });

            if (!response.ok) {
                throw new Error(`Kalshi API error: ${response.status}`);
            }

            const data = await response.json();
            const markets = data.markets || [];
            this.activeMarkets = markets.map((m: any) => m.ticker);

            console.log(`[Kalshi] Loaded ${this.activeMarkets.length} active markets`);

            // Store market list in Redis
            const processedMarkets = markets.map((m: any) => ({
                id: m.ticker,
                title: m.title,
                price: this.getKalshiMidPrice(m),
                volume: m.volume_24h || 0,
                category: this.mapCategory(m.category),
            }));

            await this.redis.set(
                'kalshi:market_list',
                JSON.stringify(processedMarkets),
                'EX', 300 // 5 min TTL
            );

            return markets;
        } catch (error) {
            console.error("[Kalshi] Failed to fetch markets:", error);
            return [];
        }
    }

    /**
     * Connect to Kalshi WebSocket for real-time updates
     */
    private async connectWebSocket() {
        try {
            // Generate auth headers for WebSocket
            const timestamp = Date.now().toString();
            const path = '/trade-api/ws/v2';
            const message = `${timestamp}GET${path}`;
            const signature = crypto
                .createHmac('sha256', process.env.KALSHI_PRIVATE_KEY!)
                .update(message)
                .digest('base64');

            this.ws = new WebSocket(KALSHI_WS_URL, {
                headers: {
                    'KALSHI-ACCESS-KEY': process.env.KALSHI_API_KEY_ID!,
                    'KALSHI-ACCESS-TIMESTAMP': timestamp,
                    'KALSHI-ACCESS-SIGNATURE': signature,
                }
            });

            this.ws.on('open', () => {
                console.log("[Kalshi] ✅ WebSocket connected!");

                // Subscribe to ticker updates for all markets
                if (this.activeMarkets.length > 0) {
                    const subscribeMsg = {
                        id: 1,
                        cmd: 'subscribe',
                        params: {
                            channels: ['ticker'],
                            market_tickers: this.activeMarkets.slice(0, 100) // Limit to 100
                        }
                    };
                    this.ws!.send(JSON.stringify(subscribeMsg));
                    console.log(`[Kalshi] Subscribed to ${Math.min(100, this.activeMarkets.length)} markets`);
                }
            });

            this.ws.on('message', async (data: WebSocket.Data) => {
                try {
                    const msg = JSON.parse(data.toString());

                    if (msg.type === 'ticker') {
                        const { market_ticker, yes_bid, yes_ask, last_price } = msg;

                        // Calculate mid price (0-1 range from 0-100 cents)
                        let price = 0.5;
                        if (yes_bid && yes_ask) {
                            price = ((yes_bid + yes_ask) / 2) / 100;
                        } else if (last_price) {
                            price = last_price / 100;
                        }

                        // Store in Redis
                        await this.redis.set(
                            `kalshi:price:${market_ticker}`,
                            JSON.stringify({
                                price: price.toFixed(4),
                                asset_id: market_ticker,
                                timestamp: Date.now()
                            }),
                            'EX', 60 // 1 min TTL
                        );
                    }
                } catch (err) {
                    console.error("[Kalshi] Message parse error:", err);
                }
            });

            this.ws.on('error', (err) => {
                console.error("[Kalshi] WebSocket error:", err.message);
            });

            this.ws.on('close', () => {
                console.log("[Kalshi] WebSocket closed, falling back to polling...");
                this.ws = null;
                this.startPolling();

                // Attempt reconnect after delay
                setTimeout(() => this.connectWebSocket(), this.reconnectInterval);
            });

        } catch (error) {
            console.error("[Kalshi] WebSocket connection failed:", error);
            this.startPolling();
        }
    }

    /**
     * Fallback: Poll REST API for prices
     */
    private startPolling() {
        if (this.pollingInterval) return; // Already polling

        console.log("[Kalshi] 📊 Starting REST polling (every 10s)...");

        this.pollingInterval = setInterval(async () => {
            await this.pollPrices();
        }, 10000);

        // Initial poll
        this.pollPrices();
    }

    private async pollPrices() {
        try {
            const markets = await this.fetchActiveMarkets();

            for (const market of markets.slice(0, 100)) { // Limit batch size
                const price = this.getKalshiMidPrice(market);
                await this.redis.set(
                    `kalshi:price:${market.ticker}`,
                    JSON.stringify({
                        price: price.toFixed(4),
                        asset_id: market.ticker,
                        timestamp: Date.now()
                    }),
                    'EX', 60
                );
            }

            console.log(`[Kalshi] Polled ${Math.min(100, markets.length)} market prices`);
        } catch (error) {
            console.error("[Kalshi] Polling error:", error);
        }
    }

    private getKalshiMidPrice(market: any): number {
        if (market.yes_bid && market.yes_ask) {
            return ((market.yes_bid + market.yes_ask) / 2) / 100;
        }
        if (market.last_price) {
            return market.last_price / 100;
        }
        return 0.5;
    }

    private mapCategory(kalshiCategory: string): string {
        const mapping: Record<string, string> = {
            "Politics": "Politics",
            "Economics": "Business",
            "Finance": "Business",
            "Climate and Weather": "Other",
            "Science": "Tech",
            "Technology": "Tech",
            "Sports": "Sports",
            "Entertainment": "Culture",
        };
        return mapping[kalshiCategory] || "Other";
    }
}

// Start the worker
console.log("[Kalshi] Worker initializing...");
new KalshiIngestionWorker();
