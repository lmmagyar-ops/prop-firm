"use client";

import { useState, Component, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X, TrendingUp, Calendar, Loader2 } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTradeExecution } from "@/hooks/useTradeExecution";
import type { EventMetadata, SubMarket } from "@/app/actions/market";
import { getCleanOutcomeName } from "@/lib/market-utils";
import { OrderBook } from "./OrderBook";
import { RulesSummary } from "./RulesSummary";
import { MarketTimeline } from "./MarketTimeline";
import { RecentActivityFeed } from "./RecentActivityFeed";

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
    platform?: "polymarket" | "kalshi";
}

/**
 * EventDetailModal - Full event detail view
 * Supports both Polymarket (Dark) and Kalshi (Light) themes
 */
export function EventDetailModal({ event, open, onClose, onTrade, platform = "polymarket" }: EventDetailModalProps) {
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);

    const isKalshi = platform === "kalshi";
    const bgColor = isKalshi ? "bg-white" : "bg-[#0D1117]";
    const textColor = isKalshi ? "text-slate-900" : "text-white";
    const subTextColor = isKalshi ? "text-slate-500" : "text-zinc-400";
    const borderColor = isKalshi ? "border-slate-200" : "border-white/10";
    const hoverColor = isKalshi ? "hover:bg-slate-50" : "hover:bg-white/5";

    if (!event) return null;

    const selectedMarket = event.markets.find(m => m.id === selectedMarketId) || event.markets[0];

    const formatVolume = (volume: number) => {
        if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
        if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
        return `$${volume.toFixed(0)}`;
    };

    // Helper: Kalshi data is already cleaned during ingestion, Polymarket needs cleaning
    const getDisplayName = (question: string, eventTitle?: string) => {
        return isKalshi ? question : getCleanOutcomeName(question, eventTitle);
    };

    const content = (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Left Side - Event Info & Outcomes */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Event Header (Dense Professional Style) */}
                <div className={cn("px-6 pt-5 pb-4 border-b", borderColor)}>
                    {/* Top Row: Breadcrumbs & Actions */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            {(event.categories && event.categories.length > 0
                                ? event.categories.slice(0, 2)
                                : ['Other']
                            ).map((cat, i) => (
                                <span key={cat}>
                                    {i > 0 && <span className="text-slate-300 mr-2">/</span>}
                                    <span className="hover:text-slate-800 cursor-pointer transition-colors">{cat}</span>
                                </span>
                            ))}
                            <span className="text-slate-300">/</span>
                            <span className={cn("truncate max-w-[200px]", isKalshi ? "text-slate-800" : "text-zinc-200")}>
                                {event.title.split(" ").slice(0, 3).join(" ")}...
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            {isKalshi && (
                                <>
                                    <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all" title="Add to Watchlist">
                                        <TrendingUp className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all" title="Share Market">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </svg>
                                    </button>
                                </>
                            )}
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
                                <span className={cn("flex items-center gap-1.5", isKalshi ? "text-slate-600" : "text-zinc-400")}>
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    {formatVolume(event.volume)} Vol
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {new Date(event.openTime || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                {isKalshi && (
                                    <>
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                            Series-2025
                                        </span>
                                        <span className="text-slate-400">
                                            ID: {event.id.slice(0, 8)}
                                        </span>
                                    </>
                                )}
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
                                    <span className={cn(isKalshi ? "text-slate-600" : "text-zinc-400")}>
                                        {getDisplayName(market.question, event.title)}
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Large Probability Display (Polymarket style) - For binary markets */}
                {!isKalshi && event.markets.length === 1 && (
                    <div className="px-6 py-4 border-b border-white/5">
                        <div className="flex items-baseline gap-3">
                            <span className={cn(
                                "text-3xl font-bold tabular-nums",
                                event.markets[0].price >= 0.5 ? "text-emerald-400" : "text-rose-400"
                            )}>
                                {Math.round(event.markets[0].price * 100)}% chance
                            </span>
                            <span className="text-sm text-zinc-500">
                                {event.markets[0].price >= 0.5 ? "▲" : "▼"} {Math.abs(Math.round((Math.random() * 10) - 5))}%
                            </span>
                        </div>
                    </div>
                )}

                {/* Outcomes List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    {/* Price History Chart — Polymarket only */}
                    {!isKalshi && (
                        <div className="px-6 py-4 border-b border-white/5">
                            <ChartErrorBoundary>
                                <ProbabilityChart
                                    key={selectedMarket.id}
                                    currentPrice={selectedMarket.price}
                                    outcome={selectedMarket.price >= 0.5 ? "YES" : "NO"}
                                />
                            </ChartErrorBoundary>
                        </div>
                    )}

                    <div className={cn(
                        "flex items-center justify-between px-6 py-2 text-[10px] font-bold uppercase tracking-wider border-b shrink-0 sticky top-0 z-20",
                        isKalshi ? "bg-white border-slate-100 text-slate-400" : "bg-[#0D1117] border-white/10 text-zinc-500"
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
                            onTrade={(side) => onTrade(market.id, side, market.question)}
                            isKalshi={isKalshi}
                        />
                    ))}

                    {/* New Kalshi Sections (Rules & Timeline) */}
                    {isKalshi && (
                        <>
                            <RulesSummary
                                rules={event.rules}
                                outcomes={event.markets}
                                eventTitle={event.title}
                                platform={platform}
                            />
                            <MarketTimeline
                                openTime={event.openTime}
                                closeTime={event.closeTime}
                                settlementTime={event.settlementTime}
                            />
                        </>
                    )}

                    {/* Legacy Resolution Rules Section (Polymarket) */}
                    {!isKalshi && event.description && (
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

                    {!isKalshi && <OrderBook tokenId={selectedMarket?.id} />}

                    {/* Live Activity Feed — Polymarket only */}
                    {!isKalshi && (
                        <div className="border-t border-white/5">
                            <RecentActivityFeed />
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Trading Widget */}
            <div className={cn(
                "w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l flex flex-col h-full",
                borderColor,
                isKalshi ? "bg-slate-50" : "bg-zinc-900/50"
            )}>
                {/* Right Panel Header - Matches Left Side */}
                <div className={cn(
                    "flex items-center px-4 py-3 border-b",
                    borderColor,
                    isKalshi ? "bg-white" : "bg-transparent",
                    // Match the height of the left panel header's bottom section or just fixed height
                    "h-[57px]"
                )}>
                    <h3 className={cn("font-bold text-sm", textColor)}>
                        Buy {getDisplayName(selectedMarket.question, event.title)}
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <TradingSidebar
                        market={selectedMarket}
                        eventTitle={event.title}
                        onTradeComplete={onClose}
                        isKalshi={isKalshi}
                    />
                </div>
            </div>
        </div>
    );

    // Desktop Modal
    if (!isMobile) {
        return (
            <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
                <DialogContent className={cn(
                    "!max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden",
                    bgColor,
                    isKalshi ? "border-slate-200" : "border-zinc-800"
                )}>
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
    isKalshi?: boolean;
}

function OutcomeRow({ market, eventTitle, isSelected, onSelect, onTrade, isKalshi }: OutcomeRowProps) {
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
                "px-6 py-3 flex items-center border-b cursor-pointer transition-all group", // Reduced py-4 to py-3
                isKalshi ? "border-slate-100" : "border-white/5",
                // Selection state
                isSelected
                    ? (isKalshi ? "bg-blue-50/40" : "bg-blue-500/10")
                    : (isKalshi ? "hover:bg-slate-50" : "hover:bg-white/5")
            )}
            onClick={onSelect}
        >
            {/* Outcome Name + Volume */}
            < div className="flex-1 min-w-0 pr-4" >
                <div className={cn(
                    "text-[15px] transition-colors flex flex-col justify-center", // Flex col for hierarchy
                    isKalshi
                        ? (isSelected ? "text-[#00C896] font-bold" : "text-slate-900 font-semibold group-hover:text-[#00C896]")
                        : "text-white group-hover:text-blue-400"
                )}>
                    {isKalshi ? market.question : getCleanOutcomeName(market.question, eventTitle)}

                    {/* Optional Subtitle / Volume context */}
                    {isKalshi && (
                        <span className={cn(
                            "text-[11px] font-normal mt-0.5",
                            isSelected ? "text-blue-400" : "text-slate-400"
                        )}>
                            {formatVolume(market.volume)} Vol. • Series-2025
                        </span>
                    )}
                </div>
                {
                    !isKalshi && (
                        <div className="text-xs text-zinc-500 mt-0.5">
                            {formatVolume(market.volume)} Vol.
                        </div>
                    )
                }
            </div >

            {/* Percentage */}
            < div className="w-20 text-right mr-6 flex flex-col items-end justify-center" >
                <span className={cn(
                    "text-lg font-bold tabular-nums leading-none",
                    percentage >= 50
                        ? (isKalshi ? "text-[#00C896]" : "text-emerald-400")
                        : (isKalshi ? "text-slate-400" : "text-zinc-400")
                )}>
                    {percentage}%
                </span>
                {/* Change indicator - more integrated */}
                {
                    isKalshi && (
                        <span className={cn(
                            "text-[10px] font-medium mt-1 flex items-center tabular-nums",
                            isKalshi ? (Math.random() > 0.5 ? "text-emerald-500" : "text-rose-500") : ""
                        )}>
                            {Math.random() > 0.5 ? '▲ 1%' : '▼ 1%'}
                        </span>
                    )
                }
            </div >

            {/* Trading Buttons */}
            < div className={
                cn(
                    "flex rounded-lg p-1 gap-1",
                    isKalshi ? "bg-transparent" : "bg-zinc-800/50"
                )
            } >
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade('yes'); }}
                    className={cn(
                        "relative w-24 h-10 flex items-center justify-between px-3 rounded-md transition-all group/btn",
                        // Kalshi style: Filled if selected, Outline if not
                        isKalshi
                            ? (isSelected
                                ? "bg-[#00C896] hover:bg-[#00B88A] text-white shadow-sm ring-1 ring-[#00C896]"
                                : "bg-white border border-slate-200 text-[#00C896] hover:border-[#00C896] hover:bg-emerald-50/50 shadow-sm")
                            : "bg-[#00C896] hover:bg-[#00B88A] active:scale-[0.98]"
                    )}
                >
                    <span className={cn(
                        "text-xs font-bold uppercase tracking-wide",
                        // Kalshi text color handling
                        isKalshi
                            ? (isSelected ? "text-white" : "text-[#00C896]")
                            : "text-[#052e1f]"
                    )}>Yes</span>
                    <span className={cn("text-base font-bold", isKalshi ? (isSelected ? "text-white" : "text-[#00C896]") : "text-[#052e1f]")}>
                        {yesPrice < 1 ? "<1" : yesPrice}¢
                    </span>
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onTrade('no'); }}
                    className={cn(
                        "relative w-24 h-10 flex items-center justify-between px-3 rounded-md transition-all group/btn",
                        isKalshi
                            ? (isSelected
                                ? "bg-[#FFF1F2] border border-[#E63E5D]/20 text-[#E63E5D] shadow-sm ring-1 ring-[#E63E5D]/30"
                                : "bg-white border border-slate-200 text-[#E63E5D] hover:bg-[#FFF1F2] hover:border-[#E63E5D]/30 shadow-sm")
                            : "bg-[#E63E5D] hover:bg-[#D43552] active:scale-[0.98]"
                    )}
                >
                    <span className={cn(
                        "text-xs font-bold uppercase tracking-wide",
                        isKalshi
                            ? "text-[#E63E5D]"
                            : "text-[#380e14]")}>No</span>
                    <span className={cn("text-base font-bold", isKalshi ? "text-[#E63E5D]" : "text-[#380e14]")}>
                        {noPrice < 1 ? "<1" : noPrice}¢
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
    isKalshi?: boolean;
}

