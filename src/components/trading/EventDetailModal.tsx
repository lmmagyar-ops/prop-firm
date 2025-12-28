"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X, TrendingUp, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTradeExecution } from "@/hooks/useTradeExecution";
import type { EventMetadata, SubMarket } from "@/app/actions/market";

interface EventDetailModalProps {
    event: EventMetadata | null;
    open: boolean;
    onClose: () => void;
    onTrade: (marketId: string, side: 'yes' | 'no', question: string) => void;
}

/**
 * EventDetailModal - Full event detail view matching Polymarket
 * Shows all outcomes with trading capability
 */
export function EventDetailModal({ event, open, onClose, onTrade }: EventDetailModalProps) {
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);

    if (!event) return null;

    const selectedMarket = event.markets.find(m => m.id === selectedMarketId) || event.markets[0];

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
        return `$${volume.toFixed(0)}`;
    };

    const content = (
        <div className="flex flex-col lg:flex-row h-full">
            {/* Left Side - Event Info & Outcomes */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Event Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-start gap-4">
                        {event.image && (
                            <img
                                src={event.image}
                                alt=""
                                className="w-16 h-16 rounded-xl object-cover"
                            />
                        )}
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">
                                {event.title}
                            </h2>
                            <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                                <span className="flex items-center gap-1">
                                    <TrendingUp className="w-4 h-4" />
                                    {formatVolume(event.volume)} Vol.
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {event.markets.length} outcomes
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>
                    </div>

                    {/* Outcome Legend (top outcomes) */}
                    <div className="flex flex-wrap gap-3 mt-4 text-xs">
                        {event.markets.slice(0, 4).map((market, i) => (
                            <span key={market.id} className="flex items-center gap-1.5">
                                <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    i === 0 ? "bg-blue-400" :
                                        i === 1 ? "bg-orange-400" :
                                            i === 2 ? "bg-purple-400" : "bg-emerald-400"
                                )} />
                                <span className="text-zinc-400">
                                    {getShortLabel(market.question)} {Math.round(market.price * 100)}%
                                </span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Outcomes Table */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-3 flex items-center text-xs text-zinc-500 font-medium border-b border-white/5">
                        <span className="flex-1">OUTCOME</span>
                        <span className="w-20 text-right">% CHANCE</span>
                        <span className="w-48 text-center">ACTIONS</span>
                    </div>

                    {event.markets.map((market) => (
                        <OutcomeRow
                            key={market.id}
                            market={market}
                            isSelected={market.id === selectedMarketId}
                            onSelect={() => setSelectedMarketId(market.id)}
                            onTrade={(side) => onTrade(market.id, side, market.question)}
                        />
                    ))}
                </div>
            </div>

            {/* Right Side - Trading Widget */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 bg-zinc-900/50 p-6">
                <TradingSidebar
                    market={selectedMarket}
                    onTradeComplete={onClose}
                />
            </div>
        </div>
    );

    // Desktop Modal
    if (!isMobile) {
        return (
            <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
                <DialogContent className="!max-w-5xl h-[85vh] p-0 gap-0 bg-[#0D1117] border-zinc-800 overflow-hidden">
                    <DialogTitle className="sr-only">{event.title}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Event details for {event.title}
                    </DialogDescription>
                    {content}
                </DialogContent>
            </Dialog>
        );
    }

    // Mobile Full Screen
    return (
        <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
            <SheetContent side="bottom" className="h-[95vh] p-0 bg-[#0D1117] border-t border-zinc-800">
                {content}
            </SheetContent>
        </Sheet>
    );
}

// --- Outcome Row Component ---
interface OutcomeRowProps {
    market: SubMarket;
    isSelected: boolean;
    onSelect: () => void;
    onTrade: (side: 'yes' | 'no') => void;
}

function OutcomeRow({ market, isSelected, onSelect, onTrade }: OutcomeRowProps) {
    const percentage = Math.round(market.price * 100);
    const yesPrice = Math.round(market.price * 100);
    const noPrice = 100 - yesPrice;

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
        return `$${volume.toFixed(0)}`;
    };

    return (
        <div
            className={cn(
                "px-6 py-4 flex items-center border-b border-white/5 cursor-pointer transition-colors",
                isSelected ? "bg-blue-500/10" : "hover:bg-white/5"
            )}
            onClick={onSelect}
        >
            {/* Outcome Name */}
            <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">
                    {getShortLabel(market.question)}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                    {formatVolume(market.volume)} Vol.
                </div>
            </div>

            {/* Percentage */}
            <div className="w-20 text-right">
                <span className={cn(
                    "text-lg font-bold tabular-nums",
                    percentage >= 50 ? "text-emerald-400" : "text-zinc-300"
                )}>
                    {percentage}%
                </span>
            </div>

            {/* Trading Buttons */}
            <div className="w-48 flex justify-center gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade('yes'); }}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white transition-colors"
                >
                    Buy Yes {yesPrice}¢
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade('no'); }}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-rose-500 hover:bg-rose-400 text-white transition-colors"
                >
                    Buy No {noPrice}¢
                </button>
            </div>
        </div>
    );
}

