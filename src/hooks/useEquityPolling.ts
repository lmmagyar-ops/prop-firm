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
 * Anti-flicker: uses the server-rendered initial value until a poll returns
 * a meaningfully different equity (>$1 delta), preventing the jarring
 * flash-to-zero on initial hydration.
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

            // Anti-flicker: if the polled value is within $1 of the server-rendered
            // initial value and we haven't had a real update yet, skip the update
            // to prevent the visual "reset" flash during hydration.
            const delta = Math.abs(newEquity - initialRef.current);
            if (!hasReceivedRealUpdate.current && delta < 1) {
                // Values are essentially the same — keep the SSR value, just mark as live
                setLastUpdated(new Date());
                return;
            }

            hasReceivedRealUpdate.current = true;
            setData({
                balance: json.balance ?? initialRef.current,
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
        // Initial fetch after a short delay (let SSR data render first)
        const initialDelay = setTimeout(fetchEquity, 2000);

        // Set up polling interval
        intervalRef.current = setInterval(fetchEquity, intervalMs);

        // Also listen for trade events (immediate update after trade)
        const handleTradeUpdate = () => {
            // Force accept next update (trade just happened — value SHOULD change)
            hasReceivedRealUpdate.current = true;
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
