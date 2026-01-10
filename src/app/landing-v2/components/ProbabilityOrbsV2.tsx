"use client";

import { useEffect, useState } from "react";

interface Orb {
    id: number;
    probability: number;
    x: number;
    delay: number;
    duration: number;
    size: number;
}

// Propshot violet color palette
const ORB_STYLES = {
    background: "rgba(124, 58, 237, 0.08)",
    border: "rgba(124, 58, 237, 0.25)",
    glow: "rgba(124, 58, 237, 0.15)",
    text: "#7C3AED",
};

export function ProbabilityOrbsV2() {
    const [orbs, setOrbs] = useState<Orb[]>([]);

    useEffect(() => {
        // Generate initial orbs
        const initialOrbs: Orb[] = Array.from({ length: 12 }, (_, i) => ({
            id: i,
            probability: Math.floor(Math.random() * 60) + 30, // 30-90%
            x: Math.random() * 80 + 10, // 10-90% from left
            delay: Math.random() * 10, // 0-10s delay
            duration: Math.random() * 8 + 12, // 12-20s duration
            size: Math.random() * 30 + 40, // 40-70px
        }));
        setOrbs(initialOrbs);
    }, []);

    return (
        <div className="v2-orbs-container">
            {orbs.map((orb) => (
                <div
                    key={orb.id}
                    className="v2-orb"
                    style={{
                        left: `${orb.x}%`,
                        animationDelay: `${orb.delay}s`,
                        animationDuration: `${orb.duration}s`,
                        width: `${orb.size}px`,
                        height: `${orb.size}px`,
                        background: ORB_STYLES.background,
                        border: `1px solid ${ORB_STYLES.border}`,
                        boxShadow: `0 0 40px ${ORB_STYLES.glow}`,
                    }}
                >
                    <span style={{ color: ORB_STYLES.text }}>
                        {orb.probability}%
                    </span>
                </div>
            ))}
        </div>
    );
}
