"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldAlert, Users, Lock, BarChart3, Settings, LogOut, Rocket, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Risk Desk", href: "/admin/risk", icon: ShieldAlert },
    { name: "Traders", href: "/admin/traders", icon: Users },
    { name: "Security", href: "/admin/security", icon: Lock },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Growth", href: "/admin/growth", icon: Rocket },
    { name: "Docs", href: "/admin/docs", icon: BookOpen },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full bg-black/40 border-r border-white/5 backdrop-blur-xl w-64">
            <div className="p-6 border-b border-white/5">
                <Link href="/" className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <span className="font-bold text-indigo-500">M</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight text-white/90">Mission Control</span>
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-3">
                <nav className="space-y-1">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        // Active state logic: exact match for root, prefix match for subs
                        const isActive = item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname?.startsWith(item.href);

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                                    isActive
                                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]"
                                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <Icon className={cn("h-4 w-4", isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 border-t border-white/5 space-y-2">
                <Link
                    href="/admin/settings"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                    <Settings className="h-4 w-4 text-zinc-500" />
                    Settings
                </Link>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
