"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

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

    const executeTrade = useCallback(async (
        marketId: string,
        outcome: "YES" | "NO",
        amount: number
    ): Promise<TradeResult> => {
        setIsLoading(true);

        try {
            const response = await fetch("/api/trade/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // Required to send session cookies
                body: JSON.stringify({
                    marketId,
                    outcome,
                    amount,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error || "Trade failed";
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
                `Bought ${result.trade?.shares.toFixed(2)} shares @ ${(result.trade?.price || 0 * 100).toFixed(0)}¢`
            );

            // Handle challenge status changes
            if (data.challengeStatus === "failed") {
                toast.error("Challenge Failed - Daily loss limit exceeded");
            } else if (data.challengeStatus === "passed") {
                toast.success("🎉 Challenge Passed!");
            }

            options.onSuccess?.(result);
            return result;

        } catch (error: any) {
            const errorMsg = error.message || "Network error";
            toast.error(errorMsg);
            options.onError?.(errorMsg);
            setLastResult({ success: false, error: errorMsg });
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, [options]);

    return {
        executeTrade,
        isLoading,
        lastResult,
    };
}
