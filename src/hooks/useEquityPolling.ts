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
 * Anthropic pattern: simple polling, no WebSocket overhead.
 * Falls back gracefully to initial values on error.
 */
export function useEquityPolling(initialEquity: number, intervalMs = 30_000) {
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
            setData({
                balance: json.balance ?? initialEquity,
                equity: json.equity ?? initialEquity,
                positionValue: json.positionValue ?? 0,
                positionCount: json.positionCount ?? 0,
            });
            setLastUpdated(new Date());
        } catch {
            // Silently fail — keep displaying last known value
        }
    }, [initialEquity]);

    useEffect(() => {
        // Initial fetch after a short delay (let SSR data render first)
        const initialDelay = setTimeout(fetchEquity, 2000);

        // Set up polling interval
        intervalRef.current = setInterval(fetchEquity, intervalMs);

        // Also listen for trade events (immediate update after trade)
        const handleTradeUpdate = () => {
            // Slight delay to let DB settle after trade
            setTimeout(fetchEquity, 500);
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
