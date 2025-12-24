"use client";

import { useEffect, useState, useRef } from "react";
import { DollarSign } from "lucide-react";

interface RevenueOdometerProps {
    targetValue: number;
    duration?: number;
}

export function RevenueOdometer({ targetValue, duration = 2000 }: RevenueOdometerProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const animationRef = useRef<number | undefined>(undefined);
    const startTimeRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const animate = (currentTime: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = currentTime;
            }

            const elapsed = currentTime - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.floor(easeOutQuart * targetValue);

            setDisplayValue(currentValue);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [targetValue, duration]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-lg backdrop-blur-sm">
            <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <DollarSign className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
                <div className="text-xs font-medium text-emerald-400/70 uppercase tracking-wider">Total Revenue</div>
                <div className="text-3xl font-bold text-emerald-400 font-mono tracking-tight tabular-nums">
                    {formatCurrency(displayValue)}
                </div>
            </div>
        </div>
    );
}
