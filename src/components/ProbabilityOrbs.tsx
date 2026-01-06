"use client";

import { useEffect, useState } from "react";

interface Orb {
    id: number;
    probability: number;
    x: number;
    delay: number;
    duration: number;
    size: number;
    color: string;
}

const COLORS = [
    "rgba(79, 209, 197, 0.15)", // mint
    "rgba(99, 102, 241, 0.12)", // indigo
    "rgba(139, 92, 246, 0.12)", // purple
    "rgba(59, 130, 246, 0.12)", // blue
];

const BORDER_COLORS = [
    "rgba(79, 209, 197, 0.4)", // mint
    "rgba(99, 102, 241, 0.3)", // indigo
    "rgba(139, 92, 246, 0.3)", // purple
    "rgba(59, 130, 246, 0.3)", // blue
];

const TEXT_COLORS = [
    "#4FD1C5", // mint
    "#818CF8", // indigo
    "#A78BFA", // purple
    "#60A5FA", // blue
];

export function ProbabilityOrbs() {
    const [orbs, setOrbs] = useState<Orb[]>([]);

    useEffect(() => {
        // Generate initial orbs
        const initialOrbs: Orb[] = Array.from({ length: 8 }, (_, i) => ({
            id: i,
            probability: Math.floor(Math.random() * 60) + 30, // 30-90%
            x: Math.random() * 80 + 10, // 10-90% from left
            delay: Math.random() * 8, // 0-8s delay
            duration: Math.random() * 6 + 10, // 10-16s duration
            size: Math.random() * 40 + 50, // 50-90px
            color: Math.floor(Math.random() * COLORS.length),
        }));
        setOrbs(initialOrbs);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {orbs.map((orb) => (
                <div
                    key={orb.id}
                    className="absolute animate-float-up"
                    style={{
                        left: `${orb.x}%`,
                        bottom: "-100px",
                        animationDelay: `${orb.delay}s`,
                        animationDuration: `${orb.duration}s`,
                    }}
                >
                    <div
                        className="rounded-full flex items-center justify-center backdrop-blur-sm"
                        style={{
                            width: `${orb.size}px`,
                            height: `${orb.size}px`,
                            background: COLORS[orb.color],
                            border: `1px solid ${BORDER_COLORS[orb.color]}`,
                            boxShadow: `0 0 30px ${COLORS[orb.color]}`,
                        }}
                    >
                        <span
                            className="font-mono font-bold text-sm"
                            style={{ color: TEXT_COLORS[orb.color] }}
                        >
                            {orb.probability}%
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
