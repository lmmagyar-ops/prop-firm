
// src/lib/trading/orderbook-simulator.ts

export interface OrderBookLevel {
    price: number; // 0.0 - 1.0
    shares: number;
    total: number; // cumulative depth
}

export interface SimulatedOrderBook {
    bids: OrderBookLevel[]; // descending price
    asks: OrderBookLevel[]; // ascending price
    spread: number;
}

export function generateOrderBook(
    marketPrice: number, // current probability (0.0 - 1.0)
    depth: number = 5, // levels per side
    spreadBps: number = 10 // spread in basis points (e.g., 10 = 1%? 100bps = 1%) 10bps = 0.1%
    // Polymarket typically has 1-2c spreads on liquid markets. 1c on 50c = 2%. 
    // Let's target ~1c spread. 
): SimulatedOrderBook {
    // 1c spread = 0.01
    // spreadBps passed as 10 seems too tight if treated as actual bps? 
    // Let's treat spreadBps as cents * 10 or just use a fixed realistic spread calc

    // Realism: Spread often widens as probability moves away from 0.5? Maybe.

    const spreadAmount = 0.01 + (Math.random() * 0.005); // 1.0c to 1.5c spread

    const bestBid = marketPrice - (spreadAmount / 2);
    const bestAsk = marketPrice + (spreadAmount / 2);

    const tickSize = 0.01; // 1¢ increments typically

    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];

    let cumulativeBid = 0;
    let cumulativeAsk = 0;

    // Generate bid side (descending from best bid)
    for (let i = 0; i < depth; i++) {
        const price = bestBid - (i * tickSize);
        if (price <= 0) break;

        // More shares as we go deeper
        const noise = Math.random() * 0.5 + 0.5; // 0.5 to 1.5 multiplier
        const shares = Math.floor((1000 + i * 2000) * noise);
        cumulativeBid += shares;

        bids.push({ price, shares, total: cumulativeBid });
    }

    // Generate ask side (ascending from best ask)
    for (let i = 0; i < depth; i++) {
        const price = bestAsk + (i * tickSize);
        if (price >= 1.0) break;

        const noise = Math.random() * 0.5 + 0.5;
        const shares = Math.floor((1000 + i * 2000) * noise);
        cumulativeAsk += shares;

        asks.push({ price, shares, total: cumulativeAsk });
    }

    return {
        bids,
        asks,
        spread: spreadAmount,
    };
}
