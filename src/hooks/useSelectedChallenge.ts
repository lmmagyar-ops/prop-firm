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



        // If we have a stored ID and it's still valid (exists in challenges list AND is active)
        if (preferredId && challenges.some(c => c.id === preferredId && c.status === "active")) {

            setSelectedId(preferredId);
            // Sync both localStorage and cookie
            localStorage.setItem("selectedChallengeId", preferredId);
            document.cookie = `selectedChallengeId=${preferredId}; path=/; max-age=${60 * 60 * 24 * 30}`;
        }
        // Auto-select: Pick the most recent active challenge only if nothing stored
        else {
            // Clear the stale stored values since they don't match any active challenges
            if (preferredId) {

                localStorage.removeItem("selectedChallengeId");
                document.cookie = "selectedChallengeId=; path=/; max-age=0"; // Delete cookie
            }


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
                // Sync to cookie for server-side reading
                document.cookie = `selectedChallengeId=${mostRecent.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
            }
        }

        setIsLoading(false);
    }, [challenges]); // Use full challenges array to detect when it's populated

    // Save to localStorage AND cookie when selection changes
    const selectChallenge = (id: string) => {

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
