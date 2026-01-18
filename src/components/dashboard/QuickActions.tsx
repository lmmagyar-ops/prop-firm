"use client";

import { useState } from "react";
import { TrendingUp, X, Share2, BarChart3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface QuickActionsProps {
    hasActiveChallenge: boolean;
    hasPositions: boolean;
}

export function QuickActions({ hasActiveChallenge, hasPositions }: QuickActionsProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!hasActiveChallenge) return null;

    return (
        <>
            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-40">
                {isExpanded ? (
                    <div className="bg-[#1A232E] border border-[#2E3A52] rounded-2xl shadow-2xl p-4 space-y-2 animate-in fade-in-0 zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-white">Quick Actions</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsExpanded(false)}
                                className="h-6 w-6 p-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <Link href="/dashboard/trade">
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-left hover:bg-[#2E3A52]"
                            >
                                <TrendingUp className="w-4 h-4 text-blue-400" />
                                <span className="text-sm">Browse Markets</span>
                            </Button>
                        </Link>

                        <Link href="/dashboard/private-profile">
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-left hover:bg-[#2E3A52]"
                            >
                                <BarChart3 className="w-4 h-4 text-purple-400" />
                                <span className="text-sm">View Analytics</span>
                            </Button>
                        </Link>

                        <Link href="/dashboard/public-profile">
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-left hover:bg-[#2E3A52]"
                            >
                                <Share2 className="w-4 h-4 text-green-400" />
                                <span className="text-sm">Share Performance</span>
                            </Button>
                        </Link>

                        {hasPositions && (
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-left hover:bg-[#2E3A52] text-red-400"
                                onClick={() => {
                                    // Future: Close all positions
                                    alert("Close all positions feature coming soon!");
                                }}
                            >
                                <X className="w-4 h-4" />
                                <span className="text-sm">Close All Positions</span>
                            </Button>
                        )}
                    </div>
                ) : (
                    <Button
                        onClick={() => setIsExpanded(true)}
                        className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:scale-110"
                    >
                        <Zap className="w-6 h-6" />
                    </Button>
                )}
            </div>
        </>
    );
}
