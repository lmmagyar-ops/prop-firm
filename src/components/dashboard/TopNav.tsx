"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TopNavActions } from "./TopNavActions";
import { useSession } from "next-auth/react";

export function TopNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userId = session?.user?.id || "demo-user-1";

    return (
        <header className="sticky top-0 z-50 w-full border-b border-[#2E3A52] bg-[#0E1217]/80 backdrop-blur-md">
            <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">

                {/* Left: Mobile Logo & New Evaluation */}
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/trade" className="flex items-center gap-2 md:hidden">
                        <div className="w-8 h-8 bg-[#2E81FF] rounded-lg flex items-center justify-center text-white font-bold">
                            X
                        </div>
                    </Link>

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
    );
}

