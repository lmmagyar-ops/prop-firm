"use client";

import { cn } from "@/lib/utils";

interface BigNumberDisplayProps {
    value: number;
    className?: string;
    prefix?: string;
}

export function BigNumberDisplay({ value, prefix = "$", className }: BigNumberDisplayProps) {
    // Stable formatting without layout shift
    const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);

    // formatted is "10,000.00"
    const parts = formatted.split(".");
    const integer = parts[0];
    const decimal = parts[1];

    return (
        <div className={cn("inline-flex items-baseline font-mono tracking-tighter tabular-nums", className)}>
            <span className="opacity-50 mr-1">{prefix}</span>
            <span>{integer}</span>
            <span className="text-[0.6em] opacity-60 ml-0.5">.{decimal}</span>
        </div>
    );
}
