"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MarketTimelineProps {
    openTime?: string;
    closeTime?: string;
    settlementTime?: string;
}

export function MarketTimeline({ openTime, closeTime, settlementTime }: MarketTimelineProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Default dates if missing (should be provided by ingestion)
    const now = new Date();
    const openDate = openTime ? new Date(openTime) : new Date(now.getTime() - 86400000); // Yesterday
    const closeDate = closeTime ? new Date(closeTime) : new Date(now.getTime() + 86400000 * 30); // 30 days
    const settleDate = settlementTime ? new Date(settlementTime) : new Date(now.getTime() + 86400000 * 31);

    const isClosed = now > closeDate;
    const isSettled = now > settleDate;

    return (
        <div className="border-t border-slate-100 bg-white">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <span>Timeline and payout</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>

            {isOpen && (
                <div className="px-6 pb-6">
                    <div className="relative pl-2 ml-2 border-l border-slate-200 space-y-8 py-2">
                        {/* Market Open */}
                        <div className="relative">
                            <div className="absolute -left-[13px] top-1 bg-white">
                                <Check className="w-5 h-5 text-slate-900" />
                            </div>
                            <div className="pl-4">
                                <div className="text-sm font-semibold text-slate-900">Market open</div>
                                <div className="text-sm text-slate-500 mt-0.5">
                                    {format(openDate, "MMM d, yyyy · h:mma")} EST
                                </div>
                            </div>
                        </div>

                        {/* Market Close */}
                        <div className="relative">
                            <div className="absolute -left-[13px] top-1 bg-white">
                                {isClosed ? (
                                    <Check className="w-5 h-5 text-slate-900" />
                                ) : (
                                    <Circle className="w-5 h-5 text-slate-300 fill-white" />
                                )}
                            </div>
                            <div className="pl-4">
                                <div className="text-sm font-semibold text-slate-900">Market closes</div>
                                <div className="text-sm text-slate-500 mt-0.5">
                                    {format(closeDate, "MMM d, yyyy · h:mma")} EST
                                </div>
                            </div>
                        </div>

                        {/* Projected Payout */}
                        <div className="relative">
                            <div className="absolute -left-[13px] top-1 bg-white">
                                {isSettled ? (
                                    <Check className="w-5 h-5 text-slate-900" />
                                ) : (
                                    <Circle className="w-5 h-5 text-slate-300 fill-white" />
                                )}
                            </div>
                            <div className="pl-4">
                                <div className="text-sm font-semibold text-slate-900">Projected payout</div>
                                <div className="text-sm text-slate-500 mt-0.5">
                                    {format(settleDate, "MMM d, yyyy · h:mma")} EST
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
