
"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Trophy, Star, Medal, Zap, Target, TrendingUp, Award } from "lucide-react";

interface BadgesGridProps {
    badges: Array<{
        id: string;
        name: string;
        description: string;
        icon: string; // We'll map string names to Lucide icons
        earned: boolean;
        earnedDate?: Date;
    }>;
}

const ICON_MAP: Record<string, any> = {
    "trophy": Trophy,
    "star": Star,
    "medal": Medal,
    "zap": Zap,
    "target": Target,
    "trending": TrendingUp,
    "award": Award
};

export function BadgesGrid({ badges }: BadgesGridProps) {
    return (
        <div className="bg-[#0B0E14] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full pointer-events-none" />

            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Badges & Achievements
            </h2>

            <div className="grid grid-cols-4 gap-4">
                {badges.map((badge) => {
                    // Fallback to Star if icon name doesn't match
                    // In a real app we'd likely store the icon name in the DB
                    // For now, let's just use Trophy as default if mapping fails, or try to map 'trophy'
                    const IconComponent = ICON_MAP[badge.icon.toLowerCase()] || Trophy;

                    return (
                        <TooltipProvider key={badge.id}>
                            <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "relative aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 group ring-1 ring-inset",
                                            badge.earned
                                                ? "bg-gradient-to-br from-[#1A232E] to-[#0D1219] ring-primary/20 hover:ring-primary/50 hover:shadow-[0_0_20px_rgba(46,129,255,0.15)]"
                                                : "bg-[#0D1219] ring-white/5 opacity-60 hover:opacity-80"
                                        )}
                                    >
                                        <IconComponent
                                            className={cn(
                                                "w-6 h-6 transition-all duration-500",
                                                badge.earned
                                                    ? "text-primary group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                                    : "text-zinc-600"
                                            )}
                                        />

                                        {/* Status Indicator */}
                                        {!badge.earned && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] rounded-2xl">
                                                <Lock className="w-4 h-4 text-zinc-500/50" />
                                            </div>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-[#161B22] border-white/10 text-white p-3 shadow-xl">
                                    <div className="text-center">
                                        <p className="font-bold text-sm mb-1">{badge.name}</p>
                                        <p className="text-xs text-zinc-400 leading-snug mb-2 max-w-[150px] mx-auto">{badge.description}</p>
                                        {badge.earned ? (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-wider">
                                                Unlocked
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                                Locked
                                            </div>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )
                })}
            </div>
        </div>
    );
}
