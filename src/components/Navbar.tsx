"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { BarChart3, ChevronDown, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { data: session, status } = useSession();
    const isLoggedIn = !!session?.user;

    const navLinks = [
        { label: "How To Start", href: "#" },
        { label: "Trading Rules", href: "#" },
        { label: "FAQ", href: "#" },
        { label: "About", href: "#" },
    ];

    return (
        <>
            <nav className="absolute top-0 left-0 right-0 z-50 w-full border-b border-[#2E3A52] bg-[#0E1217]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center">

                    {/* Left: Logo (flex-1 for equal width distribution) */}
                    <div className="flex flex-1 justify-start">
                        <div className="flex items-center gap-2 md:gap-3 group cursor-pointer">
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                                <BarChart3 className="relative w-5 h-5 md:w-6 md:h-6 text-green-500" />
                            </div>
                            <span className="font-serif font-bold text-lg md:text-xl tracking-tight text-white group-hover:text-green-400 transition-colors">
                                Project X
                            </span>
                        </div>
                    </div>

                    {/* Center: Menu - Desktop Only (flex-1 for true centering) */}
                    <div className="hidden md:flex flex-1 items-center justify-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors leading-none"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <button className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors leading-none">
                            More <ChevronDown className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Right: Actions (flex-1 for equal width distribution) */}
                    <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
                        {/* Desktop: Conditional rendering based on auth status */}
                        <div className="hidden md:flex items-center gap-4">
                            {!isLoggedIn ? (
                                <>
                                    <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                                        Log In
                                    </Link>
                                    <Link href="/signup" className="group relative inline-flex items-center justify-center px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-wider rounded-lg overflow-hidden hover:scale-105 active:scale-95 transition-all whitespace-nowrap leading-none">
                                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        <span className="relative z-10 optical-center-heavy">
                                            Sign Up
                                        </span>
                                    </Link>
                                </>
                            ) : (
                                <Link
                                    href="/dashboard"
                                    className="group relative inline-flex items-center justify-center px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-wider rounded-lg overflow-hidden hover:scale-105 active:scale-95 transition-all whitespace-nowrap leading-none"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <span className="relative z-10 optical-center-heavy flex items-center gap-2">
                                        Go to Dashboard
                                        <ChevronDown className="w-3 h-3 -rotate-90" />
                                    </span>
                                </Link>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-[#0E1217] border-l border-[#2E3A52] md:hidden"
                    >
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-[#2E3A52]">
                                <span className="font-serif font-bold text-xl text-white">Menu</span>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Nav Links */}
                            <nav className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-1">
                                    {navLinks.map((link) => (
                                        <Link
                                            key={link.label}
                                            href={link.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block px-4 py-3 text-base font-bold text-zinc-400 hover:text-white hover:bg-[#1A232E] rounded-lg transition-all"
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                    <button className="w-full text-left px-4 py-3 text-base font-bold text-zinc-400 hover:text-white hover:bg-[#1A232E] rounded-lg transition-all flex items-center justify-between">
                                        More <ChevronDown className="w-4 h-4" />
                                    </button>
                                </div>
                            </nav>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-[#2E3A52] space-y-3">
                                <Link
                                    href="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block w-full text-center px-6 py-3 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white border border-[#2E3A52] rounded-lg transition-colors"
                                >
                                    Log In
                                </Link>
                                <Link
                                    href="/signup"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block w-full text-center px-6 py-3 bg-white text-black text-sm font-black uppercase tracking-wider rounded-lg hover:scale-105 active:scale-95 transition-all"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backdrop */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileMenuOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>
        </>
    );
}
