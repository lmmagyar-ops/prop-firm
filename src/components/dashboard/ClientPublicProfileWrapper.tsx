
"use client";

import { AccountsTable } from "@/components/dashboard/AccountsTable";
import { LeaderboardToggle } from "@/components/dashboard/LeaderboardToggle";
import type { PublicProfileData } from "@/types/user";

interface ClientPublicProfileWrapperProps {
    data: PublicProfileData;
    toggleLeaderboard: (enabled: boolean) => Promise<void>;
    toggleAccountVisibility: (accountId: string, field: 'dropdown' | 'profile') => Promise<void>;
}

export function ClientPublicProfileWrapper({
    data,
    toggleLeaderboard,
    toggleAccountVisibility
}: ClientPublicProfileWrapperProps) {
    return (
        <div className="space-y-6">
            <div className="mb-4 max-w-xl">
                <LeaderboardToggle
                    isEnabled={data.showOnLeaderboard}
                    onToggle={async (enabled) => {
                        await toggleLeaderboard(enabled);
                    }}
                />
            </div>

            <AccountsTable
                accounts={data.accounts}
                showVisibilityControls
                onToggleVisibility={async (accountId, field) => {
                    await toggleAccountVisibility(accountId, field);
                }}
            />
        </div>
    );
}
