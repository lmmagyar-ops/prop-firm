"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TopNavActions } from "./TopNavActions";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

interface TopNavProps {
    userId: string;
}

export function TopNav({ userId }: TopNavProps) {
    const pathname = usePathname();
    const [isMac, setIsMac] = useState(true);

    useEffect(() => {
        setIsMac(
            typeof navigator !== "undefined" &&
            (navigator.platform?.toLowerCase().includes("mac") ||
                navigator.userAgent?.toLowerCase().includes("mac"))
        );
    }, []);

    const openSearch = useCallback(() => {
        // Dispatch ⌘K / Ctrl+K to trigger the existing SearchModal listener
        document.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
            })
        );
    }, []);

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-[#2E3A52] bg-[#0E1217]/80 backdrop-blur-md">
                <div className="max-w-[1800px] mx-auto px-3 md:px-6 h-14 md:h-16 flex items-center justify-between">

                    {/* Left: Mobile only — Logo, Navigation, New Evaluation (sidebar covers desktop) */}
                    <div className="flex md:hidden items-center gap-2">
                        <Link href="/dashboard/trade" className="flex items-center gap-2">
                            <img src="/icon.png" alt="Predictions Firm" className="w-8 h-8 rounded-lg" />
                        </Link>

                        <nav className="flex items-center gap-1">
                            <Link href="/dashboard">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "h-8 px-3 text-sm font-medium",
                                        pathname === "/dashboard"
                                            ? "bg-[#1E293B] text-white"
                                            : "text-zinc-400 hover:text-white hover:bg-[#1E293B]"
                                    )}
                                >
                                    Dashboard
                                </Button>
                            </Link>
                            <Link href="/dashboard/trade">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "h-8 px-3 text-sm font-medium",
                                        pathname === "/dashboard/trade"
                                            ? "bg-[#1E293B] text-white"
                                            : "text-zinc-400 hover:text-white hover:bg-[#1E293B]"
                                    )}
                                >
                                    Trade
                                </Button>
                            </Link>
                        </nav>

                        <Link href="/buy-evaluation">
                            <Button className="bg-[#29af73] hover:bg-[#1e8a5a] text-white font-bold h-8 px-3 text-sm shadow-lg shadow-green-900/20">
                                New Evaluation
                            </Button>
                        </Link>
                    </div>

                    {/* Center: Search trigger (desktop only) */}
                    <button
                        onClick={openSearch}
                        className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-zinc-800/40 hover:bg-zinc-800/70 border border-white/[0.06] hover:border-white/[0.12] rounded-lg text-sm text-zinc-500 transition-all cursor-text w-72"
                    >
                        <Search className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-left">Search markets...</span>
                        <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-700/50 rounded text-[11px] text-zinc-500">
                            {isMac ? "⌘" : "Ctrl+"}K
                        </kbd>
                    </button>

                    {/* Right: Challenge Selector + Portfolio + User */}
                    <div className="flex-1 md:flex-none flex items-center justify-end gap-2 md:gap-4">
                        <TopNavActions userId={userId} />
                    </div>
                </div>
            </header>

            {/* PWA Install Prompt - shows on mobile after 30s */}
            <PWAInstallPrompt />
        </>
    );
}
