"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldAlert, Users, Lock, BarChart3, Settings, LogOut, Rocket, BookOpen, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";

const navigation = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Risk Desk", href: "/admin/risk", icon: ShieldAlert },
    { name: "Users", href: "/admin/users", icon: UserCog },
    { name: "Traders DNA", href: "/admin/traders", icon: Users },
    { name: "Security", href: "/admin/security", icon: Lock },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Growth", href: "/admin/growth", icon: Rocket },
    { name: "Docs", href: "/admin/docs", icon: BookOpen },
];

export function AdminSidebar() {
    const pathname = usePathname();

    const NavItem = ({ item, isBottom = false }: { item: { name: string, href: string, icon: any }, isBottom?: boolean }) => {
        const Icon = item.icon;
        const isActive = item.href === "/admin"
            ? pathname === "/admin"
            : pathname?.startsWith(item.href);

        return (
            <Link
                href={item.href}
                className="relative group block"
            >
                {isActive && (
                    <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-indigo-500/10 border-r-2 border-indigo-500 rounded-l-lg ml-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                )}
                <div className={cn(
                    "relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200",
                    isActive
                        ? "text-indigo-400"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                )}>
                    <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                    {item.name}
                </div>
            </Link>
        );
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950/80 border-r border-white/5 backdrop-blur-xl w-64">
            <div className="p-6 border-b border-white/5">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                        <span className="font-bold text-indigo-500">M</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight text-white/90 group-hover:text-white transition-colors">Mission Control</span>
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-3">
                <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-3">Platform</div>
                <nav className="space-y-1">
                    {navigation.map((item) => (
                        <NavItem key={item.name} item={item} />
                    ))}
                </nav>
            </div>

            <div className="p-4 border-t border-white/5">
                <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-3">System</div>
                <nav className="space-y-1">
                    <NavItem item={{ name: "Settings", href: "/admin/settings", icon: Settings }} />
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all group"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </nav>
            </div>
        </div>
    );
}
