
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Keyboard } from "lucide-react";
import { haptics } from "@/lib/haptics";
import confetti from 'canvas-confetti';

/**
 * TradingPanel - Professional trading interface
 * 
 * Anthropic Engineering Standards:
 * - Keyboard shortcuts for power users
 * - Haptic feedback for mobile
 * - Clear visual feedback
 */

interface TradingPanelProps {
    yesPrice: number; // 0.0 - 1.0
    noPrice: number;
    balance: number;
    onTrade: (outcome: "YES" | "NO", amount: number) => Promise<void>;
    loading?: boolean;
}

export function TradingPanel({ yesPrice, noPrice, balance, onTrade, loading: externalLoading }: TradingPanelProps) {
    const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
    const [amount, setAmount] = useState<string>("100");
    const [internalLoading, setInternalLoading] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);

    const loading = externalLoading || internalLoading;

    const calculations = useMemo(() => {
        const investment = parseFloat(amount) || 0;
        const currentPrice = outcome === "YES" ? yesPrice : noPrice;
        const shares = currentPrice > 0 ? investment / currentPrice : 0;
        const potentialReturn = shares - investment;
        const returnPercent = investment > 0 ? (potentialReturn / investment) * 100 : 0;

        return { investment, currentPrice, shares, potentialReturn, returnPercent };
    }, [amount, outcome, yesPrice, noPrice]);

    const { investment, currentPrice, shares, potentialReturn, returnPercent } = calculations;

    const handleTrade = useCallback(async () => {
        if (investment <= 0 || investment > balance || loading) return;

        setInternalLoading(true);
        try {
            await onTrade(outcome, investment);
            try { haptics.success(); } catch (e) { }
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        } catch (error) {
            console.error("Trade failed:", error);
            try { haptics.error(); } catch (e) { }
        } finally {
            setInternalLoading(false);
        }
    }, [investment, balance, loading, onTrade, outcome]);

    const handleOutcomeChange = (newOutcome: "YES" | "NO") => {
        setOutcome(newOutcome);
        try { haptics.light(); } catch (e) { }
    };

    const handleAmountChange = (val: string) => {
        setAmount(val);
        try { haptics.light(); } catch (e) { }
    };

    const handleIncrement = (inc: number) => {
        const current = parseFloat(amount) || 0;
        setAmount((current + inc).toString());
        try { haptics.light(); } catch (e) { }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'y':
                    handleOutcomeChange("YES");
                    break;
                case 'n':
                    handleOutcomeChange("NO");
                    break;
                case 'b':
                case 'enter':
                    handleTrade();
                    break;
                case '1':
                    handleAmountChange("50");
                    break;
                case '2':
                    handleAmountChange("100");
                    break;
                case '3':
                    handleAmountChange("500");
                    break;
                case '4':
                    handleAmountChange(balance.toString());
                    break;
                case '?':
                    setShowShortcuts(prev => !prev);
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleTrade, balance]);

    return (
        <div className="space-y-6">
            {/* Balance Display */}
            <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Balance</span>
                <span className="font-mono text-white">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {/* Outcome Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <button
                    onClick={() => handleOutcomeChange("YES")}
                    className={cn(
                        "py-4 rounded-lg transition-all border-2 flex flex-col items-center gap-1",
                        outcome === "YES"
                            ? "bg-green-900/20 border-green-500 text-green-400"
                            : "border-transparent text-zinc-500 hover:bg-white/5"
                    )}
                >
                    <span className="text-2xl font-black">YES</span>
                    <span className="text-xs font-mono">{(yesPrice * 100).toFixed(1)}¢</span>
                </button>

                <button
                    onClick={() => handleOutcomeChange("NO")}
                    className={cn(
                        "py-4 rounded-lg transition-all border-2 flex flex-col items-center gap-1",
                        outcome === "NO"
                            ? "bg-red-900/20 border-red-500 text-red-400"
                            : "border-transparent text-zinc-500 hover:bg-white/5"
                    )}
                >
                    <span className="text-2xl font-black">NO</span>
                    <span className="text-xs font-mono">{(noPrice * 100).toFixed(1)}¢</span>
                </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: '$50', value: 50 },
                    { label: '$100', value: 100 },
                    { label: '$500', value: 500 },
                    { label: 'MAX', value: balance },
                ].map(({ label, value }) => (
                    <button
                        key={label}
                        onClick={() => handleAmountChange(value.toString())}
                        className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
                <div className="relative flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl py-3 pl-8 pr-4 text-lg font-mono text-white focus:border-zinc-500 focus:outline-none transition-colors"
                            placeholder="0.00"
                        />
                    </div>
                    <button
                        onClick={() => handleIncrement(10)}
                        className="px-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-bold text-sm transition-colors"
                    >
                        +10
                    </button>
                    <button
                        onClick={() => handleIncrement(100)}
                        className="px-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-bold text-sm transition-colors"
                    >
                        +100
                    </button>
                </div>
            </div>

            {/* Order Summary */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-zinc-500">Avg. Price</span>
                    <span className="font-mono text-zinc-300">{(currentPrice * 100).toFixed(1)}¢</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">Shares</span>
                    <span className="font-mono text-zinc-300">{shares.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">Potential Return</span>
                    <span className={cn(
                        "font-mono font-bold transition-all duration-300",
                        outcome === "YES" ? "text-green-400" : "text-red-400",
                        potentialReturn > 0 ? "scale-100" : "opacity-50"
                    )}>
                        +${potentialReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({returnPercent.toFixed(0)}%)
                    </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-800 mt-2">
                    <span className="text-zinc-400 font-bold">Total Payout</span>
                    <span className="font-mono text-white font-bold">${shares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Trade Button */}
            <Button
                onClick={handleTrade}
                disabled={loading || investment <= 0 || investment > balance}
                className={cn(
                    "w-full h-14 text-lg font-black uppercase tracking-wider shadow-lg transition-all active:scale-[0.98]",
                    outcome === "YES"
                        ? "bg-green-600 hover:bg-green-500 text-white shadow-green-900/20"
                        : "bg-red-600 hover:bg-red-500 text-white shadow-red-900/20",
                    (investment > balance) && "opacity-50 cursor-not-allowed"
                )}
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>PROCESSING...</span>
                    </div>
                ) : investment > balance ? (
                    "INSUFFICIENT BALANCE"
                ) : (
                    `BUY ${outcome} • $${investment.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                )}
            </Button>
        </div>
    );
}
