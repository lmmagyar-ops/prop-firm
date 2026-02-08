"use client";

import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";

interface DashboardShellProps {
    userId: string;
    hasActiveChallenge: boolean;
    children: React.ReactNode;
}

/**
 * Client-side shell that bridges the server layout with sidebar collapse state.
 * The layout.tsx stays server-side for auth; this handles all client interactivity.
 */
export function DashboardShell({
    userId,
    hasActiveChallenge,
    children,
}: DashboardShellProps) {
    const { isCollapsed, toggle } = useSidebarCollapse();

    return (
        <>
            <Sidebar
                hasActiveChallenge={hasActiveChallenge}
                isCollapsed={isCollapsed}
                onToggle={toggle}
            />

            <main
                className={`flex-1 flex flex-col min-h-screen transition-[margin] duration-200 ease-out ${isCollapsed ? "ml-0 md:ml-16" : "ml-0 md:ml-64"
                    }`}
            >
                <TopNav userId={userId} />

                <div className="flex-1 p-6 max-w-[1800px] mx-auto w-full overflow-hidden">
                    {children}
                </div>
            </main>
        </>
    );
}
