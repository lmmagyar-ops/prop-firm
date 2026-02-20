"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import { X, TrendingUp, TrendingDown, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { getErrorMessage } from "@/lib/errors";
import { useTradeLimits } from "@/hooks/useTradeLimits";

/**
 * MobileTradeSheet - Bottom sheet optimized for mobile trading
 * 
 * Anthropic Engineering Standards:
 * - Drag to dismiss (swipe down)
 * - Snap points (partial open, full open)
 * - Large touch targets for buttons
 * - Haptic feedback throughout
 */

interface MobileTradeSheetProps {
    isOpen: boolean;
    onClose: () => void;
    marketTitle: string;
    marketId: string;
    challengeId?: string;
    yesPrice: number;
    noPrice: number;
    balance: number;
    onTrade: (outcome: "YES" | "NO", amount: number) => Promise<void>;
}

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];

function formatConstraint(key?: string): string {
    const labels: Record<string, string> = {
        balance: 'Balance',
        per_event: 'Event limit',
        per_category: 'Category limit',
        daily_loss: 'Daily loss limit',
        total_drawdown: 'Drawdown limit',
        volume_tier: 'Volume limit',
        liquidity: 'Liquidity limit',
        max_positions: 'Position limit',
    };
    return labels[key || ''] || 'Limit reached';
}

