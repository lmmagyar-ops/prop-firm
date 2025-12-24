"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface TradeLocation {
    lat: number;
    lng: number;
    city: string;
    amount: number;
}

export function GeoSpatialMap() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [trades, setTrades] = useState<TradeLocation[]>([
        { lat: 40.7128, lng: -74.0060, city: "New York", amount: 5000 },
        { lat: 51.5074, lng: -0.1278, city: "London", amount: 3200 },
        { lat: 35.6762, lng: 139.6503, city: "Tokyo", amount: 4100 },
        { lat: -33.8688, lng: 151.2093, city: "Sydney", amount: 2800 },
        { lat: 1.3521, lng: 103.8198, city: "Singapore", amount: 3900 },
    ]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size
        const updateSize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        updateSize();

        let rotation = 0;
        const animate = () => {
            if (!ctx || !canvas) return;

            const width = canvas.width / window.devicePixelRatio;
            const height = canvas.height / window.devicePixelRatio;

            // Clear canvas
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, width, height);

            // Draw globe outline
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) * 0.35;

            // Globe background
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, "rgba(59, 130, 246, 0.1)");
            gradient.addColorStop(1, "rgba(59, 130, 246, 0.02)");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Globe border
            ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw latitude lines
            ctx.strokeStyle = "rgba(59, 130, 246, 0.15)";
            ctx.lineWidth = 1;
            for (let i = -60; i <= 60; i += 30) {
                const y = centerY + (i / 90) * radius * 0.8;
                const width = Math.sqrt(radius * radius - Math.pow((i / 90) * radius * 0.8, 2)) * 2;
                ctx.beginPath();
                ctx.ellipse(centerX, y, width / 2, radius * 0.1, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw longitude lines
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2 + rotation;
                ctx.beginPath();
                ctx.ellipse(centerX, centerY, radius * Math.abs(Math.cos(angle)), radius, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw trade markers
            trades.forEach((trade) => {
                // Convert lat/lng to x/y (simplified projection)
                const adjustedLng = trade.lng + (rotation * 180 / Math.PI);
                const x = centerX + (adjustedLng / 180) * radius * Math.cos(trade.lat * Math.PI / 180);
                const y = centerY - (trade.lat / 90) * radius;

                // Check if point is on visible hemisphere
                const isVisible = Math.cos((adjustedLng * Math.PI) / 180) > 0;

                if (isVisible) {
                    // Pulsing marker
                    const pulseSize = 4 + Math.sin(Date.now() / 500 + trade.lat) * 2;

                    // Glow effect
                    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize * 3);
                    glowGradient.addColorStop(0, "rgba(34, 197, 94, 0.6)");
                    glowGradient.addColorStop(1, "rgba(34, 197, 94, 0)");
                    ctx.fillStyle = glowGradient;
                    ctx.beginPath();
                    ctx.arc(x, y, pulseSize * 3, 0, Math.PI * 2);
                    ctx.fill();

                    // Marker dot
                    ctx.fillStyle = "#22c55e";
                    ctx.beginPath();
                    ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            rotation += 0.002;
            requestAnimationFrame(animate);
        };

        animate();

        // Simulate new trades appearing
        const tradeInterval = setInterval(() => {
            const cities = [
                { lat: 40.7128, lng: -74.0060, city: "New York" },
                { lat: 51.5074, lng: -0.1278, city: "London" },
                { lat: 35.6762, lng: 139.6503, city: "Tokyo" },
                { lat: -33.8688, lng: 151.2093, city: "Sydney" },
                { lat: 1.3521, lng: 103.8198, city: "Singapore" },
                { lat: 37.7749, lng: -122.4194, city: "San Francisco" },
                { lat: 52.5200, lng: 13.4050, city: "Berlin" },
                { lat: 19.4326, lng: -99.1332, city: "Mexico City" },
            ];
            const randomCity = cities[Math.floor(Math.random() * cities.length)];
            setTrades(prev => [...prev.slice(-7), { ...randomCity, amount: Math.floor(Math.random() * 5000 + 1000) }]);
        }, 3000);

        return () => {
            clearInterval(tradeInterval);
        };
    }, [trades]);

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
            <CardHeader>
                <CardTitle className="text-lg font-medium text-zinc-200">Live Trade Map</CardTitle>
                <CardDescription className="text-zinc-500">Global trading activity in real-time</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-[400px] rounded-lg"
                        style={{ background: "transparent" }}
                    />

                    {/* Trade counter */}
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 border border-green-500/20 rounded-lg backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-mono text-green-400">{trades.length} Active Locations</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
