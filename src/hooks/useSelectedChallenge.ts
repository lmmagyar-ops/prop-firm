"use client";

import { useState, useEffect, useRef } from "react";

interface Challenge {
    id: string;
    status: string;
    startedAt: Date | string;
}

/**
 * Custom hook to manage the selected challenge ID with localStorage persistence
 * 
 * IMPORTANT: User's explicit selection is preserved across page reloads.
 * Auto-select only happens when there's no valid stored selection.
 */
export function useSelectedChallenge(challenges: Challenge[]) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hasInitialized = useRef(false);

    // Load from localStorage on mount and auto-select if needed
    useEffect(() => {
        // Don't run until challenges are actually loaded
        if (challenges.length === 0) {
            return; // Wait for challenges to load
        }

        // Only initialize once per mount to prevent race conditions
        if (hasInitialized.current) {
            return;
        }
        hasInitialized.current = true;

        const stored = localStorage.getItem("selectedChallengeId");

        // Also check cookie as backup (server might have set it)
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('selectedChallengeId='))
            ?.split('=')[1];

        // Use stored value from localStorage OR cookie
        const preferredId = stored || cookieValue;

        // DEBUG: Log what we're checking
        console.log("[ChallengeSelector] Debug:", {
            storedInLocalStorage: stored,
            storedInCookie: cookieValue,
            preferredId,
            challengeIds: challenges.map(c => ({ id: c.id, status: c.status })),
            foundMatch: preferredId ? challenges.some(c => c.id === preferredId && c.status === "active") : false
        });

        // If we have a stored ID and it's still valid (exists in challenges list AND is active)
        if (preferredId && challenges.some(c => c.id === preferredId && c.status === "active")) {
            console.log("[ChallengeSelector] Restoring saved selection:", preferredId);
            setSelectedId(preferredId);
            // Sync both localStorage and cookie
            localStorage.setItem("selectedChallengeId", preferredId);
            document.cookie = `selectedChallengeId=${preferredId}; path=/; max-age=${60 * 60 * 24 * 30}`;
        }
        // Auto-select: Pick the most recent active challenge only if nothing stored
        else {
            console.log("[ChallengeSelector] No valid stored selection, auto-selecting...");
            const mostRecent = challenges
                .filter(c => c.status === "active")
                .sort((a, b) => {
                    const dateA = new Date(a.startedAt).getTime();
                    const dateB = new Date(b.startedAt).getTime();
                    return dateB - dateA; // Descending (newest first)
                })[0];

            if (mostRecent) {
                console.log("[ChallengeSelector] Auto-selected:", mostRecent.id);
                setSelectedId(mostRecent.id);
                localStorage.setItem("selectedChallengeId", mostRecent.id);
                // Sync to cookie for server-side reading
                document.cookie = `selectedChallengeId=${mostRecent.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
            }
        }

        setIsLoading(false);
    }, [challenges]); // Use full challenges array to detect when it's populated

    // Save to localStorage AND cookie when selection changes
    const selectChallenge = (id: string) => {
        console.log("[ChallengeSelector] User switched to:", id);
        setSelectedId(id);
        localStorage.setItem("selectedChallengeId", id);
        // Also set cookie for server-side reading
        document.cookie = `selectedChallengeId=${id}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days
    };

    return {
        selectedId,
        selectChallenge,
        isLoading
    };
}
