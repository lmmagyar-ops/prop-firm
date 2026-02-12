"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface TradeResult {
    success: boolean;
    trade?: {
        id: string;
        shares: number;
        price: number;
    };
    position?: {
        id: string;
        shares: number;
        avgPrice: number;
        invested: number;
        currentPnl: number;
        roi: number;
        side: "YES" | "NO";
    };
    challengeStatus?: string;
    error?: string;
}

interface UseTradeExecutionOptions {
    onSuccess?: (result: TradeResult) => void;
    onError?: (error: string) => void;
}

/**
 * Hook for executing trades via the existing /api/trade/execute endpoint
 */
export function useTradeExecution(options: UseTradeExecutionOptions = {}) {
    const [isLoading, setIsLoading] = useState(false);
    const [lastResult, setLastResult] = useState<TradeResult | null>(null);

    // CRITICAL: Ref-based guard prevents re-entry from rapid clicks.
    // React setState is async — the `isLoading` state may not update before
    // the next click event fires, allowing duplicate trades. A ref is synchronous.
    const isExecutingRef = useRef(false);

    const executeTrade = useCallback(async (
        marketId: string,
        outcome: "YES" | "NO",
        amount: number
    ): Promise<TradeResult> => {
        // Synchronous re-entry guard — blocks before any async work
        if (isExecutingRef.current) {
            return { success: false, error: "Trade already in progress" };
        }
        isExecutingRef.current = true;
        setIsLoading(true);

        try {
            // Generate unique idempotency key per trade attempt
            const idempotencyKey = crypto.randomUUID();

            const response = await fetch("/api/trade/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // Required to send session cookies
                body: JSON.stringify({
                    marketId,
                    outcome,
                    amount,
                    idempotencyKey,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Session expired — redirect to login
                if (response.status === 401) {
                    toast.error("Session expired — please log in again");
                    window.location.href = "/login";
                    return { success: false, error: "Session expired" };
                }

                const errorMsg = data.error || "Trade failed";

                // LAYER 3: Handle MARKET_RESOLVED — fundamentally untradable state
                // Show a warning toast but do NOT dispatch price-requote.
                // Setting requotePrice from MARKET_RESOLVED poisons the sidebar into
                // a permanent "Market Nearly Resolved" guard state that blocks trading,
                // even when the stale CLOB price (99¢) doesn't reflect reality (65¢).
                if (data.code === 'MARKET_RESOLVED') {
                    toast.warning(errorMsg, { duration: 6000 });
                    options.onError?.(errorMsg);
                    setLastResult({ success: false, error: errorMsg });
                    return { success: false, error: errorMsg };
                }

                // DEFENSE-IN-DEPTH: Handle PRICE_MOVED re-quote gracefully
                if (data.code === 'PRICE_MOVED' && data.freshPrice) {
                    toast.info(errorMsg, { duration: 4000 });
                    // Dispatch event so the TradingSidebar can update displayed price
                    window.dispatchEvent(new CustomEvent('price-requote', {
                        detail: { freshPrice: data.freshPrice }
                    }));
                    options.onError?.(errorMsg);
                    setLastResult({ success: false, error: errorMsg });
                    return { success: false, error: errorMsg };
                }

                toast.error(errorMsg);
                options.onError?.(errorMsg);
                setLastResult({ success: false, error: errorMsg });
                return { success: false, error: errorMsg };
            }

            // Success!
            const result: TradeResult = {
                success: true,
                trade: data.trade,
                position: data.position,
                challengeStatus: data.challengeStatus,
            };

            setLastResult(result);

            // Show success toast
            toast.success(
                `Bought ${result.trade?.shares.toFixed(2)} shares @ ${((result.trade?.price || 0) * 100).toFixed(0)}¢`
            );

            // Handle challenge status changes
            if (data.challengeStatus === "failed") {
                toast.error("Challenge Failed - Daily loss limit exceeded");
            } else if (data.challengeStatus === "passed") {
                toast.success("🎉 Challenge Passed!");
            }

            // Dispatch event to trigger balance refresh in header
            window.dispatchEvent(new CustomEvent('balance-updated', {
                detail: { newBalance: data.newBalance }
            }));

            options.onSuccess?.(result);
            return result;

        } catch (error: unknown) {
            const errorMsg = getErrorMessage(error) || "Network error";
            toast.error(errorMsg);
            options.onError?.(errorMsg);
            setLastResult({ success: false, error: errorMsg });
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
            isExecutingRef.current = false;
        }
    }, [options]);

    return {
        executeTrade,
        isLoading,
        lastResult,
    };
}
