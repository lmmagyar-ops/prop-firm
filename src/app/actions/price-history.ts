"use server";

/**
 * Fetch real price history from Polymarket CLOB API.
 *
 * The CLOB prices-history endpoint returns daily-aggregate data points
 * in {t: unix_timestamp, p: price} format.
 *
 * API quirks (validated 2026-02-08):
 *   - Only interval=max + fidelity≥1440 reliably returns data
 *   - Shorter intervals (1d, 1w) return empty for most tokens
 *   - Requires a browser-like user-agent (raw urllib gets 403)
 */

export interface PriceHistoryPoint {
    t: number; // Unix timestamp (seconds)
    p: number; // Price (0.0 - 1.0)
}

export interface PriceHistoryResponse {
    history: PriceHistoryPoint[];
    error?: string;
}

/**
 * Fetch price history for a given token ID from the Polymarket CLOB.
 * Returns up to ~200+ daily data points for the lifetime of the market.
 *
 * Falls back gracefully: if the API returns empty or errors,
 * returns an empty history array so the chart can display a flat line
 * at the current price.
 */
export async function getPriceHistory(tokenId: string): Promise<PriceHistoryResponse> {
    if (!tokenId) {
        return { history: [], error: "No token ID provided" };
    }

    try {
        const url = `https://clob.polymarket.com/prices-history?market=${tokenId}&interval=max&fidelity=1440`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; PredictionsFirm/1.0)",
                "Accept": "application/json",
            },
            next: { revalidate: 300 }, // Cache for 5 minutes (daily data doesn't change rapidly)
        });

        if (!response.ok) {
            console.error(`[PriceHistory] API returned ${response.status} for token ${tokenId.slice(0, 20)}...`);
            return { history: [], error: `API error: ${response.status}` };
        }

        const data = await response.json();
        const history: PriceHistoryPoint[] = data?.history || [];

        // Validate data integrity — filter out malformed points
        const validHistory = history.filter(
            (point) => typeof point.t === "number" && typeof point.p === "number" && point.p >= 0 && point.p <= 1
        );

        return { history: validHistory };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[PriceHistory] Fetch failed for token ${tokenId.slice(0, 20)}...: ${message}`);
        return { history: [], error: message };
    }
}
