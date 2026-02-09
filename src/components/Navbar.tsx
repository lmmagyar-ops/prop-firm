"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DecryptedText from "@/components/reactbits/DecryptedText";
import ShinyText from "@/components/reactbits/ShinyText";

/* ─── Announcement Bar Config ─────────────────────────────── */
interface Announcement {
    id: string;
    text: string;
    ctaText?: string;
    ctaHref?: string;
    /** ISO date string for countdown timer — omit for no timer */
    expiresAt?: string;
}

const ANNOUNCEMENTS: Announcement[] = [
    {
        id: "launch-2026",
        text: "World's First Prediction Market Prop Firm",
        ctaText: "Get Funded →",
        ctaHref: "/buy-evaluation",
    },
];

/* ─── Nav Link Config ─────────────────────────────────────── */
interface NavItem {
    label: string;
    href: string;
    isNew?: boolean;
    isLive?: boolean;
}

const NAV_LINKS: NavItem[] = [
    { label: "How It Works", href: "/how-it-works" },
    { label: "FAQ", href: "/faq" },
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
] as const;

/* ─── Countdown Hook ──────────────────────────────────────── */
function useCountdown(expiresAt?: string) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        if (!expiresAt) return;
        const target = new Date(expiresAt).getTime();

        const tick = () => {
            const diff = target - Date.now();
            if (diff <= 0) { setTimeLeft("Expired"); return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setTimeLeft(`${d}d ${h}h ${m}m`);
        };

        tick();
        const interval = setInterval(tick, 60000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    return timeLeft;
}

/* ─── Announcement Bar ────────────────────────────────────── */
function AnnouncementBar({ announcement, onDismiss }: { announcement: Announcement; onDismiss: () => void }) {
    const countdown = useCountdown(announcement.expiresAt);

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative overflow-hidden"
        >
            <div className="bg-gradient-to-r from-emerald-950/80 via-emerald-900/50 to-black border-b border-emerald-500/10">
                <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-center gap-3 text-sm">
                    <span className="text-emerald-300/80 font-medium tracking-wide">
                        {announcement.text}
                    </span>

                    {countdown && (
                        <span className="text-emerald-400 font-mono text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            {countdown}
                        </span>
                    )}

                    {announcement.ctaText && announcement.ctaHref && (
                        <Link
                            href={announcement.ctaHref}
                            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors group"
                        >
                            {announcement.ctaText}
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    )}

                    <button
                        onClick={onDismiss}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500/40 hover:text-emerald-300 transition-colors p-1"
                        aria-label="Dismiss announcement"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

/* ─── Live Dot Indicator ──────────────────────────────────── */
function LiveDot() {
    return (
        <span className="relative flex h-2 w-2 ml-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
    );
}

/* ─── NEW Badge ───────────────────────────────────────────── */
function NewBadge() {
    return (
        <span className="ml-1.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none">
            New
        </span>
    );
}

/* ─── Nav Link Component ──────────────────────────────────── */
function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Link
            href={item.href}
            className="relative flex items-center gap-0.5 py-1 group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Hover background pill */}
            <AnimatePresence>
                {isHovered && (
                    <motion.span
                        layoutId="nav-hover-pill"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 -mx-2.5 -my-1 bg-white/[0.04] rounded-lg"
                    />
                )}
            </AnimatePresence>

            {/* DecryptedText on hover, plain text otherwise */}
            <span className="relative z-10">
                {isHovered ? (
                    <DecryptedText
                        text={item.label}
                        speed={30}
                        maxIterations={6}
                        sequential
                        revealDirection="start"
                        className="mono-label text-white"
                        encryptedClassName="mono-label text-emerald-400/60"
                        animateOn="hover"
                    />
                ) : (
                    <span className={`mono-label transition-colors duration-200 ${isActive ? "text-white" : "text-[var(--vapi-gray-text)]"
                        }`}>
                        {item.label}
                    </span>
                )}
            </span>

            {/* Indicators */}
            {item.isLive && <LiveDot />}
            {item.isNew && <NewBadge />}

            {/* Active route underline */}
            {isActive && (
                <motion.span
                    layoutId="nav-active-underline"
                    className="absolute -bottom-1 left-0 right-0 h-[2px] bg-emerald-500 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
            )}
        </Link>
    );
}

