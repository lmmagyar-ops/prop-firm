
"use client";

import { Switch } from "@/components/ui/switch";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LeaderboardToggleProps {
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
}

export function LeaderboardToggle({ isEnabled, onToggle }: LeaderboardToggleProps) {
    return (
        <div className="flex items-center justify-between py-4 px-6 bg-zinc-900/50 rounded-xl border border-white/10">
            <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400 font-medium">Show on Leaderboard</span>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <HelpCircle className="w-4 h-4 text-zinc-600" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Toggle your visibility on the public leaderboard.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <Switch checked={isEnabled} onCheckedChange={onToggle} />
        </div>
    );
}
