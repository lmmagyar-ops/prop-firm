"use client";

import { Home, LineChart, Wallet, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function MobileNav() {
    const [active, setActive] = useState("Home");

    const items = [
        { icon: Home, label: "Home" },
        { icon: LineChart, label: "Markets" },
        { icon: Wallet, label: "Portfolio" },
        { icon: User, label: "Account" },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-zinc-950/90 backdrop-blur-xl border-t border-white/5 pb-6 pt-3 px-6 md:hidden">
            <div className="flex justify-between items-center">
                {items.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => setActive(item.label)}
                        className={cn(
                            "flex flex-col items-center gap-1 transition-colors duration-200",
                            active === item.label ? "text-green-500" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <item.icon className={cn("w-6 h-6", active === item.label && "fill-current/20")} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
