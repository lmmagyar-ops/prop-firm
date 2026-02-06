"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import { X, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import confetti from "canvas-confetti";

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
    yesPrice: number;
    noPrice: number;
    balance: number;
    onTrade: (outcome: "YES" | "NO", amount: number) => Promise<void>;
}

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];

export function MobileTradeSheet({
    isOpen,
    onClose,
    marketTitle,
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
        try { haptics.light(); } catch (e) { }
    };

    const handleTrade = async () => {
        if (amount <= 0 || amount > balance || loading) return;

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
        } catch (error: any) {
            const errorMessage = error?.message || "Trade failed";
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
                                        {(yesPrice * 100).toFixed(0)}¢
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
                                        {(noPrice * 100).toFixed(0)}¢
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
                                        onClick={() => handleAmountSelect(Math.floor(balance))}
                                        className={cn(
                                            "px-4 py-3 rounded-xl text-sm font-bold transition-all flex-1 min-w-[60px]",
                                            amount === Math.floor(balance)
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

                            {/* Trade Button */}
                            <button
                                onClick={handleTrade}
                                disabled={loading || amount <= 0 || amount > balance}
                                className={cn(
                                    "w-full py-5 rounded-2xl text-lg font-black uppercase tracking-wide transition-all active:scale-[0.98]",
                                    outcome === "YES"
                                        ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                                        : "bg-rose-500 hover:bg-rose-400 text-white",
                                    (loading || amount > balance) && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </span>
                                ) : amount > balance ? (
                                    "Insufficient Balance"
                                ) : (
                                    `Buy ${outcome} • $${amount}`
                                )}
                            </button>

                            {/* Balance */}
                            <p className="text-center text-sm text-zinc-500">
                                Balance: <span className="font-mono text-zinc-400">${balance.toLocaleString()}</span>
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
