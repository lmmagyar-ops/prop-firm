import { auth } from "@/auth";
import { getDashboardData } from "@/lib/dashboard-service";
import { getActiveMarkets } from "@/app/actions/market";
import { MarketGridWithTabs } from "@/components/trading/MarketGridWithTabs";
import type { MockMarket } from "@/lib/mock-markets";

// Map live market data to the shape expected by MarketCardClient
function mapToMarketShape(liveMarket: any): MockMarket {
    return {
        id: liveMarket.id,
        question: liveMarket.question,
        category: liveMarket.category || 'Other', // Use ingested category
        icon: '📊',
        imageUrl: liveMarket.image,
        currentPrice: 0.50, // Widget connects to live WS for real-time price
        priceChange24h: (Math.random() * 10) - 5, // Mock for visual variety
        volume: liveMarket.volume || 0,
        activeTraders: Math.floor(Math.random() * 1000) + 100,
        endDate: new Date(liveMarket.end_date || Date.now()),
        trending: (liveMarket.volume || 0) > 1000000,
    };
}

export default async function TradePage() {
    const session = await auth();
    const userId = session?.user?.id || "demo-user-1";
    const data = await getDashboardData(userId);
    const liveMarkets = await getActiveMarkets();

    const balance = data?.activeChallenge
        ? Number(data.activeChallenge.currentBalance)
        : 10000;

    const hasActiveChallenge = !!data?.activeChallenge;

    const markets = liveMarkets.map(mapToMarketShape);

    return (
        <div className="space-y-6">
            {!hasActiveChallenge ? (
                // Empty State: No Active Evaluation
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="max-w-2xl w-full mx-auto text-center space-y-6 p-8">
                        <div className="w-20 h-20 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-3xl font-bold text-white">Get Started with Your Evaluation</h2>
                            <p className="text-lg text-zinc-400">
                                Purchase an evaluation account to start trading prediction markets and prove your skills.
                            </p>
                        </div>

                        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                                <div className="space-y-2">
                                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-white">Instant Access</h3>
                                    <p className="text-sm text-zinc-400">Start trading immediately after purchase</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-white">Real Markets</h3>
                                    <p className="text-sm text-zinc-400">Trade on live prediction markets</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-white">Earn Profits</h3>
                                    <p className="text-sm text-zinc-400">Keep up to 90% of your profits</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <a
                                href="/buy-evaluation"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Buy Evaluation Account
                            </a>
                        </div>

                        <p className="text-sm text-zinc-500">
                            Choose from $5K, $10K, or $25K account sizes
                        </p>
                    </div>
                </div>
            ) : (
                // Normal State: Show Markets with Category Tabs
                <MarketGridWithTabs
                    markets={markets}
                    balance={balance}
                    userId={userId}
                />
            )}
        </div>
    );
}
