"use client";

import { useState, useEffect } from "react";

interface Challenge {
    id: string;
    status: string;
    startedAt: Date | string;
}

/**
 * Custom hook to manage the selected challenge ID with localStorage persistence
 */
export function useSelectedChallenge(challenges: Challenge[]) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load from localStorage on mount and auto-select if needed
    useEffect(() => {
        const stored = localStorage.getItem("selectedChallengeId");

        // If we have a stored ID and it's still valid (exists in challenges list)
        if (stored && challenges.some(c => c.id === stored && c.status === "active")) {
            setSelectedId(stored);
        }
        // Auto-select: Pick the most recent active challenge
        else if (challenges.length > 0) {
            const mostRecent = challenges
                .filter(c => c.status === "active")
                .sort((a, b) => {
                    const dateA = new Date(a.startedAt).getTime();
                    const dateB = new Date(b.startedAt).getTime();
                    return dateB - dateA; // Descending (newest first)
                })[0];

            if (mostRecent) {
                setSelectedId(mostRecent.id);
                localStorage.setItem("selectedChallengeId", mostRecent.id);
            }
        }

        setIsLoading(false);
    }, [challenges.length]); // Fixed: Use challenges.length instead of challenges to prevent infinite re-renders

    // Save to localStorage when selection changes
    const selectChallenge = (id: string) => {
        setSelectedId(id);
        localStorage.setItem("selectedChallengeId", id);
    };

    return {
        selectedId,
        selectChallenge,
        isLoading
    };
}
