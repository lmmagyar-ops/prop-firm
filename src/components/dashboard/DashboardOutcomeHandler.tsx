"use client";

import { useEffect, useState } from "react";
import { ChallengeFailedModal } from "@/components/dashboard/ChallengeFailedModal";
import { ChallengePassedModal } from "@/components/dashboard/ChallengePassedModal";

interface DashboardOutcomeHandlerProps {
    challengeHistory: Array<{ id: string; status: string; balance?: string; startingBalance?: string; phase?: string; createdAt?: string }>;
}

export function DashboardOutcomeHandler({ challengeHistory = [] }: DashboardOutcomeHandlerProps) {
    const latestChallenge = challengeHistory && challengeHistory.length > 0 ? challengeHistory[0] : null;
    const [showFailedModal, setShowFailedModal] = useState(false);
    const [showPassedModal, setShowPassedModal] = useState(false);

    useEffect(() => {
        // Trigger logic:
        // If the VERY LAST challenge was failed/passed, we show the modal.
        // In a real app, we would verify if it was "viewed" yet. 
        // For MVP, we show it every time dashboard loads if the latest is in that state.

        if (latestChallenge) {
            if (latestChallenge.status === 'failed') {
                setShowFailedModal(true);
            } else if (latestChallenge.status === 'passed') {
                setShowPassedModal(true);
            }
        }
    }, [latestChallenge]);

    return (
        <>
            <ChallengeFailedModal
                isOpen={showFailedModal}
                onClose={() => setShowFailedModal(false)}
            />
            <ChallengePassedModal
                isOpen={showPassedModal}
                onClose={() => setShowPassedModal(false)}
            />
        </>
    );
}
