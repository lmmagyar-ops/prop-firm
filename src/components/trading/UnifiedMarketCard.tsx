"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, Users, Bookmark } from "lucide-react";
// Note: Design tokens available for future refactoring: import { colors, components } from "@/lib/design-tokens";
import { getCleanOutcomeName as extractOutcomeLabel } from "@/lib/market-utils";
import type { EventMetadata, SubMarket } from "@/app/actions/market";

// ============================================================================
// TYPES
// ============================================================================

export type MarketType = 'binary' | 'multi' | 'matchup';

export interface UnifiedMarketCardProps {
    event: EventMetadata;
    marketType?: MarketType;  // Auto-detected if not provided
    onTrade: (marketId: string, side: 'yes' | 'no', question?: string) => void;
    onClick?: () => void;
    maxOutcomes?: number;  // For multi-runner: how many to show (default 2)
}

// ============================================================================
// HELPERS
// ============================================================================

function formatVolume(volume: number): string {
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}m`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}k`;
    return `$${volume.toFixed(0)}`;
}

function detectMarketType(event: EventMetadata): MarketType {
    if (event.markets.length === 1) return 'binary';
    if (event.markets.length === 2) return 'matchup';
    return 'multi';
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface OutcomeRowProps {
    market: SubMarket;
    eventTitle: string;
    onTrade: (marketId: string, side: 'yes' | 'no', question?: string) => void;
}

function OutcomeRow({ market, eventTitle, onTrade }: OutcomeRowProps) {
    const percentage = Math.round(market.price * 100);
    const label = extractOutcomeLabel(market.question, eventTitle);

    const getPriceColor = (price: number) => {
        if (price >= 0.7) return "text-emerald-400";
        if (price >= 0.4) return "text-primary";
        return "text-zinc-400";
    };

    return (
        <div className="px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0">
            {/* Outcome Label + Probability */}
            <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                <span className="text-[13px] font-medium text-zinc-300 group-hover:text-primary truncate transition-colors">
                    {label}
                </span>
                <span className={cn("text-[13px] font-bold tabular-nums shrink-0", getPriceColor(market.price))}>
                    {percentage}%
                </span>
            </div>

            {/* Trading Buttons */}
            <div className="flex gap-1.5 shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade(market.id, 'yes', market.question); }}
                    className={cn(
                        "px-3 py-1 text-xs font-bold rounded transition-all",
                        "bg-transparent border border-[#00C896]/40",
                        "text-[#00C896] hover:bg-[#00C896]/10 hover:border-[#00C896]"
                    )}
                >
                    Yes
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade(market.id, 'no', market.question); }}
                    className={cn(
                        "px-3 py-1 text-xs font-bold rounded transition-all",
                        "bg-transparent border border-[#E63E5D]/40",
                        "text-[#E63E5D] hover:bg-[#E63E5D]/10 hover:border-[#E63E5D]"
                    )}
                >
                    No
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// BINARY CARD LAYOUT
// ============================================================================

function BinaryLayout({ event, onTrade }: { event: EventMetadata; onTrade: UnifiedMarketCardProps['onTrade'] }) {
    const market = event.markets[0];
    if (!market) return null;

    const yesPrice = market.price < 0.01 ? 0.5 : market.price;
    const noPrice = 1 - yesPrice;
    const percentage = Math.round(yesPrice * 100);
    const yesCents = (yesPrice * 100).toFixed(1);
    const noCents = (noPrice * 100).toFixed(1);

    return (
        <>
            {/* Header Row */}
            <div className="flex items-start gap-3 mb-4">
                {event.image && (
                    <img src={event.image} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                )}
                <h3 className="flex-1 font-semibold text-white text-sm leading-tight line-clamp-2 min-w-0 pt-1">
                    {event.title}
                </h3>
                <div className={cn(
                    "shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold text-center",
                    percentage >= 50 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                )}>
                    {percentage}%
                    <div className="text-[10px] opacity-70">chance</div>
                </div>
            </div>

            {/* Price Breakdown */}
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-4 px-1">
                <span>Buy Yes <span className="text-[#00C896] font-semibold">{yesCents}¢</span></span>
                <span>Buy No <span className="text-[#E63E5D] font-semibold">{noCents}¢</span></span>
            </div>

            {/* Trading Buttons */}
            <div className="flex gap-3 mb-4">
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade(market.id, 'yes', market.question); }}
                    className="flex-1 py-3 rounded-lg bg-transparent hover:bg-[#00C896]/10 text-[#00C896] font-bold text-sm transition-colors border-2 border-[#00C896]/40 hover:border-[#00C896]"
                >
                    Yes
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onTrade(market.id, 'no', market.question); }}
                    className="flex-1 py-3 rounded-lg bg-transparent hover:bg-[#E63E5D]/10 text-[#E63E5D] font-bold text-sm transition-colors border-2 border-[#E63E5D]/40 hover:border-[#E63E5D]"
                >
                    No
                </button>
            </div>

            <div className="flex-1" />
        </>
    );
}

// ============================================================================
// MULTI-RUNNER CARD LAYOUT
// ============================================================================

function MultiLayout({
    event,
    onTrade,
    maxOutcomes = 2
}: {
    event: EventMetadata;
    onTrade: UnifiedMarketCardProps['onTrade'];
    maxOutcomes?: number;
}) {
    const topOutcomes = event.markets.slice(0, maxOutcomes);

    return (
        <>
            {/* Event Header */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-start gap-3">
                    {event.image && (
                        <img src={event.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">
                            {event.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {formatVolume(event.volume)} Vol.
                            </span>
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {event.markets.length} options
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Outcomes List */}
            <div className="divide-y divide-white/5 flex-1">
                {topOutcomes.map((market) => (
                    <OutcomeRow
                        key={market.id}
                        market={market}
                        eventTitle={event.title}
                        onTrade={onTrade}
                    />
                ))}
            </div>
        </>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * UnifiedMarketCard - Single component for all market card types
 * 
 * Replaces: BinaryEventCard, MultiRunnerCard, MarketCard, EventCard,
 *           HeadToHeadCard, KalshiMatchupCard, KalshiMultiOutcomeCard
 * 
 * @example
 * <UnifiedMarketCard event={event} onTrade={handleTrade} />
 * <UnifiedMarketCard event={event} marketType="multi" maxOutcomes={3} onTrade={handleTrade} />
 */
export function UnifiedMarketCard({
    event,
    marketType,
    onTrade,
    onClick,
    maxOutcomes = 2,
}: UnifiedMarketCardProps) {
    const type = marketType ?? detectMarketType(event);
    const isBinary = type === 'binary';

    return (
        <div
            onClick={onClick}
            className={cn(
                "bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden",
                "hover:border-white/10 transition-all cursor-pointer",
                "min-h-[180px] h-full flex flex-col",
                isBinary && "p-4"
            )}
        >
            {type === 'binary' ? (
                <BinaryLayout event={event} onTrade={onTrade} />
            ) : (
                <MultiLayout event={event} onTrade={onTrade} maxOutcomes={maxOutcomes} />
            )}

            {/* Footer */}
            <div className={cn(
                "flex items-center justify-between text-xs text-zinc-500 mt-auto",
                isBinary ? "pt-0" : "px-4 py-3 border-t border-white/5"
            )}>
                <span>{formatVolume(event.volume)} Vol.</span>
                <Bookmark className="w-4 h-4 hover:text-white transition-colors" />
            </div>
        </div>
    );
}

export default UnifiedMarketCard;
