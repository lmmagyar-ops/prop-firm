"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, RefreshCw, Bookmark } from "lucide-react";
import type { MockMarket } from "@/lib/mock-markets";
import { ProbabilityMeter } from "./ProbabilityMeter";

interface MarketCardProps {
    market: MockMarket;
    onClick: () => void;
}

export function MarketCard({ market, onClick }: MarketCardProps) {
    // Percentage calc
    const yesPriceCents = (market.currentPrice * 100);
    const noPriceCents = ((1 - market.currentPrice) * 100);
    const yesPercent = Math.round(yesPriceCents);

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative cursor-pointer overflow-hidden rounded-xl transition-all duration-200",
                "bg-[#242E42] hover:bg-[#2C3647]", // Reverted to verified Slate Panel Background
                "border border-[#2E3A52] hover:border-[#3E4C63]",
                "shadow-sm hover:shadow-md h-full flex flex-col"
            )}
        >
            <div className="p-4 flex flex-col h-full">

                {/* 1. Header Row */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4 pr-2">
                        {/* Icon/Image */}
                        <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-muted">
                            {market.imageUrl ? (
                                <img src={market.imageUrl} alt={market.question} className="w-full h-full object-cover" />
                            ) : (
                                <span className="flex items-center justify-center w-full h-full text-2xl bg-[#1A232E]">{market.icon}</span>
                            )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-white leading-snug line-clamp-3">
                            {market.question}
                        </h3>
                    </div>

                    {/* Meter */}
                    <div className="shrink-0 -mt-2 -mr-1">
                        <ProbabilityMeter
                            percentage={yesPercent}
                            color={yesPercent > 50 ? "#10B981" : "#E4003A"}
                            size={60}
                        />
                    </div>
                </div>

                {/* 2. Action Buttons (Big Blocks) */}
                <div className="grid grid-cols-2 gap-3 mb-4 mt-auto">
                    {/* YES Button */}
                    <button className="h-10 rounded-lg bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/20 transition-all flex items-center justify-center group/yes">
                        <span className="text-sm font-bold text-[#10B981] group-hover/yes:text-white transition-colors">Yes</span>
                    </button>

                    {/* NO Button */}
                    <button className="h-10 rounded-lg bg-[#E4003A]/10 hover:bg-[#E4003A]/20 border border-[#E4003A]/20 transition-all flex items-center justify-center group/no">
                        <span className="text-sm font-bold text-[#E4003A] group-hover/no:text-white transition-colors">No</span>
                    </button>
                </div>

                {/* 3. Footer */}
                <div className="flex items-center justify-between text-xs text-[#94A3B8] font-medium pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <span>${(market.volume / 1000000).toFixed(1)}m Vol.</span>
                        <div className="flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            <span>Annual</span>
                        </div>
                    </div>
                    <div>
                        <Bookmark className="w-4 h-4 hover:text-white transition-colors" />
                    </div>
                </div>
            </div>
        </div>
    );
}