function TradingSidebar({ market, eventTitle, onTradeComplete, isKalshi }: TradingSidebarProps) {
    const [side, setSide] = useState<'yes' | 'no'>('yes');
    const [amount, setAmount] = useState(0); // Dollar amount

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
                <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    isKalshi ? "bg-slate-100" : "bg-blue-500/20"
                )}>
                    <TrendingUp className={cn("w-5 h-5", isKalshi ? "text-slate-500" : "text-blue-400")} />
                </div>
                <div>
                    <div className={cn("text-sm font-semibold line-clamp-2", isKalshi ? "text-slate-900" : "text-white")}>
                        {isKalshi ? market.question : getCleanOutcomeName(market.question, eventTitle || "")}
                    </div>
                </div>
            </div>

            {/* Buy/Sell Tabs (Kalshi specific) */}
            {isKalshi && (
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                    <button className="flex-1 py-1.5 text-sm font-semibold rounded-md bg-white text-slate-900 shadow-sm">
                        Buy
                    </button>
                    <button className="flex-1 py-1.5 text-sm font-semibold rounded-md text-slate-500 hover:text-slate-700">
                        Sell
                    </button>
                </div>
            )}

            {/* Currency Selector (Kalshi style Mock) */}
            {isKalshi && (
                <div className="flex justify-end">
                    <button className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                        Dollars <span className="text-slate-400">∨</span>
                    </button>
                </div>
            )}

            {/* Yes/No Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setSide('yes')}
                    className={cn(
                        "flex-1 py-3 rounded-lg font-semibold transition-all flex flex-col items-center",
                        side === 'yes'
                            ? (isKalshi ? "bg-[#00C896] text-white shadow-md" : "bg-emerald-500 text-white")
                            : (isKalshi ? "bg-white border border-slate-200 text-slate-500 hover:border-[#00C896]/50" : "bg-zinc-800 text-zinc-400 hover:text-white")
                    )}
                >
                    <span className="text-xs uppercase tracking-wider opacity-90">Yes</span>
                    <span>{yesPrice < 1 ? "<1" : yesPrice}¢</span>
                </button>
                <button
                    onClick={() => setSide('no')}
                    className={cn(
                        "flex-1 py-3 rounded-lg font-semibold transition-all flex flex-col items-center",
                        side === 'no'
                            ? (isKalshi ? "bg-[#E63E5D] text-white shadow-md" : "bg-rose-500 text-white")
                            : (isKalshi ? "bg-white border border-slate-200 text-slate-500 hover:border-[#E63E5D]/50" : "bg-zinc-800 text-zinc-400 hover:text-white")
                    )}
                >
                    <span className="text-xs uppercase tracking-wider opacity-90">No</span>
                    <span>{noPrice < 1 ? "<1" : noPrice}¢</span>
                </button>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className={cn(isKalshi ? "text-slate-500" : "text-zinc-400")}>Amount ($)</span>
                    <span className={cn(isKalshi ? "text-slate-400" : "text-zinc-500")}>Max</span>
                </div>
                <div className="relative">
                    <input
                        type="number"
                        value={amount || ''}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder="0"
                        className={cn(
                            "w-full px-4 py-3 border rounded-lg text-right text-lg font-mono focus:outline-none focus:ring-2",
                            isKalshi
                                ? "bg-white border-slate-200 text-slate-900 focus:ring-[#00C896]/20 focus:border-[#00C896]"
                                : "bg-zinc-800 border-zinc-700 text-white focus:border-blue-500"
                        )}
                    />
                    {isKalshi && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>}
                </div>

                {isKalshi && (
                    <div className="text-right text-xs text-[#00C896] font-medium">
                        Earn 3.25% Interest
                    </div>
                )}

                <div className="flex justify-center gap-1.5 flex-wrap">
                    {[-100, -10, 10, 100, 200].map((amt) => (
                        <button
                            key={amt}
                            onClick={() => setAmount(Math.max(0, amount + amt))}
                            className={cn(
                                "px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors",
                                isKalshi
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                                    : (amt < 0 ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-400" : "bg-zinc-700 hover:bg-zinc-600 text-white")
                            )}
                        >
                            {amt > 0 ? `+${amt}` : amt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className={cn("space-y-2 text-sm", isKalshi ? "pt-4 border-t border-slate-100" : "")}>
                <div className="flex justify-between">
                    <span className={cn(isKalshi ? "text-slate-500" : "text-zinc-400")}>Shares</span>
                    <span className={cn("font-mono", isKalshi ? "text-slate-900" : "text-white")}>{shares > 0 ? shares.toFixed(2) : '0'}</span>
                </div>
                <div className="flex justify-between">
                    <span className={cn(isKalshi ? "text-slate-500" : "text-zinc-400")}>Total</span>
                    <span className={cn("font-semibold", isKalshi ? "text-slate-900" : "text-emerald-400")}>${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className={cn(isKalshi ? "text-slate-500" : "text-zinc-400")}>To Win 🌿</span>
                    <span className="text-emerald-500 font-semibold">${toWin > 0 ? toWin.toFixed(2) : '0.00'}</span>
                </div>
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={amount <= 0 || isLoading}
                className={cn(
                    "w-full py-4 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2",
                    side === 'yes'
                        ? (isKalshi ? "bg-[#00C896] hover:bg-[#00B88A]" : "bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50")
                        : (isKalshi ? "bg-[#E63E5D] hover:bg-[#D43552]" : "bg-rose-500 hover:bg-rose-400 disabled:bg-rose-500/50"),
                    (amount <= 0 || isLoading) && "opacity-50 cursor-not-allowed",
                    isKalshi && (side === 'yes' ? "shadow-lg shadow-blue-500/10" : "shadow-lg shadow-pink-500/10")
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

            <p className={cn("text-xs text-center", isKalshi ? "text-slate-400" : "text-zinc-500")}>
                By trading, you agree to the Terms of Use.
            </p>
        </div>
    );
}
