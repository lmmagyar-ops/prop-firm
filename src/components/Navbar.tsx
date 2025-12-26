"use client";

import Link from "next/link";
import { BarChart3, ChevronDown, Rocket } from "lucide-react";

export function Navbar() {
    return (
        <nav className="absolute top-0 left-0 right-0 z-50 w-full border-b border-[#2E3A52] bg-[#0E1217]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

                {/* 1. Logo: Cleaner, less "Startuppy" */}
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                        <BarChart3 className="relative w-6 h-6 text-green-500" />
                    </div>
                    <span className="font-serif font-bold text-xl tracking-tight text-white group-hover:text-green-400 transition-colors">
                        Project X
                    </span>
                </div>

                {/* 2. Menu: Centered */}
                <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
                    {["How To Start", "Trading Rules", "FAQ", "About"].map((item) => (
                        <Link
                            key={item}
                            href="#"
                            className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors"
                        >
                            {item}
                        </Link>
                    ))}
                    <button className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors">
                        More <ChevronDown className="w-3 h-3" />
                    </button>
                </div>

                {/* 3. Actions: Minimalist Login + High Contrast Dashboard */}
                <div className="flex items-center gap-3 md:gap-6">
                    <Link href="/login" className="hidden md:block text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                        Log In
                    </Link>
                    <Link href="/signup" className="group relative px-4 py-2 md:px-6 md:py-2.5 bg-white text-black text-[10px] md:text-xs font-black uppercase tracking-wider rounded-lg overflow-hidden hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative z-10">
                            Sign Up
                        </span>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
