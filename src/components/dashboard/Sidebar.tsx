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
    MessageSquare,
    Clock,
    History,
    TrendingUp,
    Lock
} from "lucide-react";

interface SidebarProps {
    active?: string; // Optional override, otherwise derived from pathname
    verificationStatus?: "locked" | "pending" | "verified";
    hasActiveChallenge?: boolean;
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
    if (pathname.includes("/dashboard/faq")) return "FAQ";
    if (pathname.includes("/dashboard/leaderboard")) return "Leaderboard";
    if (pathname.includes("/dashboard/history")) return "Trade History";
    if (pathname === "/dashboard") return "Dashboard";
    return "Dashboard";
}

export function Sidebar({ active, hasActiveChallenge = false }: SidebarProps) {
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
        <aside className="hidden md:flex w-64 border-r border-[#2E3A52] bg-[#161B22] flex-col fixed inset-y-0 left-0 z-50">
            <div className="p-6">
                <Link href="/dashboard" className="font-serif font-bold text-2xl tracking-tight text-white/90">Propshot</Link>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {/* Primary Navigation - Dashboard & Trade at top */}
                <NavItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" isActive={activePage === "Dashboard"} />
                <NavItem icon={History} label="Trade History" href="/dashboard/history" isActive={activePage === "Trade History"} />
                {/* Trade - Locked when no active challenge */}
                {hasActiveChallenge ? (
                    <NavItem
                        icon={TrendingUp}
                        label="Trade"
                        href="/dashboard/trade"
                        isActive={activePage === "Trade"}
                        glow={showTradeGlow}
                        onClick={() => setShowTradeGlow(false)}
                    />
                ) : (
                    <div className="px-4 py-3 flex items-center gap-3 text-zinc-600 cursor-not-allowed">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Trade (Locked)</span>
                    </div>
                )}

                {/* Secondary Navigation */}
                <div className="pt-3">
                    <NavItem icon={Users} label="Public Profile" href="/dashboard/public-profile" isActive={activePage === "Public Profile"} />
                    <NavItem icon={Award} label="Certificates" href="/dashboard/certificates" isActive={activePage === "Certificates"} />
                    <NavItem icon={ShoppingCart} label="Buy Evaluation" href="/buy-evaluation" highlight isActive={activePage === "Buy Evaluation"} />
                </div>

                {/* Settings & Support */}
                <div className="pt-3">
                    <NavItem icon={Settings} label="Settings" href="/dashboard/settings" isActive={activePage === "Settings"} />
                    <NavItem icon={Wallet} label="Payouts" href="/dashboard/payouts" isActive={activePage === "Payouts"} />
                    <NavItem icon={HelpCircle} label="FAQ" href="/dashboard/faq" isActive={activePage === "FAQ"} />
                    <NavItem icon={Trophy} label="Leaderboard" href="/dashboard/leaderboard" isActive={activePage === "Leaderboard"} />
                </div>
            </nav>

            <div className="p-4">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-4">
                    <Clock className="w-8 h-8 text-white/20 absolute -bottom-2 -right-2" />
                    <div className="relative z-10">
                        <p className="font-bold text-xs text-blue-100 uppercase mb-1">Support</p>
                        <Link href="/dashboard/faq" className="flex items-center gap-2 text-sm font-semibold hover:underline">
                            <MessageSquare className="w-4 h-4" /> Chat with us
                        </Link>
                    </div>
                </div>
            </div>
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
}

function NavItem({ icon: Icon, label, isActive, highlight, href = "#", className, glow, onClick }: NavItemProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`
                relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                ${isActive ? "bg-[#2E81FF]/10 text-[#2E81FF] border-l-2 border-[#2E81FF]" : "text-[#94A3B8] hover:text-white hover:bg-[#1A232E]"}
                ${highlight && !isActive ? "bg-[#2E81FF]/10 text-[#2E81FF] hover:bg-[#2E81FF]/20 border border-[#2E81FF]/20" : ""}
                ${glow ? "animate-pulse bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : ""}
                ${className || ""}
            `}
        >
            <Icon className={`w-4 h-4 ${highlight || isActive || glow ? "text-blue-400" : ""}`} />
            {label}
            {glow && (
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
            )}
        </Link>
    );
}