export function MobileTradeSheet({
    isOpen,
    onClose,
    marketTitle,
    marketId,
    challengeId,
    yesPrice,
    noPrice,
    balance,
    onTrade,
}: MobileTradeSheetProps) {
    const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
    const [amount, setAmount] = useState(50);
    const [loading, setLoading] = useState(false);
    const dragControls = useDragControls();
    const sheetRef = useRef<HTMLDivElement>(null);

    // Preflight limits from server
    const { limits } = useTradeLimits(isOpen ? challengeId : null, isOpen ? marketId : null);
    const effectiveMax = limits ? Math.min(balance, limits.effectiveMax) : balance;
    const exceedsLimit = limits ? amount > limits.effectiveMax : false;

    const currentPrice = outcome === "YES" ? yesPrice : noPrice;
    const shares = currentPrice > 0 ? amount / currentPrice : 0;
    const potentialReturn = shares - amount;
    const returnPercent = amount > 0 ? (potentialReturn / amount) * 100 : 0;

    // Reset state when sheet opens
    useEffect(() => {
        if (isOpen) {
            setOutcome("YES");
            setAmount(50);
        }
    }, [isOpen]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Dismiss if dragged down more than 100px or with velocity
        if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose();
        }
    };

    const handleOutcomeChange = (newOutcome: "YES" | "NO") => {
        setOutcome(newOutcome);
        try { haptics.light(); } catch (e) { }
    };

    const handleAmountSelect = (value: number) => {
        setAmount(value);
        try { haptics.light(); } catch (e) { };
    };

    const handleTrade = async () => {
        if (amount <= 0 || amount > effectiveMax || loading) return;

        setLoading(true);
        try {
            await onTrade(outcome, amount);
            try { haptics.success(); } catch (e) { }
            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.8 }
            });
            onClose();
        } catch (error: unknown) {
            const errorMessage = getErrorMessage(error);
            console.error("Trade failed:", errorMessage);
            toast.error(errorMessage);
            try { haptics.error(); } catch (e) { }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        ref={sheetRef}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        drag="y"
                        dragControls={dragControls}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onDragEnd={handleDragEnd}
                        className="fixed inset-x-0 bottom-0 z-50 bg-zinc-900 rounded-t-3xl max-h-[85vh] overflow-hidden"
                    >
                        {/* Drag Handle */}
                        <div
                            className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
                            onPointerDown={(e) => dragControls.start(e)}
                        >
                            <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pb-4 border-b border-zinc-800">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-bold text-white truncate">
                                    {marketTitle}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-zinc-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-120px)]">
                            {/* Outcome Selector - Large Touch Targets */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleOutcomeChange("YES")}
                                    className={cn(
                                        "py-6 rounded-2xl transition-all flex flex-col items-center gap-1",
                                        outcome === "YES"
                                            ? "bg-emerald-500/20 border-2 border-emerald-500"
                                            : "bg-zinc-800 border-2 border-transparent"
                                    )}
                                >
                                    <TrendingUp className={cn(
                                        "w-8 h-8",
                                        outcome === "YES" ? "text-emerald-400" : "text-zinc-500"
                                    )} />
                                    <span className={cn(
                                        "text-2xl font-black",
                                        outcome === "YES" ? "text-emerald-400" : "text-zinc-400"
                                    )}>
                                        YES
                                    </span>
                                    <span className={cn(
                                        "text-sm font-mono",
                                        outcome === "YES" ? "text-emerald-400/70" : "text-zinc-500"
                                    )}>
                                        {(yesPrice * 100).toFixed(1)}¢
                                    </span>
                                </button>

                                <button
                                    onClick={() => handleOutcomeChange("NO")}
                                    className={cn(
                                        "py-6 rounded-2xl transition-all flex flex-col items-center gap-1",
                                        outcome === "NO"
                                            ? "bg-rose-500/20 border-2 border-rose-500"
                                            : "bg-zinc-800 border-2 border-transparent"
                                    )}
                                >
                                    <TrendingDown className={cn(
                                        "w-8 h-8",
                                        outcome === "NO" ? "text-rose-400" : "text-zinc-500"
                                    )} />
                                    <span className={cn(
                                        "text-2xl font-black",
                                        outcome === "NO" ? "text-rose-400" : "text-zinc-400"
                                    )}>
                                        NO
                                    </span>
                                    <span className={cn(
                                        "text-sm font-mono",
                                        outcome === "NO" ? "text-rose-400/70" : "text-zinc-500"
                                    )}>
                                        {(noPrice * 100).toFixed(1)}¢
                                    </span>
                                </button>
                            </div>

                            {/* Quick Amount Buttons */}
                            <div>
                                <label className="text-sm text-zinc-500 mb-2 block">Amount</label>
                                <div className="flex flex-wrap gap-2">
                                    {QUICK_AMOUNTS.map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => handleAmountSelect(val)}
                                            className={cn(
                                                "px-4 py-3 rounded-xl text-sm font-bold transition-all flex-1 min-w-[60px]",
                                                amount === val
                                                    ? "bg-[#29af73] text-white"
                                                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                            )}
                                        >
                                            ${val}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => handleAmountSelect(Math.floor(effectiveMax))}
                                        className={cn(
                                            "px-4 py-3 rounded-xl text-sm font-bold transition-all flex-1 min-w-[60px]",
                                            amount === Math.floor(effectiveMax)
                                                ? "bg-[#29af73] text-white"
                                                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                        )}
                                    >
                                        MAX
                                    </button>
                                </div>
                            </div>

                            {/* Order Summary */}
                            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Investment</span>
                                    <span className="font-mono text-white">${amount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Shares</span>
                                    <span className="font-mono text-white">
                                        {shares.toFixed(1)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t border-zinc-700">
                                    <span className="text-zinc-400 font-medium">If {outcome} wins</span>
                                    <span className={cn(
                                        "font-mono font-bold",
                                        outcome === "YES" ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        +${potentialReturn.toFixed(2)} ({returnPercent.toFixed(0)}%)
                                    </span>
                                </div>
                            </div>

                            {/* Drawdown Risk Warning */}
                            {amount > 0 && limits && limits.limits.drawdownRemaining > 0 && (() => {
                                const ddPercent = (amount / limits.limits.drawdownRemaining) * 100;
                                if (ddPercent < 10) return null;
                                const isDanger = ddPercent >= 100;
                                return (
                                    <div className={cn(
                                        "flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-200",
                                        isDanger
                                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    )}>
                                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                        <span>
                                            {isDanger
                                                ? `This trade exceeds your remaining drawdown ($${limits.limits.drawdownRemaining.toLocaleString()})`
                                                : `This trade risks ${ddPercent.toFixed(0)}% of your remaining drawdown ($${limits.limits.drawdownRemaining.toLocaleString()} left)`
                                            }
                                        </span>
                                    </div>
                                );
                            })()}

                            <button
                                onClick={handleTrade}
                                disabled={loading || amount <= 0 || amount > effectiveMax}
                                className={cn(
                                    "w-full py-5 rounded-2xl text-lg font-black uppercase tracking-wide transition-all active:scale-[0.98]",
                                    outcome === "YES"
                                        ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                                        : "bg-rose-500 hover:bg-rose-400 text-white",
                                    (loading || amount > effectiveMax) && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </span>
                                ) : exceedsLimit ? (
                                    `Limit: $${limits?.effectiveMax.toLocaleString()} (${formatConstraint(limits?.bindingConstraint)})`
                                ) : amount > balance ? (
                                    "Insufficient Balance"
                                ) : (
                                    `Buy ${outcome} • $${amount}`
                                )}
                            </button>

                            {/* Balance & Limit Info */}
                            <p className="text-center text-sm text-zinc-500">
                                Balance: <span className="font-mono text-zinc-400">${balance.toLocaleString()}</span>
                                {limits && limits.effectiveMax < balance && (
                                    <span className="ml-2">• Max: <span className="font-mono text-zinc-400">${limits.effectiveMax.toLocaleString()}</span></span>
                                )}
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
