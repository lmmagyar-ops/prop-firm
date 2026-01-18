"use client";

import { BigNumberDisplay } from "@/components/BigNumberDisplay";

interface EquityDisplayProps {
    currentBalance: number;
    dailyPnL: number;
}

export function EquityDisplay({ currentBalance, dailyPnL }: EquityDisplayProps) {
    return (
        <div className="text-center p-8 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 rounded-2xl border border-white/5 h-full flex flex-col justify-center items-center">
            <div className="text-sm text-zinc-400 mb-2 uppercase tracking-wider font-bold">Current Equity</div>
            <BigNumberDisplay value={currentBalance} suffix="USD" className="text-5xl md:text-6xl font-black text-white" />
            <div className={`text-lg font-mono mt-4 font-bold ${dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {dailyPnL >= 0 ? '+' : ''}${dailyPnL.toFixed(2)} Today
            </div>
        </div>
    );
}
