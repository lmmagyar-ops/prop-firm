"use client";

import { useEffect, useState } from "react";
import { Activity, Database, Wifi, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemMetric {
    label: string;
    value: string;
    status: "good" | "warning" | "critical";
    icon: React.ElementType;
}

export function SystemHeartbeat() {
    const [metrics, setMetrics] = useState<SystemMetric[]>([
        { label: "API", value: "12ms", status: "good", icon: Zap },
        { label: "DB", value: "45ms", status: "good", icon: Database },
        { label: "WS", value: "156", status: "good", icon: Wifi },
        { label: "Load", value: "23%", status: "good", icon: Activity },
    ]);

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics([
                {
                    label: "API",
                    value: `${Math.floor(Math.random() * 30 + 10)}ms`,
                    status: Math.random() > 0.9 ? "warning" : "good",
                    icon: Zap
                },
                {
                    label: "DB",
                    value: `${Math.floor(Math.random() * 50 + 20)}ms`,
                    status: Math.random() > 0.95 ? "warning" : "good",
                    icon: Database
                },
                {
                    label: "WS",
                    value: `${Math.floor(Math.random() * 100 + 100)}`,
                    status: "good",
                    icon: Wifi
                },
                {
                    label: "Load",
                    value: `${Math.floor(Math.random() * 40 + 10)}%`,
                    status: Math.random() > 0.8 ? "warning" : "good",
                    icon: Activity
                },
            ]);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "good":
                return "text-green-400 bg-green-500/10 border-green-500/20";
            case "warning":
                return "text-amber-400 bg-amber-500/10 border-amber-500/20";
            case "critical":
                return "text-red-400 bg-red-500/10 border-red-500/20";
            default:
                return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
        }
    };

    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-black/40 border border-white/5 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <span className="text-xs font-medium text-zinc-400">System Status</span>
            </div>

            <div className="h-4 w-px bg-white/10" />

            <div className="flex items-center gap-3">
                {metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                        <div
                            key={metric.label}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded border transition-all duration-300",
                                getStatusColor(metric.status)
                            )}
                        >
                            <Icon className="h-3 w-3" />
                            <span className="text-xs font-mono font-medium">{metric.label}</span>
                            <span className="text-xs font-mono tabular-nums">{metric.value}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
