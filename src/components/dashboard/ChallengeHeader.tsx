"use client";

import { Badge } from "@/components/ui/badge";

interface ChallengeHeaderProps {
    phase: 'challenge' | 'verification' | 'funded';
    status: 'active' | 'failed' | 'passed';
    startingBalance: number;
    daysRemaining: number;
}

export function ChallengeHeader({ phase, status, startingBalance, daysRemaining }: ChallengeHeaderProps) {
    // Format phase for display
    const phaseDisplay = phase === 'challenge'
        ? "Challenge Phase 1"
        : phase === 'verification'
            ? "Verification Phase 2"
            : "Funded Trader";

    return (
        <div className="bg-[#1A232E] border border-[#2E3A52] rounded-2xl p-6">
            <div className="flex items-center justify-between">
                <div>
                    <Badge variant="outline" className="text-xs uppercase tracking-wider mb-2 border-white/20 bg-white/5 text-zinc-300">
                        {phaseDisplay}
                    </Badge>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        ${startingBalance.toLocaleString()} Evaluation
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${status === 'active' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                            status === 'passed' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                                'border-red-500/30 text-red-500 bg-red-500/10'
                            }`}>
                            {status.toUpperCase()}
                        </span>
                    </h2>
                </div>
                <div className="text-right">
                    <div className="text-sm text-zinc-500 font-medium">Days Remaining</div>
                    <div className="text-3xl font-mono font-bold text-white tracking-tight">{daysRemaining}</div>
                </div>
            </div>
        </div>
    );
}
