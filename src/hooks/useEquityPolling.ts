"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface EquityData {
    balance: number;    // Cash balance
    equity: number;     // Cash + position value
    positionValue: number;
    positionCount: number;
}

/**
 * useEquityPolling — Polls /api/user/balance every `intervalMs` for live equity.
 * 
 * The API is the source of truth. SSR value is just a placeholder until the
 * first poll returns. Only guard: reject $0 equity on first load when SSR
 * showed a real balance (protects against cookie → wrong challenge edge case).
 */
export function useEquityPolling(initialEquity: number, intervalMs = 30_000) {
    const initialRef = useRef(initialEquity);
    const hasReceivedRealUpdate = useRef(false);

    const [data, setData] = useState<EquityData>({
        balance: initialEquity,
        equity: initialEquity,
        positionValue: 0,
        positionCount: 0,
    });
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchEquity = useCallback(async () => {
        try {
            const res = await fetch("/api/user/balance", { cache: "no-store" });
            if (!res.ok) return;

            const json = await res.json();
            const newEquity = json.equity ?? initialRef.current;
            const initial = initialRef.current;

            // Guard: Reject $0 equity when SSR showed a real balance.
            // This happens when the cookie points to a deleted/wrong challenge
            // and the API falls back to "no active challenge" → returns 0.
            if (!hasReceivedRealUpdate.current && newEquity === 0 && initial > 100) {
                console.warn("[useEquityPolling] Rejected $0 poll — SSR value was", initial);
                setLastUpdated(new Date());
                return;
            }

            // Accept the poll result — API is the source of truth.
            // (Old anti-flicker guard removed: it suppressed valid updates
            //  within $1 of SSR value, causing equity to stick at stale values.)
            hasReceivedRealUpdate.current = true;
            setData({
                balance: json.balance ?? initial,
                equity: newEquity,
                positionValue: json.positionValue ?? 0,
                positionCount: json.positionCount ?? 0,
            });
            setLastUpdated(new Date());
        } catch {
            // Silently fail — keep displaying last known value
        }
    }, []);

    useEffect(() => {
        // Fast first fetch — SSR value is just a placeholder, correct it ASAP
        const initialDelay = setTimeout(fetchEquity, 300);

        // Set up polling interval
        intervalRef.current = setInterval(fetchEquity, intervalMs);

        // Listen for trade events — immediate re-fetch after trade execution
        const handleTradeUpdate = () => {
            hasReceivedRealUpdate.current = true;
            // Short delay to let DB commit settle
            setTimeout(fetchEquity, 200);
        };
        window.addEventListener("balance-updated", handleTradeUpdate);

        return () => {
            clearTimeout(initialDelay);
            if (intervalRef.current) clearInterval(intervalRef.current);
            window.removeEventListener("balance-updated", handleTradeUpdate);
        };
    }, [fetchEquity, intervalMs]);

    return { ...data, lastUpdated };
}
