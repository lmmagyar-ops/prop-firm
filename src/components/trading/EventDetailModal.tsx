"use client";

import { useState, useEffect, useRef, Component, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X, TrendingUp, Calendar, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import Image from "next/image";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTradeExecution } from "@/hooks/useTradeExecution";
import { useTradeLimits } from "@/hooks/useTradeLimits";
import type { EventMetadata, SubMarket } from "@/app/actions/market";
import { getCleanOutcomeName } from "@/lib/market-utils";
import { OrderBook } from "./OrderBook";


// Dynamic import with ssr:false — lightweight-charts uses canvas/document APIs
// that crash during server-side rendering, which silently breaks the entire page
const ProbabilityChart = dynamic(
    () => import("./ProbabilityChart").then(m => m.ProbabilityChart),
    {
        ssr: false,
        loading: () => (
            <div className="space-y-4">
                <div className="flex gap-2">
                    {["1H", "1D", "1W", "1M", "ALL"].map(r => (
                        <div key={r} className="w-10 h-6 rounded-lg bg-zinc-800/50 animate-pulse" />
                    ))}
                </div>
                <div className="w-full h-[300px] rounded-lg bg-zinc-800/30 animate-pulse" />
            </div>
        ),
    }
);

/**
 * Lightweight Error Boundary — prevents a chart or feed crash
 * from taking down the entire detail modal.
 */
class ChartErrorBoundary extends Component<
    { children: ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="px-6 py-8 text-center text-sm text-zinc-500">
                    Chart unavailable
                </div>
            );
        }
        return this.props.children;
    }
}

interface EventDetailModalProps {
    event: EventMetadata | null;
    open: boolean;
    onClose: () => void;
    onTrade: (marketId: string, side: 'yes' | 'no', question: string) => void;
    challengeId?: string;
}

/**
 * EventDetailModal - Full event detail view (Polymarket Dark theme)
 */
