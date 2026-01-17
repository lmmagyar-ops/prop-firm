"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    RefreshCw,
    User,
    LogIn,
    LogOut,
    TrendingUp,
    AlertCircle,
    Activity,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EventLog {
    id: string;
    userId: string;
    userName: string;
    action: string;
    metadata: Record<string, unknown>;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}

interface EventsResponse {
    logs: EventLog[];
    count: number;
    actionCounts: Record<string, number>;
}

// Icon mapping for event types
const eventIcons: Record<string, typeof Activity> = {
    login: LogIn,
    logout: LogOut,
    trade_executed: TrendingUp,
    trade_failed: AlertCircle,
    page_view: Activity,
    error: AlertCircle,
};

// Color mapping for event types
const eventColors: Record<string, string> = {
    login: "bg-green-500/20 text-green-400 border-green-500/30",
    logout: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    trade_executed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    trade_failed: "bg-red-500/20 text-red-400 border-red-500/30",
    page_view: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
};

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function parseUserAgent(ua: string | null): string {
    if (!ua) return "Unknown";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac")) return "Mac";
    if (ua.includes("iPhone")) return "iPhone";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("Linux")) return "Linux";
    return "Unknown";
}

export default function AdminEventsPage() {
    const [events, setEvents] = useState<EventLog[]>([]);
    const [actionCounts, setActionCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [userIdFilter, setUserIdFilter] = useState("");
    const [actionFilter, setActionFilter] = useState("");

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (userIdFilter) params.set("userId", userIdFilter);
            if (actionFilter) params.set("action", actionFilter);
            params.set("limit", "100");

            const res = await fetch(`/api/admin/events?${params}`);
            if (res.ok) {
                const data: EventsResponse = await res.json();
                setEvents(data.logs);
                setActionCounts(data.actionCounts);
            }
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchEvents, 30000);
        return () => clearInterval(interval);
    }, [userIdFilter, actionFilter]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white/90">
                        User Activity
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Real-time event logs from all users
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchEvents}
                    disabled={loading}
                    className="border-zinc-700 hover:bg-zinc-800"
                >
                    <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(actionCounts).slice(0, 4).map(([action, count]) => {
                    const Icon = eventIcons[action] || Activity;
                    return (
                        <Card key={action} className="bg-zinc-900/50 border-zinc-800">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        eventColors[action] || "bg-zinc-800"
                                    )}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white">{count}</p>
                                        <p className="text-xs text-zinc-500 capitalize">
                                            {action.replace(/_/g, " ")}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Filters */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <Input
                                    placeholder="Filter by User ID..."
                                    value={userIdFilter}
                                    onChange={(e) => setUserIdFilter(e.target.value)}
                                    className="pl-10 bg-zinc-800 border-zinc-700"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                variant={actionFilter === "" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setActionFilter("")}
                                className={actionFilter === "" ? "" : "border-zinc-700"}
                            >
                                All
                            </Button>
                            <Button
                                variant={actionFilter === "login" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setActionFilter("login")}
                                className={actionFilter === "login" ? "" : "border-zinc-700"}
                            >
                                Logins
                            </Button>
                            <Button
                                variant={actionFilter === "trade_executed" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setActionFilter("trade_executed")}
                                className={actionFilter === "trade_executed" ? "" : "border-zinc-700"}
                            >
                                Trades
                            </Button>
                            <Button
                                variant={actionFilter === "trade_failed" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setActionFilter("trade_failed")}
                                className={actionFilter === "trade_failed" ? "" : "border-zinc-700"}
                            >
                                Errors
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Event Log Table */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="border-b border-zinc-800">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-400" />
                        Event Stream
                        <Badge variant="secondary" className="ml-2 bg-zinc-800">
                            {events.length} events
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading && events.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                            Loading events...
                        </div>
                    ) : events.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            No events found. Activity will appear here once users interact with the app.
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800">
                            {events.map((event) => {
                                const Icon = eventIcons[event.action] || Activity;
                                return (
                                    <div
                                        key={event.id}
                                        className="px-4 py-3 hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Icon */}
                                            <div className={cn(
                                                "p-2 rounded-lg shrink-0",
                                                eventColors[event.action] || "bg-zinc-800"
                                            )}>
                                                <Icon className="w-4 h-4" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-white">
                                                        {event.userName}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-xs capitalize",
                                                            eventColors[event.action]
                                                        )}
                                                    >
                                                        {event.action.replace(/_/g, " ")}
                                                    </Badge>
                                                </div>

                                                {/* Metadata */}
                                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                                    <div className="mt-1 text-xs text-zinc-500 font-mono">
                                                        {JSON.stringify(event.metadata).slice(0, 100)}
                                                        {JSON.stringify(event.metadata).length > 100 && "..."}
                                                    </div>
                                                )}

                                                {/* Footer */}
                                                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-600">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTimeAgo(event.createdAt)}
                                                    </span>
                                                    <span>{parseUserAgent(event.userAgent)}</span>
                                                    {event.ipAddress && (
                                                        <span className="font-mono">{event.ipAddress}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
