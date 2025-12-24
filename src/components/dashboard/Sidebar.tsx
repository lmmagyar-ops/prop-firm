"use client";

import Link from "next/link";
import {
    LayoutDashboard,
    User,
    Users,
    Award,
    ShoppingCart,
    Settings,
    Wallet,
    HelpCircle,
    Trophy,
    MessageSquare,
    Clock,
    TrendingUp,
    Shield,
    ShieldCheck,
    Lock
} from "lucide-react";

interface SidebarProps {
    active?: string;
    verificationStatus?: "locked" | "pending" | "verified";
}

export function Sidebar({ active = "Dashboard", verificationStatus = "locked" }: SidebarProps) {
    return (
        <aside className="w-64 border-r border-[#2E3A52] bg-[#161B22] flex flex-col fixed inset-y-0 left-0 z-50">
            <div className="p-6">
                <Link href="/dashboard" className="font-serif font-bold text-2xl tracking-tight text-white/90">Project X</Link>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                <NavItem icon={User} label="Private Profile" href="/dashboard/private-profile" isActive={active === "Private Profile"} />
                <NavItem icon={Users} label="Public Profile" href="/dashboard/public-profile" isActive={active === "Public Profile"} />
                <NavItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" isActive={active === "Dashboard"} />
                <NavItem icon={TrendingUp} label="Trade" href="/dashboard/trade" isActive={active === "Trade"} />
                <NavItem icon={Award} label="Certificates" href="/dashboard/certificates" isActive={active === "Certificates"} />
                <NavItem icon={ShoppingCart} label="Buy Evaluation" href="/buy-evaluation" highlight isActive={active === "Buy Evaluation"} />

                {/* Verification Item */}
                <div className="pt-2 pb-2">
                    {verificationStatus === "verified" ? (
                        <NavItem icon={ShieldCheck} label="Identity Verified" href="/dashboard/verification" isActive={active === "Verification"} className="text-green-500" />
                    ) : verificationStatus === "pending" ? (
                        <NavItem icon={Shield} label="Verify Identity" href="/dashboard/verification" isActive={active === "Verification"} className="text-yellow-500 animate-pulse" />
                    ) : (
                        <div className="px-4 py-3 flex items-center gap-3 text-zinc-600 cursor-not-allowed">
                            <Lock className="w-4 h-4" />
                            <span className="text-sm font-medium">Verification (Locked)</span>
                        </div>
                    )}
                </div>

                <NavItem icon={Settings} label="Settings" href="/dashboard/settings" isActive={active === "Settings"} />
                <NavItem icon={Wallet} label="Payouts" href="/dashboard/payouts" isActive={active === "Payouts"} />
                <NavItem icon={HelpCircle} label="FAQ" href="/dashboard/faq" isActive={active === "FAQ"} />
                <NavItem icon={Trophy} label="Leaderboard" href="/dashboard/leaderboard" isActive={active === "Leaderboard"} />
            </nav>

            <div className="p-4">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-4">
                    <Clock className="w-8 h-8 text-white/20 absolute -bottom-2 -right-2" />
                    <div className="relative z-10">
                        <p className="font-bold text-xs text-blue-100 uppercase mb-1">Support</p>
                        <Link href="#" className="flex items-center gap-2 text-sm font-semibold hover:underline">
                            <MessageSquare className="w-4 h-4" /> Chat with us
                        </Link>
                    </div>
                </div>
            </div>
        </aside>
    );
}

function NavItem({ icon: Icon, label, isActive, highlight, href = "#", className }: any) {
    return (
        <Link
            href={href}
            className={`
                flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                ${isActive ? "bg-[#2E81FF]/10 text-[#2E81FF] border-l-2 border-[#2E81FF]" : "text-[#94A3B8] hover:text-white hover:bg-[#1A232E]"}
                ${highlight && !isActive ? "bg-[#2E81FF]/10 text-[#2E81FF] hover:bg-[#2E81FF]/20 border border-[#2E81FF]/20" : ""}
                ${className || ""}
            `}
        >
            <Icon className={`w-4 h-4 ${highlight || isActive ? "text-blue-400" : ""}`} />
            {label}
        </Link>
    );
}
