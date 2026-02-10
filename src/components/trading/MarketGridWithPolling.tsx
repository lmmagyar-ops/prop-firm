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
    maxPerEvent?: number;
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
    maxPerEvent,
}: MarketGridWithPollingProps) {
    // Use polling hook with server-rendered initial data
    const { events, lastUpdated } = useMarketPolling(platform, {
        intervalMs: 10000,
        enabled: true,
    });

    // Use polled events if available, otherwise fallback to initial
    const displayEvents = events.length > 0 ? events : initialEvents;

    return (
        <MarketGridWithTabs
            events={displayEvents}
            balance={balance}
            userId={userId}
            platform={platform}
            challengeId={challengeId}
            maxPerEvent={maxPerEvent}
        />
    );
}
