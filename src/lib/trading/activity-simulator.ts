
// src/lib/trading/activity-simulator.ts

export interface SimulatedTrade {
    id: string;
    username: string;
    action: 'bought' | 'sold';
    outcome: 'YES' | 'NO';
    shares: number;
    timestamp: Date;
}

const USERNAMES = [
    'Anonymous', 'CryptoTrader', 'DayTrader123', 'MarketMaven',
    'BullMarket', 'SmartMoney', 'QuickTrade', 'ProTrader', 'WhaleWatcher',
    'PolymarketWhale', 'Degenerate', 'AlphaSeeker', 'YieldFarmer'
];

export function generateRecentActivity(count: number = 5): SimulatedTrade[] {
    const trades: SimulatedTrade[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        const minutesAgo = Math.floor(Math.random() * 15) + (i * 2);

        // More bias towards buys for hype?
        const action = Math.random() > 0.3 ? 'bought' : 'sold';

        trades.push({
            id: `trade-${Date.now()}-${i}`,
            username: USERNAMES[Math.floor(Math.random() * USERNAMES.length)],
            action,
            outcome: Math.random() > 0.5 ? 'YES' : 'NO',
            shares: Math.floor(Math.random() * 5000) + 100, // 100 to 5100 shares
            timestamp: new Date(now - minutesAgo * 60 * 1000),
        });
    }

    // Sort by timestamp desc
    return trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
