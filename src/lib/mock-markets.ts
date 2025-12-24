
export interface MockMarket {
    id: string;
    question: string;
    category: 'Politics' | 'Crypto' | 'Sports' | 'Finance' | 'Entertainment';
    icon: string; // emoji
    imageUrl?: string;
    currentPrice: number; // 0-1
    priceChange24h: number; // percentage
    volume: number; // in dollars
    activeTraders: number;
    endDate: Date;
    trending?: boolean;
}

export const MOCK_MARKETS: MockMarket[] = [
    {
        id: '32666',
        question: 'Will Donald Trump win the 2024 Election?',
        category: 'Politics',
        icon: '🇺🇸',
        imageUrl: 'https://placehold.co/400x400/1e293b/ffffff?text=TRUMP',
        currentPrice: 0.569,
        priceChange24h: 2.4,
        volume: 15200000,
        activeTraders: 1243,
        endDate: new Date('2024-11-05'),
        trending: true,
    },
    {
        id: '32667',
        question: 'Will Kamala Harris win the 2024 Election?',
        category: 'Politics',
        icon: '🗳️',
        imageUrl: 'https://placehold.co/400x400/1e293b/ffffff?text=KAMALA',
        currentPrice: 0.423,
        priceChange24h: -1.8,
        volume: 12800000,
        activeTraders: 987,
        endDate: new Date('2024-11-05'),
    },
    {
        id: '32668',
        question: 'Bitcoin to reach $100,000 by January 2025?',
        category: 'Crypto',
        icon: '₿',
        imageUrl: 'https://placehold.co/400x400/1e293b/ffffff?text=BTC',
        currentPrice: 0.72,
        priceChange24h: 5.2,
        volume: 8900000,
        activeTraders: 2156,
        endDate: new Date('2025-01-01'),
        trending: true,
    },
    {
        id: '32669',
        question: 'Ethereum to reach $5,000 by Q1 2025?',
        category: 'Crypto',
        icon: '⟠',
        imageUrl: 'https://placehold.co/400x400/1e293b/ffffff?text=ETH',
        currentPrice: 0.45,
        priceChange24h: 3.1,
        volume: 5400000,
        activeTraders: 1432,
        endDate: new Date('2025-03-31'),
    },
    {
        id: '32670',
        question: 'Will the Chiefs win Super Bowl LIX?',
        category: 'Sports',
        icon: '🏈',
        imageUrl: 'https://placehold.co/400x400/1e293b/ffffff?text=NFL',
        currentPrice: 0.38,
        priceChange24h: -0.5,
        volume: 3200000,
        activeTraders: 876,
        endDate: new Date('2025-02-09'),
    },
    {
        id: '32671',
        question: 'US Recession declared before July 2025?',
        category: 'Finance',
        icon: '📉',
        imageUrl: 'https://placehold.co/400x400/1e293b/ffffff?text=FED',
        currentPrice: 0.29,
        priceChange24h: 1.2,
        volume: 7100000,
        activeTraders: 1654,
        endDate: new Date('2025-07-01'),
    },
    {
        id: '32672',
        question: 'Will the Lakers make NBA playoffs?',
        category: 'Sports',
        icon: '🏀',
        imageUrl: 'https://placehold.co/400x400/1e293b/ffffff?text=NBA',
        currentPrice: 0.81,
        priceChange24h: 2.8,
        volume: 2800000,
        activeTraders: 543,
        endDate: new Date('2025-04-15'),
    },
    {
        id: '32673',
        question: 'Fed to cut rates by 50+ basis points in 2025?',
        category: 'Finance',
        icon: '💰',
        imageUrl: 'https://placehold.co/400x400/1e293b/ffffff?text=RATES',
        currentPrice: 0.62,
        priceChange24h: -2.1,
        volume: 9300000,
        activeTraders: 1987,
        endDate: new Date('2025-12-31'),
        trending: true,
    },
];

export function getMarketsByCategory(category: string) {
    if (category === 'All') return MOCK_MARKETS;
    return MOCK_MARKETS.filter(m => m.category === category);
}

export function getTrendingMarkets() {
    return MOCK_MARKETS.filter(m => m.trending);
}
