"use client";

import { cn } from "@/lib/utils";

interface ProbabilityMeterProps {
    percentage: number;
    color: string; // e.g. "#10B981"
    size?: number;
}

export function ProbabilityMeter({ percentage, color, size = 64 }: ProbabilityMeterProps) {
    // Gauge Configuration
    const radius = 24;
    const strokeWidth = 4;
    const center = 30;

    // We want a 230-degree gauge (leaving 130 degrees open at the bottom)
    // This creates the "speedometer" look from the screenshot
    const gaugeAngle = 230;
    const totalCircumference = 2 * Math.PI * radius;
    const gaugeCircumference = (gaugeAngle / 360) * totalCircumference;

    // Calculate the stroke dashoffset for the value
    // valuePercent is how much of the *visible gauge* is filled
    const valueLength = (percentage / 100) * gaugeCircumference;

    // We need to rotate the SVG so the opening is at the bottom
    // Default circle starts at 3 o'clock. We want the gap centered at 6 o'clock.
    // Gap center is at 3 o'clock + (360 - gaugeAngle)/2 ? No.
    // Let's just create a rotation that places the start/end correctly.
    // Start of the gauge should be: 90 + (360 - gaugeAngle)/2 degrees
    const rotation = 90 + (360 - gaugeAngle) / 2;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* SVG Ring */}
            <svg
                width={size}
                height={size}
                viewBox="0 0 60 60"
                className="pointer-events-none"
                style={{ transform: `rotate(${rotation}deg)` }}
            >
                {/* Track (Background) */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#334155" // Slate-700
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${gaugeCircumference} ${totalCircumference}`}
                    strokeDashoffset={0}
                />

                {/* Indicator (Value) */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeOpacity={percentage > 0 ? 1 : 0} // Hide if 0 to avoid dot artifact if using round caps
                    strokeLinecap="round"
                    strokeDasharray={`${valueLength} ${totalCircumference}`} // Only show value length
                    strokeDashoffset={0}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 leading-none">
                <span className="text-sm font-bold text-white font-mono tracking-tight">{percentage.toFixed(0)}%</span>
                <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-tighter mt-[1px]">chance</span>
            </div>
        </div>
    );
}
