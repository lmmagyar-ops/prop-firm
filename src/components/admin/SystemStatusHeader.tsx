"use client";

import { useEffect, useState } from "react";
import { Activity, Database, Server, Wifi, ShieldCheck, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SystemStatusHeader() {
    const [latency, setLatency] = useState(45);
    const [dbStatus, setDbStatus] = useState("Connected");
    const [wsConnections, setWsConnections] = useState(124);
    const [tps, setTps] = useState(12);

    // Simulate metric fluctuations
    useEffect(() => {
        const interval = setInterval(() => {
            setLatency(prev => Math.max(20, Math.min(150, prev + (Math.random() > 0.5 ? 5 : -5))));
            setWsConnections(prev => Math.max(100, prev + (Math.random() > 0.7 ? 1 : -1)));
            setTps(prev => Math.max(5, prev + (Math.random() - 0.5) * 5));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const getLatencyColor = (ms: number) => {
        if (ms < 50) return "text-green-500";
        if (ms < 100) return "text-yellow-500";
        return "text-red-500";
    };

    return (
        <div className="flex items-center gap-6 text-xs font-mono border-b border-white/5 pb-4 overflow-x-auto">
            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-zinc-400">SYSTEM NOMINAL</span>
            </div>

            <div className="h-4 w-px bg-white/10" />

            <div className="flex items-center gap-2">
                <Wifi className="h-3 w-3 text-zinc-500" />
                <span className="text-zinc-400">API LATENCY:</span>
                <span className={`${getLatencyColor(latency)} font-bold`}>{latency}ms</span>
            </div>

            <div className="flex items-center gap-2">
                <Database className="h-3 w-3 text-zinc-500" />
                <span className="text-zinc-400">DB CLUSTER:</span>
                <span className="text-green-500">{dbStatus}</span>
            </div>

            <div className="flex items-center gap-2">
                <Server className="h-3 w-3 text-zinc-500" />
                <span className="text-zinc-400">WS ACTIVE:</span>
                <span className="text-primary">{wsConnections}</span>
            </div>

            <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-zinc-500" />
                <span className="text-zinc-400">TPS:</span>
                <span className="text-purple-500">{tps.toFixed(1)}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <ShieldCheck className="h-3 w-3 text-green-500" />
                <span className="text-green-500/80">RISK ENGINE ACTIVE</span>
            </div>
        </div>
    );
}
