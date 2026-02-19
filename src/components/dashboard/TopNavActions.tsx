"use client";

import { PortfolioPanel } from "./PortfolioPanel";
import { UserNav } from "./user-nav";

interface TopNavActionsProps {
    userId: string;
}

export function TopNavActions({ userId }: TopNavActionsProps) {
    return (
        <div className="flex items-center gap-2 md:gap-4">
            <PortfolioPanel />
            <UserNav />
        </div>
    );
}
