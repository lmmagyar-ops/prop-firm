"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { SubMarket } from "@/app/actions/market";
import { getCleanOutcomeName } from "@/lib/market-utils";

interface RulesSummaryProps {
    rules?: string;
    outcomes: SubMarket[];
    eventTitle: string;
}

export function RulesSummary({ rules, outcomes, eventTitle }: RulesSummaryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOutcomeId, setSelectedOutcomeId] = useState(outcomes[0]?.id);

    const selectedOutcome = outcomes.find(o => o.id === selectedOutcomeId) || outcomes[0];

    return (
        <div className="border-t border-slate-100 bg-white">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <span>Rules summary</span>
                    <Info className="w-4 h-4 text-slate-400" />
                </div>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>

            {isOpen && (
                <div className="px-6 pb-6 space-y-4">
                    {/* Outcome Selector */}
                    <div className="relative">
                        <select
                            value={selectedOutcomeId}
                            onChange={(e) => setSelectedOutcomeId(e.target.value)}
                            className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                        >
                            {outcomes.map(outcome => (
                                <option key={outcome.id} value={outcome.id}>
                                    {getCleanOutcomeName(outcome.question, eventTitle)}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Rules Text */}
                    <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
                        <p className="whitespace-pre-wrap">{rules || "Market resolution is based on official data source."}</p>

                        <p className="mt-4 text-xs text-slate-400 italic">
                            Note: this event is directional.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            View full rules
                        </button>
                        <button className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            Help center
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
