"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Minus, Plus, ChevronDown, CheckCircle2, DollarSign } from "lucide-react";
import { haptics } from "@/lib/haptics";
import confetti from 'canvas-confetti';
import { CurrentPositionCard } from "./CurrentPositionCard";

interface UnifiedTradePanelProps {
    yesPrice: number;
    noPrice: number;
    balance: number;
    onTrade: (outcome: "YES" | "NO", amount: number) => Promise<void>;
    loading?: boolean;
    position?: {
        id: string;
        shares: number;
        avgPrice: number;
        invested: number;
        currentPnl: number;
        roi: number;
        side: "YES" | "NO";
    };
    onClosePosition?: () => void;
    // New props for header
    question?: string;
    imageUrl?: string;
}

export function UnifiedTradePanel({ yesPrice, noPrice, balance, onTrade, loading: externalLoading, position, onClosePosition, question, imageUrl }: UnifiedTradePanelProps) {
    const [action, setAction] = useState<"BUY" | "SELL">("BUY");
    const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
    const [sharesInput, setSharesInput] = useState<string>("");
    const [internalLoading, setInternalLoading] = useState(false);

    const loading = externalLoading || internalLoading;
    const currentPrice = outcome === "YES" ? yesPrice : noPrice;
    const isYes = outcome === "YES";

    // Calculations
    const shares = parseFloat(sharesInput) || 0;
    const investedAmount = shares * currentPrice; // Cost to buy these shares
    const potentialPayout = shares; // 1 share pays $1

    // Handlers
    const handleTrade = async () => {
        if (investedAmount <= 0 || investedAmount > balance) return;
        setInternalLoading(true);
        try {
            await onTrade(outcome, investedAmount);
            try { haptics.success(); } catch (e) { }
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        } catch (e) {
            console.error(e);
            try { haptics.error(); } catch (e) { }
        } finally {
            setInternalLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1A232E] rounded-xl overflow-hidden border border-[#2E3A52]">

            {/* Header: Market Info */}
            {question && (
                <div className="flex items-center gap-3 p-4 border-b border-[#2E3A52] bg-[#242E42]">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-zinc-700 shadow-sm">
                        {imageUrl ?
                            <img src={imageUrl} alt="Market" className="w-full h-full object-cover" /> :
                            <div className="w-full h-full bg-[#0B1219] flex items-center justify-center text-lg">🇺🇸</div>
                        }
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">{question}</h3>
                    </div>
                </div>
            )}

            {/* Tabs: Buy / Sell */}
            <div className="flex px-4 pt-2 border-b border-[#2E3A52] bg-[#242E42]">
                <button
                    onClick={() => setAction("BUY")}
                    className={cn(
                        "pb-3 text-sm font-bold transition-all border-b-2 px-2 mr-4",
                        action === "BUY" ? "text-white border-white" : "text-[#94A3B8] border-transparent hover:text-white"
                    )}
                >
                    Buy
                </button>
                <button
                    onClick={() => setAction("SELL")}
                    className={cn(
                        "pb-3 text-sm font-bold transition-all border-b-2 px-2 mr-auto",
                        action === "SELL" ? "text-white border-white" : "text-[#94A3B8] border-transparent hover:text-white"
                    )}
                >
                    Sell
                </button>
                <div className="pb-3 flex items-center">
                    <button className="text-xs font-bold text-[#94A3B8] flex items-center gap-1 hover:text-white transition-colors">
                        Limit <ChevronDown className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-4 flex-1 flex flex-col bg-[#1A232E] overflow-y-auto min-h-0">

                {/* Outcome Toggle */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        onClick={() => setOutcome("YES")}
                        className={cn(
                            "h-12 rounded-lg flex items-center justify-between px-4 transition-all relative overflow-hidden",
                            isYes
                                ? "bg-[#10B981] text-white shadow-lg shadow-green-900/20"
                                : "bg-[#242E42] text-[#94A3B8] hover:bg-[#2C3647]"
                        )}
                    >
                        <span className="font-bold">Yes</span>
                        <span className="font-mono font-medium">{(yesPrice * 100).toFixed(1)}¢</span>
                        {isYes && <div className="absolute inset-0 bg-white/10 blur-xl pointer-events-none" />}
                    </button>
                    <button
                        onClick={() => setOutcome("NO")}
                        className={cn(
                            "h-12 rounded-lg flex items-center justify-between px-4 transition-all",
                            !isYes
                                ? "bg-red-500/20 text-red-400 border-2 border-red-500/50 shadow-lg shadow-red-900/20"
                                : "bg-[#242E42] text-[#94A3B8] hover:bg-[#2C3647]"
                        )}
                    >
                        <span className="font-bold">No</span>
                        <span className="font-mono font-medium">{(noPrice * 100).toFixed(1)}¢</span>
                    </button>
                </div>

                {/* Inputs */}
                <div className="space-y-4 mb-6">
                    {/* Limit Price */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Limit Price</label>
                        </div>
                        <div className="flex items-center bg-[#0B1219] rounded-lg border border-[#2E3A52] h-12">
                            <button className="w-10 h-full flex items-center justify-center text-[#58687D] hover:text-white transition-colors">
                                <Minus className="w-4 h-4" />
                            </button>
                            <div className="flex-1 text-center font-mono font-bold text-white text-lg">
                                {(currentPrice * 100).toFixed(1)}¢
                            </div>
                            <button className="w-10 h-full flex items-center justify-center text-[#58687D] hover:text-white transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Shares */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Shares</label>
                            <span className="text-[10px] text-[#2E81FF] font-bold cursor-pointer hover:text-[#5B9BFF]">MAX</span>
                        </div>
                        <div className="bg-[#0B1219] rounded-lg border border-[#2E3A52] h-12 flex items-center px-4 mb-2 focus-within:border-[#2E81FF] transition-colors">
                            <input
                                type="number"
                                value={sharesInput}
                                onChange={(e) => setSharesInput(e.target.value)}
                                placeholder="0"
                                className="w-full bg-transparent border-none outline-none text-white font-mono text-lg font-bold placeholder-[#2E3A52]"
                            />
                        </div>
                        {/* Quick Add Pills */}
                        <div className="flex gap-2">
                            {["-100", "-10", "+10", "+100"].map(val => (
                                <button
                                    key={val}
                                    onClick={() => {
                                        const curr = parseFloat(sharesInput) || 0;
                                        const change = parseFloat(val);
                                        setSharesInput(Math.max(0, curr + change).toString());
                                    }}
                                    className="flex-1 py-1 bg-[#242E42] hover:bg-[#2C3647] rounded-md text-[10px] font-bold text-[#94A3B8] hover:text-white transition-colors border border-[#2E3A52]"
                                >
                                    {val}
                                </button>
                            ))}
                            <button
                                onClick={() => setSharesInput("200")}
                                className="flex-1 py-1 bg-[#2E81FF]/10 text-[#2E81FF] border border-[#2E81FF]/20 hover:bg-[#2E81FF]/20 rounded-md text-[10px] font-bold transition-colors"
                            >
                                +200
                            </button>
                        </div>
                    </div>
                </div>

                {/* Expiration Toggle */}
                <div className="flex items-center justify-between mb-6">
                    <span className="text-sm text-[#94A3B8] font-medium">Set Expiration</span>
                    <div className="w-10 h-5 bg-[#2E3A52] rounded-full relative cursor-pointer">
                        <div className="absolute left-1 top-1 w-3 h-3 bg-[#94A3B8] rounded-full" />
                    </div>
                </div>

                {/* Summary */}
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-white">Total</span>
                        <span className="text-sm font-bold text-[#2E81FF] font-mono">${investedAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-white flex items-center gap-1">
                            To Win <DollarSign className="w-3 h-3 text-[#10B981]" />
                        </span>
                        <span className="text-sm font-bold text-[#10B981] font-mono">${potentialPayout.toFixed(2)}</span>
                    </div>
                </div>

                {/* Action Button */}
                <Button
                    onClick={handleTrade}
                    disabled={loading || investedAmount <= 0 || investedAmount > balance}
                    className={cn(
                        "w-full h-11 text-base font-bold rounded-lg transition-all mb-4",
                        "bg-[#2E81FF] hover:bg-[#256ACC] text-white shadow-lg shadow-blue-900/20",
                        (investedAmount > balance) && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Trade"}
                </Button>

                <div className="text-center mb-4">
                    <span className="text-[10px] text-[#58687D]">
                        By trading, you agree to the Terms of Use.
                    </span>
                </div>

                {/* Position Card - Now inside scrollable area */}
                {position && (
                    <div className="border-t border-[#2E3A52] pt-4 mt-4">
                        <CurrentPositionCard
                            position={position}
                            currentPrice={position.side === "YES" ? yesPrice : noPrice}
                            onClose={onClosePosition}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// Removed OutcomeToggle helper as it's now inline
