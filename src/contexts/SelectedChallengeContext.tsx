"use client";

import { createContext, useContext, ReactNode } from "react";

interface SelectedChallengeContextType {
    selectedChallengeId: string | null;
    selectChallenge: (id: string) => void;
    isLoading: boolean;
}

// Default context value for when provider isn't present
const defaultContextValue: SelectedChallengeContextType = {
    selectedChallengeId: null,
    selectChallenge: () => { },
    isLoading: false,
};

const SelectedChallengeContext = createContext<SelectedChallengeContextType>(defaultContextValue);

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
    // Returns default value if no provider exists (no error thrown)
    return useContext(SelectedChallengeContext);
}
