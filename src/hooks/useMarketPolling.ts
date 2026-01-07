"use client";

import { useState, useEffect, useCallback } from "react";
import type { EventMetadata } from "@/app/actions/market";

interface UseMarketPollingOptions {
    intervalMs?: number;
    enabled?: boolean;
}

interface UseMarketPollingReturn {
    events: EventMetadata[];
    isLoading: boolean;
    lastUpdated: Date | null;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook for polling market events at regular intervals.
 * 
 * @param platform - "polymarket" or "kalshi"
 * @param options - Polling configuration
 * @returns Events data, loading state, and refetch function
 */
export function useMarketPolling(
    platform: "polymarket" | "kalshi",
    options: UseMarketPollingOptions = {}
): UseMarketPollingReturn {
    const { intervalMs = 10000, enabled = true } = options;

    const [events, setEvents] = useState<EventMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const fetchEvents = useCallback(async () => {
        try {
            const response = await fetch(`/api/markets/events?platform=${platform}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch events: ${response.status}`);
            }

            const data = await response.json();
            setEvents(data.events || []);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error("[useMarketPolling] Error fetching events:", err);
            setError(err instanceof Error ? err : new Error("Unknown error"));
        } finally {
            setIsLoading(false);
        }
    }, [platform]);

    // Initial fetch and polling setup
    useEffect(() => {
        if (!enabled) return;

        // Initial fetch
        fetchEvents();

        // Set up polling interval
        const interval = setInterval(fetchEvents, intervalMs);

        // Cleanup on unmount
        return () => {
            clearInterval(interval);
        };
    }, [fetchEvents, intervalMs, enabled]);

    // Refetch when platform changes
    useEffect(() => {
        if (enabled) {
            setIsLoading(true);
            fetchEvents();
        }
    }, [platform, enabled, fetchEvents]);

    return {
        events,
        isLoading,
        lastUpdated,
        error,
        refetch: fetchEvents,
    };
}
