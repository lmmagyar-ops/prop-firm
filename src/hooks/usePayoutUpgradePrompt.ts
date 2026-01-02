import { useState, useEffect } from "react";

/**
 * Hook to detect if user should be prompted to upgrade privacy after first payout
 * 
 * Usage:
 * const shouldShowUpgrade = usePayoutUpgradePrompt(userId, leaderboardPrivacy);
 * 
 * Triggers when:
 * 1. User completes first payout
 * 2. User is in semi_private or fully_private mode
 * 3. User hasn't dismissed the prompt before
 */
export function usePayoutUpgradePrompt(
    userId: string | undefined,
    leaderboardPrivacy: string | undefined,
    hasCompletedPayout: boolean
): { shouldShow: boolean; markAsShown: () => void } {
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        if (!userId || !hasCompletedPayout) return;

        // Check if already dismissed
        const dismissed = localStorage.getItem(`payout_upgrade_dismissed_${userId}`);
        if (dismissed) return;

        // Only show for non-public users
        if (leaderboardPrivacy === "semi_private" || leaderboardPrivacy === "fully_private") {
            setShouldShow(true);
        }
    }, [userId, leaderboardPrivacy, hasCompletedPayout]);

    const markAsShown = () => {
        if (userId) {
            localStorage.setItem(`payout_upgrade_dismissed_${userId}`, "true");
        }
        setShouldShow(false);
    };

    return { shouldShow, markAsShown };
}
