"use client";

import { useState, useEffect, useRef } from "react";
import type { TradeLimits } from "@/lib/risk";

interface UseTradeLimitsResult {
    limits: TradeLimits | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Client hook to fetch preflight trade limits for a given challenge + market.
 * Returns the effective max trade amount and a breakdown of all limits.
 *
 * Usage:
 *   const { limits, loading } = useTradeLimits(challengeId, marketId);
 *   const max = limits?.effectiveMax ?? balance;
 */
export function useTradeLimits(
    challengeId: string | null | undefined,
    marketId: string | null | undefined
): UseTradeLimitsResult {
    const [limits, setLimits] = useState<TradeLimits | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Cache key to skip refetches for same inputs
    const cacheKeyRef = useRef<string>("");
    const fetchCountRef = useRef(0);

    const fetchLimits = () => {
        if (!challengeId || !marketId) {
            setLimits(null);
            return;
        }

        const cacheKey = `${challengeId}:${marketId}`;
        const fetchId = ++fetchCountRef.current;

        // Skip if same key and we already have data
        if (cacheKey === cacheKeyRef.current && limits) return;

        // Abort any in-flight request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        fetch(`/api/trade/limits?challengeId=${challengeId}&marketId=${marketId}`, {
            signal: controller.signal,
        })
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || `HTTP ${res.status}`);
                }
                return res.json();
            })
            .then((data: TradeLimits) => {
                // Only apply if this is still the latest request
                if (fetchId === fetchCountRef.current) {
                    setLimits(data);
                    cacheKeyRef.current = cacheKey;
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (err.name === "AbortError") return;
                if (fetchId === fetchCountRef.current) {
                    setError(err.message);
                    setLoading(false);
                }
            });
    };

    useEffect(() => {
        fetchLimits();

        return () => {
            abortRef.current?.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [challengeId, marketId]);

    return {
        limits,
        loading,
        error,
        refetch: () => {
            cacheKeyRef.current = ""; // Force refetch
            fetchLimits();
        },
    };
}
