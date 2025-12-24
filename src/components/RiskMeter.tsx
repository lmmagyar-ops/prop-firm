"use client";

import { cn } from "@/lib/utils";

interface RiskMeterProps {
    currentDrawdown: number; // e.g. 0.02 (2%)
    maxDrawdown: number; // e.g. 0.06 (6%)
    className?: string;
}

export function RiskMeter({ currentDrawdown, maxDrawdown, className }: RiskMeterProps) {
    const percentage = Math.min((currentDrawdown / maxDrawdown) * 100, 100);

    // Color Logic
    let colorClass = "bg-green-500";
    if (percentage > 50) colorClass = "bg-yellow-500";
    if (percentage > 80) colorClass = "bg-red-500";

    return (
        <div className={cn("w-full space-y-2", className)}>
            <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-widest">
                <span>Drawdown Used</span>
                <span>{(currentDrawdown * 100).toFixed(2)}% / {(maxDrawdown * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-500 ease-out", colorClass)}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
