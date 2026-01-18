"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, RefreshCw, Search, Clock, User, Globe, Smartphone, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLog {
    id: string;
    userId: string;
    action: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    userName: string | null;
    userEmail: string | null;
}

interface ActiveUser {
    userId: string;
    userName: string | null;
    userEmail: string | null;
}

const ACTION_COLORS: Record<string, string> = {
    trade_executed: "bg-green-500/20 text-green-400 border-green-500/30",
    trade_failed: "bg-red-500/20 text-red-400 border-red-500/30",
    page_view: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    login: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    logout: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    challenge_started: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    challenge_passed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    challenge_failed: "bg-red-500/20 text-red-400 border-red-500/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
    api_error: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    default: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export default function ActivityLogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [actionTypes, setActionTypes] = useState<string[]>([]);
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Filters
    const [selectedUser, setSelectedUser] = useState<string>("all");
    const [selectedAction, setSelectedAction] = useState<string>("all");
    const [hours, setHours] = useState<string>("24");
    const [search, setSearch] = useState("");

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("hours", hours);
            params.set("limit", "200");
            if (selectedUser !== "all") params.set("userId", selectedUser);
            if (selectedAction !== "all") params.set("action", selectedAction);

            const res = await fetch(`/api/admin/activity-logs?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setActionTypes(data.actionTypes || []);
                setActiveUsers(data.activeUsers || []);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [selectedUser, selectedAction, hours]);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchLogs, 10000);
        return () => clearInterval(interval);
    }, [autoRefresh, selectedUser, selectedAction, hours]);

    // Filter logs by search
    const filteredLogs = logs.filter(log => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            log.action.toLowerCase().includes(searchLower) ||
            log.userName?.toLowerCase().includes(searchLower) ||
            log.userEmail?.toLowerCase().includes(searchLower) ||
            log.userId.toLowerCase().includes(searchLower) ||
            JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
        );
    });

    const parseUserAgent = (ua: string | null) => {
        if (!ua) return "Unknown";
        if (ua.includes("Mobile")) return "Mobile";
        if (ua.includes("Chrome")) return "Chrome";
        if (ua.includes("Firefox")) return "Firefox";
        if (ua.includes("Safari")) return "Safari";
        return "Desktop";
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white/90">Activity Logs</h1>
                    <p className="text-zinc-500">Real-time user activity for debugging and testing</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={autoRefresh ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={autoRefresh ? "bg-green-600 hover:bg-green-700" : "border-zinc-700"}
                    >
                        <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-pulse" : ""}`} />
                        {autoRefresh ? "Live" : "Auto-refresh"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchLogs}
                        disabled={loading}
                        className="border-zinc-700"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-zinc-900/40 border-white/5">
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <Input
                                    placeholder="Search logs, users, metadata..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 bg-zinc-800 border-zinc-700"
                                />
                            </div>
                        </div>
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger className="w-[200px] bg-zinc-800 border-zinc-700">
                                <User className="h-4 w-4 mr-2 text-zinc-500" />
                                <SelectValue placeholder="Filter by user" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="all">All Users</SelectItem>
                                {activeUsers.map((u) => (
                                    <SelectItem key={u.userId} value={u.userId}>
                                        {u.userName || u.userEmail || u.userId.slice(0, 8)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedAction} onValueChange={setSelectedAction}>
                            <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700">
                                <Filter className="h-4 w-4 mr-2 text-zinc-500" />
                                <SelectValue placeholder="Filter by action" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="all">All Actions</SelectItem>
                                {actionTypes.map((action) => (
                                    <SelectItem key={action} value={action}>
                                        {action}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={hours} onValueChange={setHours}>
                            <SelectTrigger className="w-[150px] bg-zinc-800 border-zinc-700">
                                <Clock className="h-4 w-4 mr-2 text-zinc-500" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="1">Last Hour</SelectItem>
                                <SelectItem value="6">Last 6 Hours</SelectItem>
                                <SelectItem value="24">Last 24 Hours</SelectItem>
                                <SelectItem value="72">Last 3 Days</SelectItem>
                                <SelectItem value="168">Last Week</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-4 pb-4">
                        <div className="text-2xl font-bold text-white tabular-nums">{filteredLogs.length}</div>
                        <div className="text-xs text-zinc-500">Total Events</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-4 pb-4">
                        <div className="text-2xl font-bold text-green-400 tabular-nums">
                            {filteredLogs.filter(l => l.action === "trade_executed").length}
                        </div>
                        <div className="text-xs text-zinc-500">Trades</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-4 pb-4">
                        <div className="text-2xl font-bold text-blue-400 tabular-nums">
                            {filteredLogs.filter(l => l.action === "page_view").length}
                        </div>
                        <div className="text-xs text-zinc-500">Page Views</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-4 pb-4">
                        <div className="text-2xl font-bold text-red-400 tabular-nums">
                            {filteredLogs.filter(l => l.action.includes("error") || l.action.includes("failed")).length}
                        </div>
                        <div className="text-xs text-zinc-500">Errors</div>
                    </CardContent>
                </Card>
            </div>

            {/* Activity Feed */}
            <Card className="bg-zinc-900/40 border-white/5">
                <CardHeader className="border-b border-white/5">
                    <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Activity Feed
                        {autoRefresh && (
                            <Badge variant="outline" className="ml-2 text-green-400 border-green-500/30 animate-pulse">
                                LIVE
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading && logs.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-6 w-6 animate-spin text-zinc-500" />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            No activity logs found
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                            {filteredLogs.map((log) => (
                                <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs ${ACTION_COLORS[log.action] || ACTION_COLORS.default}`}
                                                >
                                                    {log.action}
                                                </Badge>
                                                <span className="text-sm text-zinc-300 truncate">
                                                    {log.userName || log.userEmail || log.userId.slice(0, 8)}
                                                </span>
                                            </div>
                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <div className="text-xs text-zinc-500 font-mono bg-black/30 p-2 rounded mt-2 overflow-x-auto">
                                                    {JSON.stringify(log.metadata, null, 2)}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                                                <div className="flex items-center gap-1">
                                                    <Globe className="h-3 w-3" />
                                                    {log.ipAddress || "Unknown"}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Smartphone className="h-3 w-3" />
                                                    {parseUserAgent(log.userAgent)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-zinc-500 whitespace-nowrap">
                                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
