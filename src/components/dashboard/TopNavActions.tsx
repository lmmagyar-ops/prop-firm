"use client";

import { useEffect, useState } from "react";
import { ChallengeSelector } from "./ChallengeSelector";
import { PortfolioPanel } from "./PortfolioPanel";
import { UserNav } from "./user-nav";
import { useSelectedChallenge } from "@/hooks/useSelectedChallenge";
import { SelectedChallengeProvider } from "@/contexts/SelectedChallengeContext";
import { apiFetch } from "@/lib/api-fetch";

interface Challenge {
    id: string;
    tier: string;
    accountNumber: string;
    currentBalance: string;
    startingBalance: string;
    equity?: string;
    positionValue?: string;
    status: string;
    startedAt: Date | string;
    platform?: "polymarket" | "kalshi";
}

interface TopNavActionsProps {
    userId: string;
}

export function TopNavActions({ userId }: TopNavActionsProps) {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { selectedId, selectChallenge, isLoading: hookLoading } = useSelectedChallenge(challenges);

    // Fetch user's challenges
    useEffect(() => {
        async function fetchChallenges() {
            try {
                const response = await apiFetch(`/api/challenges?userId=${userId}&_t=${Date.now()}`, {
                    cache: 'no-store'
                });
                if (response.ok) {
                    const data = await response.json();
                    console.log("[TopNavActions] userId:", userId, "Fetched IDs:", JSON.stringify(data.challenges?.map((c: Record<string, string>) => c.id)));
                    setChallenges(data.challenges || []);
                } else {
                    console.error(`[TopNavActions] Challenges API error: ${response.status}`);
                }
            } catch (error) {
                console.error("[TopNavActions] Network error:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchChallenges();

        // Listen for balance updates after trades
        const handleBalanceUpdate = () => {
            fetchChallenges();
        };

        window.addEventListener('balance-updated', handleBalanceUpdate);
        return () => window.removeEventListener('balance-updated', handleBalanceUpdate);
    }, [userId]);

    const contextValue = {
        selectedChallengeId: selectedId,
        selectChallenge,
        isLoading: isLoading || hookLoading
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-4">
                {/* Loading skeleton */}
                <div className="w-48 h-10 bg-zinc-800/50 animate-pulse rounded-lg" />
                <div className="w-10 h-10 bg-zinc-800/50 animate-pulse rounded-full" />
                <div className="w-10 h-10 bg-zinc-800/50 animate-pulse rounded-full" />
            </div>
        );
    }

    return (
        <SelectedChallengeProvider value={contextValue}>
            <div className="flex items-center gap-4">
                {challenges.length > 0 && (
                    <ChallengeSelector
                        challenges={challenges}
                        selectedChallengeId={selectedId}
                        onSelect={selectChallenge}
                    />
                )}
                <PortfolioPanel />
                <UserNav />
            </div>
        </SelectedChallengeProvider>
    );
}
