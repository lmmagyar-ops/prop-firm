/**
 * Kalshi API Client
 * 
 * Fetches market data from Kalshi's API with optional authentication.
 * Base URL: https://api.elections.kalshi.com/trade-api/v2
 * 
 * Supports both public (unauthenticated) and authenticated endpoints.
 */

import crypto from 'crypto';
import { createLogger } from '@/lib/logger';
const logger = createLogger('KalshiClient');

const KALSHI_API_BASE = "https://api.elections.kalshi.com/trade-api/v2";

// Authentication helpers
function generateSignature(timestamp: string, method: string, path: string, body: string, privateKey: string): string {
    const message = `${timestamp}${method}${path}${body}`;
    const hmac = crypto.createHmac('sha256', privateKey);
    hmac.update(message);
    return hmac.digest('base64');
}

function getAuthHeaders(method: string, path: string, body: string = ''): Record<string, string> {
    const keyId = process.env.KALSHI_API_KEY_ID;
    const privateKey = process.env.KALSHI_PRIVATE_KEY;

    if (!keyId || !privateKey) {
        // Return empty headers if no credentials (will use public API)
        return {};
    }

    const timestamp = Date.now().toString();
    const signature = generateSignature(timestamp, method, path, body, privateKey);

    return {
        'KALSHI-ACCESS-KEY': keyId,
        'KALSHI-ACCESS-TIMESTAMP': timestamp,
        'KALSHI-ACCESS-SIGNATURE': signature,
    };
}

export interface KalshiEvent {
    event_ticker: string;
    title: string;
    category: string;
    sub_title?: string;
    mutually_exclusive: boolean;
    markets: KalshiMarket[];
}

export interface KalshiMarket {
    ticker: string;
    event_ticker: string;
    market_type: string;
    title: string;
    subtitle?: string;
    yes_bid: number;  // Best bid price (0-100)
    yes_ask: number;  // Best ask price (0-100)
    last_price: number;
    volume: number;
    volume_24h: number;
    open_interest: number;
    status: string;
    result?: string;
    close_time: string;
    expiration_time: string;
}

export interface KalshiOrderBookLevel {
    price: number;  // Cents (1-99)
    quantity: number;
}

export interface KalshiOrderBook {
    ticker: string;
    yes: KalshiOrderBookLevel[];
    no: KalshiOrderBookLevel[];
}

/**
 * Fetch active events from Kalshi
 * Note: Kalshi API max limit is 200 for events
 */
export async function getKalshiEvents(limit = 200): Promise<KalshiEvent[]> {
    try {
        // Note: Kalshi events API max limit is 200
        const effectiveLimit = Math.min(limit, 200);
        const path = `/events?limit=${effectiveLimit}`;
        const url = `${KALSHI_API_BASE}${path}`;
        const authHeaders = getAuthHeaders('GET', path);
        const response = await fetch(url, {
            headers: {
                "Accept": "application/json",
                ...authHeaders
            },
            next: { revalidate: 60 }, // Cache for 60 seconds
        });

        if (!response.ok) {
            throw new Error(`Kalshi API error: ${response.status}`);
        }

        const data = await response.json();
        return data.events || [];
    } catch (error) {
        logger.error("[Kalshi] Failed to fetch events:", error);
        return [];
    }
}

/**
 * Fetch active markets from Kalshi
 */
export async function getKalshiMarkets(limit = 500): Promise<KalshiMarket[]> {
    try {
        const path = `/markets?limit=${limit}&status=open`;
        const url = `${KALSHI_API_BASE}${path}`;
        const authHeaders = getAuthHeaders('GET', path);
        const response = await fetch(url, {
            headers: {
                "Accept": "application/json",
                ...authHeaders
            },
            next: { revalidate: 60 },
        });

        if (!response.ok) {
            throw new Error(`Kalshi API error: ${response.status}`);
        }

        const data = await response.json();
        return data.markets || [];
    } catch (error) {
        logger.error("[Kalshi] Failed to fetch markets:", error);
        return [];
    }
}

/**
 * Fetch order book for a specific market
 */
export async function getKalshiOrderBook(ticker: string): Promise<KalshiOrderBook | null> {
    try {
        const url = `${KALSHI_API_BASE}/markets/${ticker}/orderbook`;
        const response = await fetch(url, {
            headers: { "Accept": "application/json" },
            next: { revalidate: 5 }, // Cache for 5 seconds (real-time data)
        });

        if (!response.ok) {
            throw new Error(`Kalshi API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            ticker,
            yes: data.orderbook?.yes || [],
            no: data.orderbook?.no || [],
        };
    } catch (error) {
        logger.error(`[Kalshi] Failed to fetch order book for ${ticker}:`, error);
        return null;
    }
}

/**
 * Map Kalshi category to our unified category system
 */
export function mapKalshiCategory(kalshiCategory: string): string {
    const mapping: Record<string, string> = {
        "Politics": "Politics",
        "Economics": "Business",
        "Finance": "Business",
        "Climate and Weather": "Other",
        "World": "Other",
        "Science": "Tech",
        "Technology": "Tech",
        "Health": "Other",
        "Sports": "Sports",
        "Entertainment": "Culture",
        "Culture": "Culture",
    };
    return mapping[kalshiCategory] || "Other";
}

/**
 * Get the mid price from yes_bid and yes_ask
 */
export function getKalshiMidPrice(market: KalshiMarket): number {
    // Kalshi prices are in cents (0-100), convert to 0-1 range
    if (market.yes_bid && market.yes_ask) {
        return ((market.yes_bid + market.yes_ask) / 2) / 100;
    }
    if (market.last_price) {
        return market.last_price / 100;
    }
    return 0.5; // Default to 50% if no price data
}
