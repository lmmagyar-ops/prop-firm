"use client";

import { useEffect, useState } from "react";
import { ChallengeSelector } from "./ChallengeSelector";
import { PortfolioDropdown } from "./PortfolioDropdown";
import { UserNav } from "./user-nav";
import { useSelectedChallenge } from "@/hooks/useSelectedChallenge";
import { SelectedChallengeProvider } from "@/contexts/SelectedChallengeContext";

interface Challenge {
    id: string;
    tier: string;
    accountNumber: string;
    currentBalance: string;
    startingBalance: string;
    status: string;
    startedAt: Date | string;
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
                const response = await fetch(`/api/challenges?userId=${userId}`);
                if (response.ok) {
                    const data = await response.json();
                    setChallenges(data.challenges || []);
                }
            } catch (error) {
                console.error("Failed to fetch challenges:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchChallenges();
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
                <PortfolioDropdown />
                <UserNav />
            </div>
        </SelectedChallengeProvider>
    );
}
