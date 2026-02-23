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
 * Typed shape of every response from /api/trade/execute (success + all error codes).
 * Using a concrete interface rather than 'any' keeps our no-any rule intact and makes
 * future API changes fail loudly at compile time.
 */
interface TradeApiResponse {
    // Error paths
    error?: string;
    code?: string;          // e.g. 'MARKET_RESOLVED', 'PRICE_MOVED', 'SLIPPAGE_TOO_HIGH'
    freshPrice?: number;
    // Success path
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
    newBalance?: number;
}

/** Maximum time to wait for the trade API before aborting and unlocking the button. */
const TRADE_EXECUTE_TIMEOUT_MS = 30_000;

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

            // TIMEOUT GUARD: 30s AbortController prevents infinite spinner when server hangs
            // (DB lock contention, connection pool exhaustion, slow risk validation inside
            // a FOR UPDATE transaction are all real failure modes that produce zero response).
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TRADE_EXECUTE_TIMEOUT_MS);

            let response: Response;
            try {
                response = await fetch("/api/trade/execute", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    signal: controller.signal,
                    body: JSON.stringify({
                        marketId,
                        outcome,
                        amount,
                        idempotencyKey,
                    }),
                });
            } finally {
                clearTimeout(timeoutId);
            }

            // Defensively parse response body — some error paths (e.g. empty 409 body from
            // an upstream middleware) return non-JSON, which would throw SyntaxError here
            // and produce a cryptic "Unexpected end of JSON" toast rather than the real error.
            let data: TradeApiResponse = {};

            try {
                data = await response.json();
            } catch {
                // Body was empty or not JSON. Build a synthetic error from the status code.
                if (!response.ok) {
                    const errorMsg = `Trade failed (HTTP ${response.status})`;
                    toast.error(errorMsg);
                    options.onError?.(errorMsg);
                    setLastResult({ success: false, error: errorMsg });
                    return { success: false, error: errorMsg };
                }
                // Unexpected: success status but no JSON body. Treat as failure.
                const errorMsg = "Trade returned no data";
                toast.error(errorMsg);
                options.onError?.(errorMsg);
                setLastResult({ success: false, error: errorMsg });
                return { success: false, error: errorMsg };
            }

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
                `Bought ${result.trade?.shares.toFixed(2)} shares @ ${((result.trade?.price || 0) * 100).toFixed(1)}¢`
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
            // Distinguish timeout from genuine network errors for actionable messaging
            const isTimeout = error instanceof Error && error.name === 'AbortError';
            const errorMsg = isTimeout
                ? "Trade timed out — the server is unresponsive. Your funds were NOT debited. Please try again."
                : (getErrorMessage(error) || "Network error");
            if (isTimeout) {
                toast.error(errorMsg, { duration: 8000 });
            } else {
                toast.error(errorMsg);
            }
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
