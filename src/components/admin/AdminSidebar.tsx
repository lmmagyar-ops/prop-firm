"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldAlert, Users, Lock, BarChart3, Settings, LogOut, Rocket, BookOpen, UserCog, Ticket, UsersRound, Menu, X, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

const navigation = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Risk Desk", href: "/admin/risk", icon: ShieldAlert },
    { name: "Users", href: "/admin/users", icon: UserCog },
    { name: "User Activity", href: "/admin/events", icon: Activity },
    { name: "Traders DNA", href: "/admin/traders", icon: Users },
    { name: "Security", href: "/admin/security", icon: Lock },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Docs", href: "/admin/docs", icon: BookOpen },
];

const growthNavigation = [
    { name: "Growth Hub", href: "/admin/growth", icon: Rocket },
    { name: "Discount Codes", href: "/admin/discounts", icon: Ticket },
    { name: "Affiliates", href: "/admin/affiliates", icon: UsersRound },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const NavItem = ({ item, onClick }: { item: { name: string, href: string, icon: any }, onClick?: () => void }) => {
        const Icon = item.icon;
        const isActive = item.href === "/admin"
            ? pathname === "/admin"
            : pathname?.startsWith(item.href);

        return (
            <Link
                href={item.href}
                className="relative group block"
                onClick={onClick}
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

    const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
        <>
            <div className="p-6 border-b border-white/5">
                <Link href="/" className="flex items-center gap-2 group" onClick={onItemClick}>
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
                        <NavItem key={item.name} item={item} onClick={onItemClick} />
                    ))}
                </nav>

                <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-3 mt-6">Growth & Marketing</div>
                <nav className="space-y-1">
                    {growthNavigation.map((item) => (
                        <NavItem key={item.name} item={item} onClick={onItemClick} />
                    ))}
                </nav>
            </div>

            <div className="p-4 border-t border-white/5">
                <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-3">System</div>
                <nav className="space-y-1">
                    <NavItem item={{ name: "Settings", href: "/admin/settings", icon: Settings }} onClick={onItemClick} />
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all group"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </nav>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Header with Hamburger */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 border-b border-white/5 backdrop-blur-xl">
                <div className="flex items-center justify-between px-4 py-3">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <span className="font-bold text-indigo-500">M</span>
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white/90">Mission Control</span>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="h-10 w-10 p-0"
                    >
                        {mobileOpen ? (
                            <X className="h-5 w-5 text-zinc-400" />
                        ) : (
                            <Menu className="h-5 w-5 text-zinc-400" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                        />
                        {/* Drawer */}
                        <motion.div
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-zinc-950 border-r border-white/5 flex flex-col"
                        >
                            <SidebarContent onItemClick={() => setMobileOpen(false)} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex flex-col h-full bg-zinc-950/80 border-r border-white/5 backdrop-blur-xl w-64">
                <SidebarContent />
            </div>
        </>
    );
}
