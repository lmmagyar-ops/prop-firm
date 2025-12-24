"use client";

import { cn } from "@/lib/utils";

interface OutcomeRowProps {
    yesPrice: number;
    noPrice: number;
    onSelect?: (outcome: "YES" | "NO") => void;
    selected?: "YES" | "NO";
}

export function OutcomeRow({ yesPrice, noPrice, onSelect, selected }: OutcomeRowProps) {
    return (
        <div className="flex gap-4 mt-auto pt-6">
            <OutcomeCard
                type="YES"
                price={yesPrice}
                percent="+2.4%"
                selected={selected === 'YES'}
                onClick={() => onSelect?.('YES')}
            />
            <OutcomeCard
                type="NO"
                price={noPrice}
                percent="-1.2%"
                selected={selected === 'NO'}
                onClick={() => onSelect?.('NO')}
            />
        </div>
    );
}

function OutcomeCard({
    type,
    price,
    percent,
    selected,
    onClick
}: {
    type: "YES" | "NO",
    price: number,
    percent: string,
    selected?: boolean,
    onClick?: () => void
}) {
    const isYes = type === "YES";
    const colorClass = isYes ? "text-green-500" : "text-red-500";
    const bgClass = isYes ? "bg-green-500" : "bg-red-500";

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-200 group text-left relative overflow-hidden",
                selected
                    ? (isYes ? "border-green-500/50 bg-green-500/10 shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]" : "border-red-500/50 bg-red-500/10 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]")
                    : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700"
            )}
        >
            {/* Progress Bar Background */}
            <div
                className={cn("absolute bottom-0 left-0 h-1 transition-all duration-500 opacity-50 group-hover:opacity-100", bgClass)}
                style={{ width: `${price * 100}%` }}
            />

            <div>
                <div className={cn("text-xs font-bold tracking-wider mb-0.5", colorClass)}>
                    {type}
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                    {(price * 100).toFixed(1)}¢
                </div>
            </div>

            <div className="text-right">
                <div className={cn("text-sm font-medium", percent.startsWith('+') ? "text-green-400" : "text-red-400")}>
                    {percent}
                </div>
                <div className="text-xs text-zinc-500 font-mono mt-1">
                    Vol $2.1M
                </div>
            </div>
        </button>
    );
}
