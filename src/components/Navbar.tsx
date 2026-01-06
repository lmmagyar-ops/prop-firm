"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { useSession } from "next-auth/react";

export function Navbar() {
    const { status } = useSession();
    const isAuthenticated = status === "authenticated";

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 w-full border-b border-[var(--vapi-border)] bg-black/80 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-[var(--vapi-mint)]/10 flex items-center justify-center border border-[var(--vapi-mint)]/20">
                        <BarChart3 className="w-4 h-4 text-[var(--vapi-mint)]" />
                    </div>
                    <span className="font-bold text-lg text-white group-hover:text-[var(--vapi-mint)] transition-colors">
                        Project X
                    </span>
                </Link>

                {/* Nav Links - Monospace Style */}
                <div className="hidden md:flex items-center gap-6">
                    {["FAQ", "Learn", "About Us", "Affiliates", "Blog", "Contact"].map((item) => (
                        <Link
                            key={item}
                            href="#"
                            className="mono-label text-[var(--vapi-gray-text)] hover:text-white transition-colors"
                        >
                            {item}
                        </Link>
                    ))}
                </div>

                {/* Actions - Auth Aware */}
                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        // Logged in - show Dashboard
                        <Link
                            href="/dashboard"
                            className="pill-btn pill-btn-mint text-sm px-5 py-2.5"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        // Not logged in - show Log In + Sign Up
                        <>
                            <Link
                                href="/login"
                                className="hidden md:block mono-label text-[var(--vapi-gray-text)] hover:text-white transition-colors"
                            >
                                Log In
                            </Link>
                            <Link
                                href="/signup"
                                className="pill-btn pill-btn-mint text-sm px-5 py-2.5"
                            >
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
