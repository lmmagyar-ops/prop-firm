"use client";

import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { Clock, Users, BarChart3 } from "lucide-react";

interface MarketHeaderProps {
    question: string;
    volume: number;
    activeTraders: number;
    endDate?: string; // Optional for now
}

export function MarketHeader({ question, volume, activeTraders, endDate = "Jan 20, 2025" }: MarketHeaderProps) {
    return (
        <div className="flex flex-col gap-1 mb-8">
            {/* Breadcrumb / Category (Static for now) */}
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                <span>Election</span>
                <span className="text-zinc-700">/</span>
                <span className="text-zinc-400">USA 2024</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight">
                {question}
            </h1>

            <div className="flex items-center gap-6 mt-4 text-xs font-mono text-zinc-500 tracking-wide uppercase">
                <div className="flex items-center gap-2">
                    <span className="text-zinc-600">Volume</span>
                    <span className="text-zinc-300 border-b border-zinc-800 pb-0.5">${(volume / 1000000).toFixed(1)}M</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-zinc-600">Ends</span>
                    <span className="text-zinc-300 border-b border-zinc-800 pb-0.5">{endDate}</span>
                </div>
            </div>
        </div>
    );
}
