"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TopNavActions } from "./TopNavActions";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

interface TopNavProps {
    userId: string;
}

export function TopNav({ userId }: TopNavProps) {
    const pathname = usePathname();

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-[#2E3A52] bg-[#0E1217]/80 backdrop-blur-md">
                <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">

                    {/* Left: Mobile Logo & Navigation */}
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/trade" className="flex items-center gap-2 md:hidden">
                            <div className="w-8 h-8 bg-[#2E81FF] rounded-lg flex items-center justify-center text-white font-bold">
                                X
                            </div>
                        </Link>

                        {/* Primary Navigation Links */}
                        <nav className="hidden md:flex items-center gap-1">
                            <Link href="/dashboard">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "h-9 px-4 font-medium",
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
                                        "h-9 px-4 font-medium",
                                        pathname === "/dashboard/trade"
                                            ? "bg-[#1E293B] text-white"
                                            : "text-zinc-400 hover:text-white hover:bg-[#1E293B]"
                                    )}
                                >
                                    Trade
                                </Button>
                            </Link>
                        </nav>

                        {/* New Evaluation Button */}
                        <Link href="/buy-evaluation">
                            <Button className="bg-[#2E81FF] hover:bg-[#256ACC] text-white font-bold h-9 px-4 shadow-lg shadow-blue-900/20">
                                New Evaluation
                            </Button>
                        </Link>
                    </div>

                    {/* Right: Challenge Selector + Portfolio + User */}
                    <div className="flex-1 flex items-center justify-end gap-4">
                        <TopNavActions userId={userId} />
                    </div>
                </div>
            </header>

            {/* PWA Install Prompt - shows on mobile after 30s */}
            <PWAInstallPrompt />
        </>
    );
}