// --- Trading Sidebar Component ---
interface TradingSidebarProps {
    market: SubMarket;
    onTradeComplete?: () => void;
}

function TradingSidebar({ market, onTradeComplete }: TradingSidebarProps) {
    const [side, setSide] = useState<'yes' | 'no'>('yes');
    const [amount, setAmount] = useState(0); // Dollar amount (not shares)

    const { executeTrade, isLoading } = useTradeExecution({
        onSuccess: () => {
            setAmount(0); // Reset after successful trade
            onTradeComplete?.();
        },
    });

    const yesPrice = Math.round(market.price * 100);
    const noPrice = 100 - yesPrice;
    const price = side === 'yes' ? yesPrice : noPrice;
    const shares = amount / (price / 100);
    const toWin = shares - amount;

    const handleSubmit = async () => {
        if (amount <= 0) return;

        await executeTrade(
            market.id,
            side.toUpperCase() as "YES" | "NO",
            amount
        );
    };

    return (
        <div className="space-y-6">
            {/* Selected Outcome */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <div className="text-sm font-semibold text-white truncate">
                        {getShortLabel(market.question)}
                    </div>
                </div>
            </div>

            {/* Buy/Sell Toggle */}
            <div className="flex gap-2 p-1 bg-zinc-800 rounded-lg">
                <button className="flex-1 py-2 text-sm font-semibold rounded-md bg-zinc-700 text-white">
                    Buy
                </button>
                <button className="flex-1 py-2 text-sm font-semibold rounded-md text-zinc-400 hover:text-white transition-colors">
                    Sell
                </button>
            </div>

            {/* Yes/No Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setSide('yes')}
                    className={cn(
                        "flex-1 py-3 rounded-lg font-semibold transition-all",
                        side === 'yes'
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                    )}
                >
                    Yes {yesPrice}¢
                </button>
                <button
                    onClick={() => setSide('no')}
                    className={cn(
                        "flex-1 py-3 rounded-lg font-semibold transition-all",
                        side === 'no'
                            ? "bg-rose-500 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                    )}
                >
                    No {noPrice}¢
                </button>
            </div>

            {/* Amount Input (Dollars) */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Amount ($)</span>
                    <span className="text-zinc-500">Max</span>
                </div>
                <input
                    type="number"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-right text-lg font-mono focus:outline-none focus:border-blue-500"
                />
                <div className="flex justify-center gap-2">
                    {[10, 50, 100].map((amt) => (
                        <button
                            key={amt}
                            onClick={() => setAmount(amount + amt)}
                            className="px-3 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                        >
                            +${amt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-zinc-400">Shares</span>
                    <span className="text-white font-mono">{shares > 0 ? shares.toFixed(2) : '0'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-400">Total</span>
                    <span className="text-emerald-400 font-semibold">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-400">To Win 🌿</span>
                    <span className="text-emerald-400 font-semibold">${toWin > 0 ? toWin.toFixed(2) : '0.00'}</span>
                </div>
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={amount <= 0 || isLoading}
                className={cn(
                    "w-full py-4 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2",
                    side === 'yes'
                        ? "bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50"
                        : "bg-rose-500 hover:bg-rose-400 disabled:bg-rose-500/50",
                    (amount <= 0 || isLoading) && "opacity-50 cursor-not-allowed"
                )}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Executing...
                    </>
                ) : (
                    `Buy ${side === 'yes' ? 'Yes' : 'No'}`
                )}
            </button>

            <p className="text-xs text-zinc-500 text-center">
                By trading, you agree to the Terms of Use.
            </p>
        </div>
    );
}

// --- Helper Function ---
function getShortLabel(question: string): string {
    // Extract meaningful part from question
    if (question.includes("Will ") && question.includes(" be ")) {
        const match = question.match(/Will ([^?]+?) be/i);
        if (match) return match[1].trim();
    }

    let cleaned = question
        .replace(/^Will /i, '')
        .replace(/\?.*$/, '')
        .trim();

    return cleaned.split(' ').slice(0, 4).join(' ');
}
