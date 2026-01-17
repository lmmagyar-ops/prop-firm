"use client";

import { useMarketPolling } from "@/hooks/useMarketPolling";
import { MarketGridWithTabs } from "@/components/trading/MarketGridWithTabs";
import type { MockMarket } from "@/lib/mock-markets";
import type { EventMetadata } from "@/app/actions/market";

interface MarketGridWithPollingProps {
    initialEvents: EventMetadata[];
    markets: MockMarket[];
    balance: number;
    userId: string;
    platform: "polymarket" | "kalshi";
    challengeId?: string;
}

/**
 * Client wrapper that adds polling to MarketGridWithTabs.
 * Initial data comes from server-side rendering for fast load,
 * then client polls for updates every 10 seconds.
 */
export function MarketGridWithPolling({
    initialEvents,
    markets,
    balance,
    userId,
    platform,
    challengeId,
}: MarketGridWithPollingProps) {
    // Use polling hook with server-rendered initial data
    const { events, lastUpdated } = useMarketPolling(platform, {
        intervalMs: 10000,
        enabled: true,
    });

    // Use polled events if available, otherwise fallback to initial
    const displayEvents = events.length > 0 ? events : initialEvents;

    return (
        <div className="relative">
            {/* Last Updated Indicator */}
            {lastUpdated && (
                <div className="absolute top-0 right-0 flex items-center gap-2 text-xs text-zinc-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>
                        Live • Updated {formatTimeAgo(lastUpdated)}
                    </span>
                </div>
            )}

            <MarketGridWithTabs
                events={displayEvents}
                balance={balance}
                userId={userId}
                platform={platform}
                challengeId={challengeId}
            />
        </div>
    );
}

// Helper to format time ago
function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
}