/* ─── Main Navbar ─────────────────────────────────────────── */
export function Navbar() {
    const { status } = useSession();
    const pathname = usePathname();
    const isAuthenticated = status === "authenticated";
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [announcementDismissed, setAnnouncementDismissed] = useState(false);
    const navRef = useRef<HTMLElement>(null);

    // Check localStorage for dismissed state
    useEffect(() => {
        const dismissedId = localStorage.getItem("announcement-dismissed");
        if (dismissedId === ANNOUNCEMENTS[0]?.id) {
            setAnnouncementDismissed(true);
        }
    }, []);

    // Scroll detection for adaptive glassmorphism
    useEffect(() => {
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    setScrolled(window.scrollY > 30);
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const dismissAnnouncement = useCallback(() => {
        setAnnouncementDismissed(true);
        if (ANNOUNCEMENTS[0]) {
            localStorage.setItem("announcement-dismissed", ANNOUNCEMENTS[0].id);
        }
    }, []);

    const showAnnouncement = !announcementDismissed && ANNOUNCEMENTS.length > 0;
    const currentAnnouncement = ANNOUNCEMENTS[0];

    return (
        <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 w-full">
            {/* ── Announcement Bar ── */}
            <AnimatePresence>
                {showAnnouncement && currentAnnouncement && (
                    <AnnouncementBar
                        announcement={currentAnnouncement}
                        onDismiss={dismissAnnouncement}
                    />
                )}
            </AnimatePresence>

            {/* ── Main Nav ── */}
            <div
                className={`transition-all duration-500 ease-out ${scrolled
                    ? "bg-black/90 backdrop-blur-[60px] border-b border-emerald-500/[0.12] shadow-[0_4px_30px_-10px_rgba(41,175,115,0.08)]"
                    : "bg-black/80 backdrop-blur-md border-b border-white/[0.04]"
                    }`}
            >
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

                    {/* Logo */}
                    <Link href="/" className="flex items-center group cursor-pointer">
                        <Image
                            src="/logo-wordmark-white.png"
                            alt="Predictions Firm"
                            width={180}
                            height={32}
                            className="h-8 w-auto group-hover:opacity-80 transition-opacity duration-300"
                            priority
                        />
                    </Link>

                    {/* Desktop Nav Links */}
                    <div className="hidden md:flex items-center gap-5">
                        {NAV_LINKS.map((item) => (
                            <NavLink
                                key={item.label}
                                item={item}
                                isActive={pathname === item.href}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        {isAuthenticated ? (
                            <Link
                                href="/dashboard"
                                className="pill-btn pill-btn-mint text-sm px-5 py-2.5 relative overflow-hidden group"
                            >
                                <ShinyText
                                    text="Dashboard"
                                    color="#000000"
                                    shineColor="rgba(255,255,255,0.4)"
                                    speed={3}
                                    className="text-sm font-bold"
                                />
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="hidden md:block mono-label text-[var(--vapi-gray-text)] hover:text-white transition-colors duration-200"
                                >
                                    Log In
                                </Link>
                                <Link
                                    href="/signup"
                                    className="pill-btn pill-btn-mint text-sm px-5 py-2.5 relative overflow-hidden group shadow-[0_0_20px_-5px_rgba(41,175,115,0.25)] hover:shadow-[0_0_30px_-5px_rgba(41,175,115,0.4)] transition-shadow duration-300"
                                >
                                    <ShinyText
                                        text="Get Funded"
                                        color="#000000"
                                        shineColor="rgba(255,255,255,0.5)"
                                        speed={2.5}
                                        className="text-sm font-bold"
                                    />
                                </Link>
                            </>
                        )}

                        {/* Mobile Hamburger */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden p-2 text-[var(--vapi-gray-text)] hover:text-white transition-colors"
                            aria-label="Toggle menu"
                        >
                            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Mobile Menu ── */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="md:hidden fixed inset-0 top-16 bg-black/95 backdrop-blur-xl z-40"
                    >
                        <div className="px-8 py-6 space-y-1">
                            {/* Announcement echo in mobile */}
                            {showAnnouncement && currentAnnouncement && (
                                <div className="mb-6 pb-6 border-b border-emerald-500/10">
                                    <p className="text-emerald-400/80 text-sm font-medium">
                                        {currentAnnouncement.text}
                                    </p>
                                    {currentAnnouncement.ctaText && currentAnnouncement.ctaHref && (
                                        <Link
                                            href={currentAnnouncement.ctaHref}
                                            onClick={() => setMobileOpen(false)}
                                            className="inline-flex items-center gap-1 mt-2 text-emerald-400 font-semibold text-sm"
                                        >
                                            {currentAnnouncement.ctaText}
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Link>
                                    )}
                                </div>
                            )}

                            {NAV_LINKS.map((item, i) => (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.06, duration: 0.3 }}
                                >
                                    <Link
                                        href={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center py-4 text-lg font-medium tracking-wide transition-colors ${pathname === item.href
                                            ? "text-white"
                                            : "text-[var(--vapi-gray-text)] hover:text-white"
                                            }`}
                                    >
                                        {item.label}
                                        {item.isLive && <LiveDot />}
                                        {item.isNew && <NewBadge />}
                                        {pathname === item.href && (
                                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        )}
                                    </Link>
                                </motion.div>
                            ))}

                            {!isAuthenticated && (
                                <motion.div
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: NAV_LINKS.length * 0.06, duration: 0.3 }}
                                >
                                    <Link
                                        href="/login"
                                        onClick={() => setMobileOpen(false)}
                                        className="block py-4 text-lg font-medium text-[var(--vapi-gray-text)] hover:text-white transition-colors tracking-wide"
                                    >
                                        Log In
                                    </Link>
                                </motion.div>
                            )}

                            {/* Mobile CTA */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: (NAV_LINKS.length + 1) * 0.06, duration: 0.4 }}
                                className="pt-4"
                            >
                                <Link
                                    href={isAuthenticated ? "/dashboard" : "/signup"}
                                    onClick={() => setMobileOpen(false)}
                                    className="block w-full text-center pill-btn pill-btn-mint text-base py-3.5 shadow-[0_0_20px_-5px_rgba(41,175,115,0.3)]"
                                >
                                    {isAuthenticated ? "Dashboard" : "Get Funded"}
                                </Link>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
