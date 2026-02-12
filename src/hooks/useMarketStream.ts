'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface MarketPriceData {
    prices: Record<string, { price: string; title?: string }>;
    timestamp: number;
    count: number;
}

export interface UseMarketStreamOptions {
    enabled?: boolean;
    onError?: (error: string) => void;
}

/**
 * Hook for subscribing to real-time market prices via SSE.
 * 
 * Falls back to 10s polling if SSE disconnects.
 * 
 * Usage:
 * ```tsx
 * const { prices, connected, error } = useMarketStream();
 * const btcPrice = prices['market-id-here']?.price;
 * ```
 */
export function useMarketStream(options: UseMarketStreamOptions = {}) {
    const { enabled = true, onError } = options;
    const [prices, setPrices] = useState<Record<string, { price: string; title?: string }>>({});
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<number | null>(null);

    const eventSourceRef = useRef<EventSource | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCount = useRef(0);

    const connect = useCallback(() => {
        if (!enabled) return;

        // Cleanup existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            const es = new EventSource('/api/markets/stream');
            eventSourceRef.current = es;

            es.onopen = () => {
                setConnected(true);
                setError(null);
                retryCount.current = 0;
            };

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.error) {
                        setError(data.error);
                        onError?.(data.error);
                        return;
                    }

                    if (data.prices) {
                        setPrices(data.prices);
                        setLastUpdate(data.timestamp);
                    }
                } catch (err) {
                    console.error('[useMarketStream] Parse error:', err);
                }
            };

            es.onerror = () => {
                console.warn('[useMarketStream] Connection error, will retry...');
                setConnected(false);
                setError('Connection lost');
                es.close();

                // Exponential backoff retry (max 30s)
                const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
                retryCount.current++;

                retryTimeoutRef.current = setTimeout(() => {
                    connect();
                }, delay);
            };

        } catch (err) {
            console.error('[useMarketStream] Failed to create EventSource:', err);
            setError('Failed to connect');
        }
    }, [enabled, onError]);

    useEffect(() => {
        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [connect]);

    return {
        prices,
        connected,
        error,
        lastUpdate,
        reconnect: connect,
    };
}
