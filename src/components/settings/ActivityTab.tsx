"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Monitor, MapPin, Clock } from "lucide-react";

interface ActivityLog {
    id: string;
    action: string;
    ipAddress: string;
    location?: string;
    userAgent: string;
    createdAt: Date;
}

// Mock data for demonstration
const mockActivities: ActivityLog[] = [
    {
        id: "1",
        action: "login",
        ipAddress: "192.168.1.1",
        location: "San Francisco, CA",
        userAgent: "Chrome on Mac",
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    },
];

export function ActivityTab() {
    return (
        <div className="space-y-6">
            <Card className="bg-[#0D1117] border-[#2E3A52]">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Activity className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Recent Activity</CardTitle>
                            <CardDescription className="text-zinc-500">
                                Monitor your account activity and login history
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {mockActivities.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-start gap-4 p-4 bg-[#1A232E] border border-[#2E3A52] rounded-lg"
                            >
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                    <Monitor className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-white font-medium capitalize">{activity.action}</p>
                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTimeAgo(activity.createdAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {activity.location || "Unknown location"}
                                        </span>
                                        <span>{activity.ipAddress}</span>
                                    </div>
                                    <p className="text-xs text-zinc-600">{activity.userAgent}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 text-center text-sm text-zinc-600">
                        Activity logging will be fully enabled once all integrations are complete
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
