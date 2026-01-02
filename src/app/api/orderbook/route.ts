import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/orderbook?token_id={tokenId}
 * Fetches order book from Polymarket CLOB API
 */
export async function GET(req: NextRequest) {
    const tokenId = req.nextUrl.searchParams.get("token_id");

    if (!tokenId) {
        return NextResponse.json({ error: "token_id is required" }, { status: 400 });
    }

    try {
        const res = await fetch(`https://clob.polymarket.com/book?token_id=${tokenId}`, {
            headers: { "Accept": "application/json" },
            next: { revalidate: 5 } // Cache for 5 seconds
        });

        if (!res.ok) {
            return NextResponse.json({ bids: [], asks: [] });
        }

        const book = await res.json();

        // Return top 5 bids and asks
        return NextResponse.json({
            bids: (book.bids || []).slice(0, 5),
            asks: (book.asks || []).slice(0, 5),
        });
    } catch (error) {
        console.error("[OrderBook API] Error:", error);
        return NextResponse.json({ bids: [], asks: [] });
    }
}
