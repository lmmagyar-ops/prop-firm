"use client";

import { cn } from "@/lib/utils";
import { Check, TrendingUp, TrendingDown } from "lucide-react";

export interface Outcome {
    id: string;
    name: string;
    price: number; // 0.00 - 1.00
    change: number; // Percent change
    color: string; // Hex or tailwind class prefix
    image?: string; // Emoji or URL
}

interface OutcomeSelectorProps {
    outcomes: Outcome[];
    selectedId: string;
    onSelect: (id: string) => void;
}

export function OutcomeSelector({ outcomes, selectedId, onSelect }: OutcomeSelectorProps) {
    return (
        <div className="w-full overflow-x-auto no-scrollbar border-b border-white/5 bg-[#1a1d24]">
            <div className="flex items-center gap-2 p-2">
                {outcomes.map((outcome) => {
                    const isSelected = selectedId === outcome.id;
                    const isUp = outcome.change >= 0;

                    return (
                        <button
                            key={outcome.id}
                            onClick={() => onSelect(outcome.id)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-200 min-w-[200px] group",
                                isSelected
                                    ? "bg-white/5 border-white/10 shadow-lg"
                                    : "bg-transparent border-transparent hover:bg-white/5"
                            )}
                        >
                            {/* Avatar / Image */}
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-inner",
                                isSelected ? "ring-2 ring-white/20" : "opacity-80 grayscale group-hover:grayscale-0"
                            )}
                                style={{ backgroundColor: `${outcome.color}20` }}
                            >
                                {outcome.image || "🔮"}
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-left">
                                <div className="flex items-center justify-between">
                                    <span className={cn(
                                        "text-xs font-bold uppercase tracking-wider",
                                        isSelected ? "text-white" : "text-zinc-500"
                                    )}>
                                        {outcome.name}
                                    </span>
                                    {isSelected && <Check className="w-3 h-3 text-green-500" />}
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                    <span className={cn(
                                        "text-lg font-black font-mono tracking-tighter",
                                        isSelected ? "text-white" : "text-zinc-400"
                                    )}>
                                        {(outcome.price * 100).toFixed(1)}¢
                                    </span>
                                    <span className={cn(
                                        "text-[10px] font-bold flex items-center gap-0.5",
                                        isUp ? "text-green-500" : "text-red-500"
                                    )}>
                                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {Math.abs(outcome.change)}%
                                    </span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
