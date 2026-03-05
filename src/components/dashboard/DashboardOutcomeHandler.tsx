"use client";

import { useEffect, useState } from "react";
import { ChallengePassedModal } from "@/components/dashboard/ChallengePassedModal";

interface DashboardOutcomeHandlerProps {
    challengeHistory: Array<{ id: string; status: string; balance?: string; startingBalance?: string; phase?: string; createdAt?: string }>;
}

export function DashboardOutcomeHandler({ challengeHistory = [] }: DashboardOutcomeHandlerProps) {
    const latestChallenge = challengeHistory && challengeHistory.length > 0 ? challengeHistory[0] : null;
    const [showPassedModal, setShowPassedModal] = useState(false);

    useEffect(() => {
        // Only show modal for PASSED state (celebration moment).
        // Failed state is handled by the inline Locked State banner in dashboard/page.tsx
        // which has better UX (Try Again + Reset & Retry buttons).
        // Showing BOTH caused Mat's "2 popups" bug.
        if (latestChallenge?.status === 'passed') {
            setShowPassedModal(true);
        }
    }, [latestChallenge]);

    return (
        <ChallengePassedModal
            isOpen={showPassedModal}
            onClose={() => setShowPassedModal(false)}
        />
    );
}