export function EventDetailModal({ event, open, onClose, onTrade, challengeId }: EventDetailModalProps) {
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
    const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');

    const bgColor = "bg-[#0D1117]";
    const textColor = "text-white";
    const subTextColor = "text-zinc-400";
    const borderColor = "border-white/10";
    const hoverColor = "hover:bg-white/5";

    if (!event) return null;

    const selectedMarket = event.markets.find(m => m.id === selectedMarketId) || event.markets[0];

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
        return `$${volume.toFixed(0)}`;
    };

    const getDisplayName = (question: string, eventTitle?: string) => {
        return getCleanOutcomeName(question, eventTitle);
    };

    const content = (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Left Side - Event Info & Outcomes */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Event Header (Dense Professional Style) */}
                <div className={cn("px-6 pt-5 pb-4 border-b", borderColor)}>
                    {/* Top Row: Breadcrumbs & Actions */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                            {(event.categories && event.categories.length > 0
                                ? event.categories.slice(0, 3)
                                : ['Other']
                            ).map((cat, i) => (
                                <span key={cat} className="flex items-center gap-2">
                                    {i > 0 && <span className="text-zinc-600">·</span>}
                                    <span className="text-zinc-500 hover:text-zinc-300 transition-colors">{cat}</span>
                                </span>
                            ))}
                        </div>

                        <div className="flex items-center gap-1">

                            <button
                                onClick={onClose}
                                className={cn("p-2 rounded-lg transition-colors ml-2", hoverColor)}
                            >
                                <X className={cn("w-5 h-5", subTextColor)} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-start gap-5">
                        {event.image && (
                            <Image
                                src={event.image}
                                alt=""
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-lg object-cover shadow-sm bg-slate-100"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <h2 className={cn("text-xl font-bold leading-tight tracking-tight", textColor)}>
                                {event.title}
                            </h2>

                            <div className={cn("flex items-center gap-x-6 gap-y-2 mt-3 text-xs font-medium flex-wrap", subTextColor)}>
                                <span className="flex items-center gap-1.5 text-zinc-400">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    {formatVolume(event.volume)} Vol
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {new Date(event.endDate || event.openTime || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>

                            </div>
                        </div>
                    </div>

                    {/* Outcome Legend (top outcomes) */}
                    {event.markets.length > 3 && (
                        <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-slate-100/50 text-[11px] font-medium tracking-wide">
                            {event.markets.slice(0, 4).map((market, i) => (
                                <span key={market.id} className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity cursor-default">
                                    <span className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        i === 0 ? "bg-blue-500" :
                                            i === 1 ? "bg-pink-500" :
                                                i === 2 ? "bg-purple-500" : "bg-emerald-500"
                                    )} />
                                    <span className="text-zinc-400">
                                        {getDisplayName(market.question, event.title)}
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Large Probability Display (Polymarket style) - For binary markets */}
                {event.markets.length === 1 && (
                    <div className="px-6 py-4 border-b border-white/5 animate-in fade-in duration-300">
                        <div className="flex items-baseline gap-3">
                            <span className={cn(
                                "text-3xl font-bold tabular-nums",
                                event.markets[0].price >= 0.5 ? "text-emerald-400" : "text-rose-400"
                            )}>
                                {formatPrice(event.markets[0].price)} chance
                            </span>
                            <span className={cn(
                                "text-sm font-medium",
                                event.markets[0].price >= 0.5 ? "text-emerald-500/60" : "text-rose-500/60"
                            )}>
                                {event.markets[0].price >= 0.5 ? "▲" : "▼"} {Math.round(event.markets[0].price * 6)}%
                            </span>
                        </div>
                    </div>
                )}

                {/* Outcomes List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    {/* Price History Chart — Polymarket only */}
                    {(
                        <div className="px-6 py-4 border-b border-white/5">
                            <ChartErrorBoundary>
                                <ProbabilityChart
                                    key={selectedMarket.id}
                                    tokenId={selectedMarket.id}
                                    currentPrice={selectedMarket.price}
                                    outcome={selectedMarket.price >= 0.5 ? "YES" : "NO"}
                                />
                            </ChartErrorBoundary>
                        </div>
                    )}

                    <div className={cn(
                        "flex items-center justify-between px-6 py-2 text-[10px] font-bold uppercase tracking-wider border-b shrink-0 sticky top-0 z-20",
                        "bg-[#0D1117] border-white/10 text-zinc-500"
                    )}>
                        <span>Outcome</span>
                        <div className="flex gap-16 mr-2">
                            <span>% Chance</span>
                            <span>Actions</span>
                        </div>
                    </div>

                    {event.markets.map((market) => (
                        <OutcomeRow
                            key={market.id}
                            market={market}
                            eventTitle={event.title}
                            isSelected={market.id === selectedMarketId}
                            onSelect={() => setSelectedMarketId(market.id)}
                            onTrade={(side) => {
                                setSelectedMarketId(market.id);
                                setSelectedSide(side);
                            }}

                        />
                    ))}



                    {event.description && (
                        <details className="group border-t border-white/5">
                            <summary className="px-6 py-4 flex items-center justify-between cursor-pointer text-sm font-semibold text-white hover:bg-white/5 transition-colors">
                                <span>Rules</span>
                                <svg className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <div className="px-6 pb-4 text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                                {event.description}
                                {event.endDate && (
                                    <div className="mt-4 pt-4 border-t border-white/5 text-xs text-zinc-500">
                                        <strong>End Date:</strong> {new Date(event.endDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                )}
                            </div>
                        </details>
                    )}

                    <OrderBook tokenId={selectedMarket?.id} />

                </div>
            </div>

            {/* Right Side - Trading Widget */}
            <div className={cn(
                "w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l flex flex-col h-full",
                borderColor,
                "bg-zinc-900/50"
            )}>
                {/* Right Panel Header - Matches Left Side */}
                <div className={cn(
                    "flex items-center px-4 py-3 border-b",
                    borderColor,
                    "bg-transparent",
                    // Match the height of the left panel header's bottom section or just fixed height
                    "h-[57px]"
                )}>
                    <h3 className={cn("font-bold text-sm", textColor)}>
                        {selectedMarket ? getDisplayName(selectedMarket.question, event.title) : 'Select an outcome'}
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <TradingSidebar
                        market={selectedMarket}
                        eventTitle={event.title}
                        onTradeComplete={onClose}

                        initialSide={selectedSide}
                        challengeId={challengeId}
                    />
                </div>
            </div>
        </div>
    );

    // Desktop Modal
    if (!isMobile) {
        return (
            <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
                <DialogContent
                    showCloseButton={false}
                    className={cn(
                        "!max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden",
                        bgColor,
                        "border-zinc-800"
                    )}
                >
                    <DialogTitle className="sr-only">{event.title}</DialogTitle>
                    <DialogDescription className="sr-only">Event details</DialogDescription>
                    {content}
                </DialogContent>
            </Dialog>
        );
    }

    // Mobile Full Screen
    return (
        <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
            <SheetContent side="bottom" className={cn("h-[95vh] p-0 border-t", bgColor, borderColor)}>
                {content}
            </SheetContent>
        </Sheet>
    );
}

// --- Outcome Row Component ---
interface OutcomeRowProps {
    market: SubMarket;
    eventTitle: string;
    isSelected: boolean;
    onSelect: () => void;
    onTrade: (side: 'yes' | 'no') => void;
}

function OutcomeRow({ market, eventTitle, isSelected, onSelect, onTrade }: OutcomeRowProps) {
    const percentage = formatPrice(market.price);
    const yesCents = (market.price * 100).toFixed(1);
    const noCents = ((1 - market.price) * 100).toFixed(1);

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
        return `$${volume.toFixed(0)}`;
    };

    return (
        <div
            className={cn(
                "px-6 py-3 flex items-center border-b cursor-pointer transition-all duration-150 group",
                "border-white/5",
                isSelected
                    ? "bg-primary/10 border-l-2 border-l-emerald-400"
                    : "hover:bg-white/[0.03]"
            )}
            onClick={onSelect}
        >
            {/* Outcome Name + Volume */}
            < div className="flex-1 min-w-0 pr-4" >
                <div className="text-[15px] transition-colors flex flex-col justify-center text-white group-hover:text-primary">
                    {getCleanOutcomeName(market.question, eventTitle)}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                    {formatVolume(market.volume)} Vol.
                </div>
            </div >

            < div className="w-20 text-right mr-6 flex flex-col items-end justify-center" >
                <span className={cn(
                    "text-lg font-bold tabular-nums leading-none",
                    market.price >= 0.5 ? "text-emerald-400" : "text-zinc-400"
                )}>
                    {percentage}
                </span>
            </div >

            < div className="flex rounded-lg p-1 gap-1 bg-zinc-800/50" >
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade('yes'); }}
                    className="relative w-24 h-10 flex items-center justify-between px-3 rounded-md transition-all group/btn bg-[#00C896] hover:bg-[#00B88A] active:scale-[0.98]"
                >
                    <span className="text-xs font-bold uppercase tracking-wide text-[#052e1f]">Yes</span>
                    <span className="text-base font-bold text-[#052e1f]">
                        {parseFloat(yesCents) < 1 ? "<1" : yesCents}¢
                    </span>
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onTrade('no'); }}
                    className="relative w-24 h-10 flex items-center justify-between px-3 rounded-md transition-all group/btn bg-[#E63E5D] hover:bg-[#D43552] active:scale-[0.98]"
                >
                    <span className="text-xs font-bold uppercase tracking-wide text-[#380e14]">No</span>
                    <span className="text-base font-bold text-[#380e14]">
                        {parseFloat(noCents) < 1 ? "<1" : noCents}¢
                    </span>
                </button>
            </div >
        </div >
    );
}

// --- Trading Sidebar Component ---
interface TradingSidebarProps {
    market: SubMarket;
    eventTitle?: string;
    onTradeComplete?: () => void;
    initialSide?: 'yes' | 'no';
    challengeId?: string;
}

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

function TradingSidebar({ market, eventTitle, onTradeComplete, initialSide = 'yes', challengeId }: TradingSidebarProps) {
    const [side, setSide] = useState<'yes' | 'no'>(initialSide);
    const [mode, setMode] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState(0); // Dollar amount
    const [sellLoading, setSellLoading] = useState(false);
    const isSellRef = useRef(false);
    const [userPosition, setUserPosition] = useState<{ id: string; shares: string; side: string; direction: string; entryPrice: string; currentValue: number; pnl: number; sizeAmount?: string } | null>(null);
    const [positionLoading, setPositionLoading] = useState(false);
    const [requotePrice, setRequotePrice] = useState<number | null>(null);

    // Preflight limits from server
    const { limits } = useTradeLimits(challengeId, market?.id);

    // Sync side when parent changes it (e.g. clicking outcome YES/NO buttons)
    useEffect(() => {
        setSide(initialSide);
        setRequotePrice(null); // Clear re-quote on side change
    }, [initialSide]);

    // Clear re-quote when market changes
    useEffect(() => {
        setRequotePrice(null);
    }, [market.id]);

    // DEFENSE-IN-DEPTH: Listen for price re-quote events from trade execution
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.freshPrice) {
                setRequotePrice(detail.freshPrice);
            }
        };
        window.addEventListener('price-requote', handler);
        return () => window.removeEventListener('price-requote', handler);
    }, []);

    // Fetch user's position for this market when sell mode is activated
    useEffect(() => {
        if (mode !== 'sell') return;
        let cancelled = false;
        setPositionLoading(true);

        fetch('/api/positions/check?marketId=' + encodeURIComponent(market.id))
            .then(r => r.json())
            .then(data => {
                if (!cancelled) setUserPosition(data.position || null);
            })
            .catch(() => {
                if (!cancelled) setUserPosition(null);
            })
            .finally(() => {
                if (!cancelled) setPositionLoading(false);
            });

        return () => { cancelled = true; };
    }, [mode, market.id]);

    const { executeTrade, isLoading } = useTradeExecution({
        onSuccess: () => {
            setAmount(0); // Reset after successful trade
            setRequotePrice(null); // Clear re-quote on success
            onTradeComplete?.();
        },
    });

    // Use re-quoted price if available, otherwise use market price
    const effectiveMarketPrice = requotePrice ?? market.price;
    const yesCentsNum = effectiveMarketPrice * 100;
    const noCentsNum = (1 - effectiveMarketPrice) * 100;
    const yesCents = yesCentsNum.toFixed(1);
    const noCents = noCentsNum.toFixed(1);
    const price = side === 'yes' ? yesCentsNum : noCentsNum;
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

    const handleSell = async () => {
        if (!userPosition) return;
        if (isSellRef.current) return;
        isSellRef.current = true;
        setSellLoading(true);
        try {
            const res = await fetch('/api/trade/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ positionId: userPosition.id, idempotencyKey: crypto.randomUUID() }),
            });
            if (res.status === 401) {
                const { toast } = await import('sonner');
                toast.error("Session expired — please log in again");
                window.location.href = "/login";
                return;
            }
            const data = await res.json();
            if (data.success) {
                const { toast } = await import('sonner');
                toast.success(`Closed position — P&L: $${data.pnl?.toFixed(2) || '0.00'}`);
                window.dispatchEvent(new CustomEvent('balance-updated', {
                    detail: { newBalance: data.newBalance }
                }));
                onTradeComplete?.();
            } else {
                const { toast } = await import('sonner');
                toast.error(data.error || 'Failed to close position');
            }
        } catch {
            const { toast } = await import('sonner');
            toast.error('Network error');
        } finally {
            setSellLoading(false);
            isSellRef.current = false;
        }
    };

    // NOTE: "Market Nearly Resolved" UI guard has been removed.
    // The server-side trade execution (trade.ts) handles resolution checks.
    // The UI guard was repeatedly triggered by stale CLOB data from dual-token markets,
    // old trade API responses, and SSR cache — causing a worse UX than no guard at all.

    return (
        <div className="space-y-6">
            {/* Selected Outcome */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/20">
                    <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <div className="text-sm font-semibold line-clamp-2 text-white">
                        {getCleanOutcomeName(market.question, eventTitle || "")}
                    </div>
                </div>
            </div>

            {/* Buy/Sell Toggle */}
            <div className={cn(
                "flex gap-1 p-1 rounded-lg",
                "bg-zinc-800/80"
            )}>
                <button
                    onClick={() => setMode('buy')}
                    className={cn(
                        "flex-1 py-1.5 text-sm font-semibold rounded-md transition-all",
                        mode === 'buy'
                            ? "bg-zinc-700 text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    Buy
                </button>
                <button
                    onClick={() => setMode('sell')}
                    className={cn(
                        "flex-1 py-1.5 text-sm font-semibold rounded-md transition-all",
                        mode === 'sell'
                            ? "bg-zinc-700 text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    Sell
                </button>
            </div>

            {/* === SELL MODE === */}
            {mode === 'sell' ? (
                <div className="space-y-4">
                    {positionLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                        </div>
                    ) : userPosition ? (
                        <>
                            {/* Position Info */}
                            <div className={cn(
                                "rounded-lg p-4 space-y-3",
                                "bg-zinc-800/60 border border-zinc-700/50"
                            )}>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Side</span>
                                    <span className={cn("font-semibold", userPosition.direction === 'YES' ? "text-emerald-500" : "text-rose-500")}>
                                        {userPosition.direction}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Shares</span>
                                    <span className="font-mono text-white">
                                        {parseFloat(userPosition.shares).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Avg Price</span>
                                    <span className="font-mono text-white">
                                        {(parseFloat(userPosition.entryPrice) * 100).toFixed(1)}¢
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Invested</span>
                                    <span className="font-semibold text-white">
                                        ${parseFloat(userPosition.sizeAmount || '0').toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Close Position Button */}
                            <button
                                onClick={handleSell}
                                disabled={sellLoading}
                                className={cn(
                                    "w-full py-4 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2",
                                    "bg-rose-500 hover:bg-rose-400",
                                    sellLoading && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {sellLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Closing...
                                    </>
                                ) : (
                                    `Close ${userPosition.direction} Position`
                                )}
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-8 space-y-2 text-zinc-500">
                            <p className="text-sm font-medium">No position on this outcome</p>
                            <p className="text-xs">Check your open positions on the Dashboard to find and close existing trades.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* === BUY MODE === */
                <>

                    {/* Yes/No Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSide('yes')}
                            className={cn(
                                "flex-1 py-3 rounded-lg font-semibold transition-all flex flex-col items-center",
                                side === 'yes'
                                    ? "bg-emerald-500 text-white"
                                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                            )}
                        >
                            <span className="text-xs uppercase tracking-wider opacity-90">Yes</span>
                            <span>{parseFloat(yesCents) < 1 ? "<1" : yesCents}¢</span>
                        </button>
                        <button
                            onClick={() => setSide('no')}
                            className={cn(
                                "flex-1 py-3 rounded-lg font-semibold transition-all flex flex-col items-center",
                                side === 'no'
                                    ? "bg-rose-500 text-white"
                                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                            )}
                        >
                            <span className="text-xs uppercase tracking-wider opacity-90">No</span>
                            <span>{parseFloat(noCents) < 1 ? "<1" : noCents}¢</span>
                        </button>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Amount ($)</span>
                            {limits && limits.effectiveMax < Infinity ? (
                                <span className="text-xs text-zinc-500">
                                    Max: <span className="font-mono">${limits.effectiveMax.toLocaleString()}</span>
                                    <span className="ml-1 opacity-70">({formatConstraint(limits.bindingConstraint)})</span>
                                </span>
                            ) : (
                                <span className="text-zinc-500">Max</span>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount || ''}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                placeholder="0"
                                className="w-full px-4 py-3 border rounded-lg text-right text-lg font-mono focus:outline-none focus:ring-2 bg-zinc-800 border-zinc-700 text-white focus:border-primary"
                            />
                        </div>

                        <div className="flex justify-center gap-1.5 flex-wrap">
                            {[5, 10, 25, 50, 100].map((amt) => (
                                <button
                                    key={amt}
                                    onClick={() => setAmount(amt)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                        amount === amt
                                            ? "bg-emerald-500 text-white"
                                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                    )}
                                >
                                    ${amt}
                                </button>
                            ))}
                            {limits && (
                                <button
                                    onClick={() => setAmount(Math.floor(limits.effectiveMax))}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                                        amount === Math.floor(limits.effectiveMax)
                                            ? "bg-emerald-500 text-white"
                                            : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400"
                                    )}
                                >
                                    MAX
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Est. Shares</span>
                            <span className="font-mono text-white">{shares > 0 ? shares.toFixed(2) : '0'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Total</span>
                            <span className="font-semibold text-emerald-400">${amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Potential Return</span>
                            <span className="text-emerald-500 font-semibold">${toWin > 0 ? toWin.toFixed(2) : '0.00'}</span>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={amount <= 0 || isLoading || (limits ? amount > limits.effectiveMax : false)}
                        className={cn(
                            "w-full py-4 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2",
                            side === 'yes'
                                ? "bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50"
                                : "bg-rose-500 hover:bg-rose-400 disabled:bg-rose-500/50",
                            (amount <= 0 || isLoading || (limits ? amount > limits.effectiveMax : false)) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Executing...
                            </>
                        ) : limits && amount > limits.effectiveMax ? (
                            `Limit: $${limits.effectiveMax.toLocaleString()} (${formatConstraint(limits.bindingConstraint)})`
                        ) : (
                            `Buy ${side === 'yes' ? 'Yes' : 'No'}`
                        )}
                    </button>
                </>
            )}

            <p className="text-xs text-center text-zinc-500">
                By trading, you agree to the Terms of Use.
            </p>
        </div>
    );
}
