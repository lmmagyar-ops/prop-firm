"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Award,
    ShoppingCart,
    Settings,
    Wallet,
    HelpCircle,
    Trophy,
    History,
    TrendingUp,
    Lock,
    ChevronsLeft,
    ChevronsRight,
    Gift,
} from "lucide-react";

interface SidebarProps {
    active?: string; // Optional override, otherwise derived from pathname
    verificationStatus?: "locked" | "pending" | "verified";
    hasActiveChallenge?: boolean;
    isCollapsed?: boolean;
    onToggle?: () => void;
}

// Derive active page from pathname
function getActiveFromPath(pathname: string): string {
    if (pathname.includes("/dashboard/trade")) return "Trade";
    if (pathname.includes("/dashboard/private-profile")) return "Private Profile";
    if (pathname.includes("/dashboard/public-profile")) return "Public Profile";
    if (pathname.includes("/dashboard/certificates")) return "Certificates";
    if (pathname.includes("/dashboard/verification")) return "Verification";
    if (pathname.includes("/dashboard/settings")) return "Settings";
    if (pathname.includes("/dashboard/payouts")) return "Payouts";
    if (pathname.includes("/dashboard/affiliate")) return "Refer & Earn";
    if (pathname.includes("/dashboard/faq")) return "FAQ";
    if (pathname.includes("/dashboard/leaderboard")) return "Leaderboard";
    if (pathname.includes("/dashboard/history")) return "Trade History";
    if (pathname === "/dashboard") return "Dashboard";
    return "Dashboard";
}

