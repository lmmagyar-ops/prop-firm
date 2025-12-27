"use client";

import { createContext, useContext, ReactNode } from "react";

interface SelectedChallengeContextType {
    selectedChallengeId: string | null;
    selectChallenge: (id: string) => void;
    isLoading: boolean;
}

const SelectedChallengeContext = createContext<SelectedChallengeContextType | undefined>(undefined);

export function SelectedChallengeProvider({
    children,
    value
}: {
    children: ReactNode;
    value: SelectedChallengeContextType;
}) {
    return (
        <SelectedChallengeContext.Provider value={value}>
            {children}
        </SelectedChallengeContext.Provider>
    );
}

export function useSelectedChallengeContext() {
    const context = useContext(SelectedChallengeContext);
    if (!context) {
        throw new Error("useSelectedChallengeContext must be used within SelectedChallengeProvider");
    }
    return context;
}
