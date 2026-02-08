"use client";

import React, { useRef, useCallback, useEffect, useState } from 'react';

interface ClickSparkProps {
    children: React.ReactNode;
    sparkColor?: string;
    sparkSize?: number;
    sparkRadius?: number;
    sparkCount?: number;
    duration?: number;
}

interface Spark {
    id: number;
    x: number;
    y: number;
}

export default function ClickSpark({
    children,
    sparkColor = '#00FFB2',
    sparkSize = 10,
    sparkRadius = 35,
    sparkCount = 8,
    duration = 660,
}: ClickSparkProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [sparks, setSparks] = useState<Spark[]>([]);
    const idRef = useRef(0);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const id = idRef.current++;
            setSparks(prev => [...prev, { id, x, y }]);

            setTimeout(() => {
                setSparks(prev => prev.filter(s => s.id !== id));
            }, duration);
        },
        [duration]
    );

    return (
        <div ref={containerRef} onClick={handleClick} style={{ position: 'relative' }}>
            {children}
            {sparks.map(spark => (
                <SparkBurst
                    key={spark.id}
                    x={spark.x}
                    y={spark.y}
                    sparkColor={sparkColor}
                    sparkSize={sparkSize}
                    sparkRadius={sparkRadius}
                    sparkCount={sparkCount}
                    duration={duration}
                />
            ))}
        </div>
    );
}

function SparkBurst({
    x,
    y,
    sparkColor,
    sparkSize,
    sparkRadius,
    sparkCount,
    duration,
}: {
    x: number;
    y: number;
    sparkColor: string;
    sparkSize: number;
    sparkRadius: number;
    sparkCount: number;
    duration: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const canvasSize = sparkRadius * 2 + sparkSize * 2;
        canvas.width = canvasSize * dpr;
        canvas.height = canvasSize * dpr;
        canvas.style.width = `${canvasSize}px`;
        canvas.style.height = `${canvasSize}px`;
        ctx.scale(dpr, dpr);

        const center = canvasSize / 2;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            ctx.clearRect(0, 0, canvasSize, canvasSize);

            for (let i = 0; i < sparkCount; i++) {
                const angle = (i / sparkCount) * Math.PI * 2;
                const dist = progress * sparkRadius;
                const sx = center + Math.cos(angle) * dist;
                const sy = center + Math.sin(angle) * dist;
                const size = sparkSize * (1 - progress);
                const alpha = 1 - progress;

                ctx.beginPath();
                ctx.arc(sx, sy, Math.max(0, size / 2), 0, Math.PI * 2);
                ctx.fillStyle = sparkColor;
                ctx.globalAlpha = alpha;
                ctx.fill();
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration]);

    const canvasSize = sparkRadius * 2 + sparkSize * 2;

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                left: x - canvasSize / 2,
                top: y - canvasSize / 2,
                pointerEvents: 'none',
                zIndex: 9999,
            }}
        />
    );
}