export function Sidebar({
    active,
    hasActiveChallenge = false,
    isCollapsed = false,
    onToggle,
}: SidebarProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [showTradeGlow, setShowTradeGlow] = useState(false);

    // Use prop if provided, otherwise derive from pathname
    const activePage = active || getActiveFromPath(pathname);

    useEffect(() => {
        // Check if user just completed welcome tour
        if (searchParams.get("welcome") === "true") {
            setShowTradeGlow(true);

            // Auto-dismiss after 10 seconds
            const timer = setTimeout(() => {
                setShowTradeGlow(false);
            }, 10000);

            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    return (
        <aside
            className={`hidden md:flex border-r border-[#2E3A52] bg-[#161B22] flex-col fixed inset-y-0 left-0 z-50 transition-all duration-200 ease-out ${isCollapsed ? "w-16" : "w-64"
                }`}
        >
            {/* Logo */}
            <div className={`p-6 ${isCollapsed ? "px-3 py-6 flex justify-center" : ""}`}>
                <Link href="/dashboard" className="block">
                    {isCollapsed ? (
                        <img
                            src="/icon.png"
                            alt="Predictions Firm"
                            className="h-8 w-8 rounded-lg"
                        />
                    ) : (
                        <img
                            src="/logo-wordmark-white.png"
                            alt="Predictions Firm"
                            className="h-10 w-auto"
                        />
                    )}
                </Link>
            </div>

            <nav
                className={`flex-1 space-y-1 ${isCollapsed ? "px-2" : "px-4"}`}
                data-testid="sidebar-nav"
            >
                {/* Primary Navigation */}
                <NavItem
                    icon={LayoutDashboard}
                    label="Dashboard"
                    href="/dashboard"
                    isActive={activePage === "Dashboard"}
                    collapsed={isCollapsed}
                />
                {hasActiveChallenge ? (
                    <NavItem
                        icon={TrendingUp}
                        label="Trade"
                        href="/dashboard/trade"
                        isActive={activePage === "Trade"}
                        glow={showTradeGlow}
                        onClick={() => setShowTradeGlow(false)}
                        collapsed={isCollapsed}
                    />
                ) : (
                    <div
                        className={`flex items-center gap-3 text-zinc-600 cursor-not-allowed ${isCollapsed
                            ? "px-0 py-3 justify-center"
                            : "px-4 py-3"
                            }`}
                        title={isCollapsed ? "Trade (Locked)" : undefined}
                    >
                        <Lock className="w-4 h-4 flex-shrink-0" />
                        {!isCollapsed && (
                            <span className="text-sm font-medium">
                                Trade (Locked)
                            </span>
                        )}
                    </div>
                )}

                {/* Secondary Navigation */}
                <div className="pt-3">
                    <NavItem
                        icon={Users}
                        label="Public Profile"
                        href="/dashboard/public-profile"
                        isActive={activePage === "Public Profile"}
                        collapsed={isCollapsed}
                    />
                    <NavItem
                        icon={Award}
                        label="Certificates"
                        href="/dashboard/certificates"
                        isActive={activePage === "Certificates"}
                        collapsed={isCollapsed}
                    />
                    <NavItem
                        icon={ShoppingCart}
                        label="Buy Evaluation"
                        href="/buy-evaluation"
                        highlight
                        isActive={activePage === "Buy Evaluation"}
                        collapsed={isCollapsed}
                    />
                </div>

                {/* Settings & Support */}
                <div className="pt-3" data-testid="sidebar-settings">
                    <NavItem
                        icon={History}
                        label="Trade History"
                        href="/dashboard/history"
                        isActive={activePage === "Trade History"}
                        collapsed={isCollapsed}
                    />
                    <NavItem
                        icon={Settings}
                        label="Settings"
                        href="/dashboard/settings"
                        isActive={activePage === "Settings"}
                        collapsed={isCollapsed}
                    />
                    <NavItem
                        icon={Wallet}
                        label="Payouts"
                        href="/dashboard/payouts"
                        isActive={activePage === "Payouts"}
                        collapsed={isCollapsed}
                    />
                    <NavItem
                        icon={Gift}
                        label="Refer & Earn"
                        href="/dashboard/affiliate"
                        isActive={activePage === "Refer & Earn"}
                        collapsed={isCollapsed}
                    />
                    <NavItem
                        icon={HelpCircle}
                        label="FAQ"
                        href="/dashboard/faq"
                        isActive={activePage === "FAQ"}
                        collapsed={isCollapsed}
                    />
                    <NavItem
                        icon={Trophy}
                        label="Leaderboard"
                        href="/dashboard/leaderboard"
                        isActive={activePage === "Leaderboard"}
                        collapsed={isCollapsed}
                    />
                </div>
            </nav>



            {/* Collapse Toggle */}
            <button
                onClick={onToggle}
                className="p-4 border-t border-[#2E3A52] flex items-center justify-center text-zinc-500 hover:text-white hover:bg-[#1A232E] transition-colors"
                title={isCollapsed ? "Expand sidebar ( [ )" : "Collapse sidebar ( [ )"}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {isCollapsed ? (
                    <ChevronsRight className="w-4 h-4" />
                ) : (
                    <div className="flex items-center gap-2 text-xs">
                        <ChevronsLeft className="w-4 h-4" />
                        <span>Collapse</span>
                        <kbd className="ml-auto px-1.5 py-0.5 rounded bg-[#0E1217] border border-[#2E3A52] text-[10px] font-mono text-zinc-500">
                            [
                        </kbd>
                    </div>
                )}
            </button>
        </aside>
    );
}

interface NavItemProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    isActive?: boolean;
    highlight?: boolean;
    href?: string;
    className?: string;
    glow?: boolean;
    onClick?: () => void;
    collapsed?: boolean;
}

function NavItem({
    icon: Icon,
    label,
    isActive,
    highlight,
    href = "#",
    className,
    glow,
    onClick,
    collapsed,
}: NavItemProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`
                group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all
                ${collapsed ? "px-0 py-3 justify-center" : "px-4 py-3"}
                ${isActive
                    ? "bg-[#29af73]/10 text-[#29af73] border-l-2 border-[#29af73]"
                    : "text-[#94A3B8] hover:text-white hover:bg-[#1A232E]"
                }
                ${highlight && !isActive
                    ? "bg-[#29af73]/10 text-[#29af73] hover:bg-[#29af73]/20 border border-[#29af73]/20"
                    : ""
                }
                ${glow
                    ? "animate-pulse bg-gradient-to-r from-green-500/20 to-primary/20 border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                    : ""
                }
                ${className || ""}
            `}
        >
            <Icon
                className={`w-4 h-4 flex-shrink-0 ${highlight || isActive || glow ? "text-primary" : ""
                    }`}
            />
            {!collapsed && label}
            {/* CSS tooltip — instant, styled, right of icon */}
            {collapsed && (
                <span className="absolute left-full ml-2 px-2.5 py-1.5 rounded-md bg-[#1A232E] border border-[#2E3A52] text-xs font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-[60] shadow-lg">
                    {label}
                </span>
            )}
            {glow && !collapsed && (
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
            )}
        </Link>
    );
}

