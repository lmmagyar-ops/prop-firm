"use client";

import { useEffect, useState } from "react";

interface SystemStatus {
    status: "outage" | "grace_window" | "healthy";
    marketDataAge: number | null;
    outageStartedAt: string | null;
    graceWindowEndsAt: string | null;
    message: string | null;
}

/**
 * OutageBanner — Displays a warning when the platform is in an outage
 * or grace window state. Polls /api/system/status every 30 seconds.
 * 
 * - Outage: Red banner — trading halted, evaluation timer paused
 * - Grace Window: Yellow banner — trading resumed, evaluation resumes soon
 * - Healthy: Hidden
 */
export function OutageBanner() {
    const [status, setStatus] = useState<SystemStatus | null>(null);

    useEffect(() => {
        let mounted = true;

        async function fetchStatus() {
            try {
                const res = await fetch("/api/system/status");
                if (!res.ok) return;
                const data = await res.json();
                if (mounted) setStatus(data);
            } catch {
                // Silent fail — don't show banner if we can't reach the API
            }
        }

        fetchStatus();
        const interval = setInterval(fetchStatus, 30_000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    if (!status || status.status === "healthy") return null;

    const isOutage = status.status === "outage";

    // Calculate grace window countdown
    let graceMinutes: number | null = null;
    if (status.graceWindowEndsAt) {
        const remaining = new Date(status.graceWindowEndsAt).getTime() - Date.now();
        graceMinutes = Math.max(0, Math.ceil(remaining / 60_000));
    }

    return (
        <div
            className={`w-full px-4 py-3 text-sm font-medium text-center border-b ${isOutage
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                }`}
            role="alert"
        >
            <div className="flex items-center justify-center gap-2">
                <span className="text-base">{isOutage ? "⚠️" : "⚡"}</span>
                <span>
                    {isOutage
                        ? "Trading Halted — Market data temporarily unavailable. Your evaluation timer is paused."
                        : `Trading Resumed — You have ${graceMinutes ?? "?"} minutes to manage positions before evaluation resumes.`
                    }
                </span>
            </div>
        </div>
    );
}
