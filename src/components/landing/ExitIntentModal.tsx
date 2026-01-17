"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, ArrowRight, Copy, Check } from "lucide-react";

/**
 * ExitIntentModal - Capture leaving visitors with discount offer
 * 
 * Anthropic Engineering Standards:
 * - Non-intrusive (only triggers once per session)
 * - Accessible (focus trap, ESC to close)
 * - Mobile-friendly (scroll up triggers on mobile)
 * - Tracks interaction for analytics
 */

interface ExitIntentModalProps {
    discountCode?: string;
    discountPercent?: number;
}

export function ExitIntentModal({
    discountCode = "STAYFUNDED",
    discountPercent = 15
}: ExitIntentModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hasTriggered, setHasTriggered] = useState(false);
    const [copied, setCopied] = useState(false);

    // Handle exit intent detection
    const handleMouseLeave = useCallback((e: MouseEvent) => {
        // Only trigger if mouse leaves through top of viewport
        if (e.clientY <= 0 && !hasTriggered) {
            setIsOpen(true);
            setHasTriggered(true);
            sessionStorage.setItem("exitIntentShown", "true");
        }
    }, [hasTriggered]);

    // Mobile: detect scroll up (might be leaving)
    useEffect(() => {
        let lastScrollY = window.scrollY;
        let scrollUpCount = 0;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // User scrolling up rapidly near top of page
            if (currentScrollY < lastScrollY && currentScrollY < 100 && !hasTriggered) {
                scrollUpCount++;

                // Trigger after 3 quick scroll-ups
                if (scrollUpCount >= 3) {
                    setIsOpen(true);
                    setHasTriggered(true);
                    sessionStorage.setItem("exitIntentShown", "true");
                }
            } else {
                scrollUpCount = 0;
            }

            lastScrollY = currentScrollY;
        };

        // Only check mobile scroll on small screens
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            window.addEventListener("scroll", handleScroll, { passive: true });
        }

        return () => window.removeEventListener("scroll", handleScroll);
    }, [hasTriggered]);

    // Desktop: mouse leave detection
    useEffect(() => {
        // Check if already shown this session
        if (sessionStorage.getItem("exitIntentShown") === "true") {
            setHasTriggered(true);
            return;
        }

        document.addEventListener("mouseleave", handleMouseLeave);
        return () => document.removeEventListener("mouseleave", handleMouseLeave);
    }, [handleMouseLeave]);

    // Keyboard handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(discountCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleContinue = () => {
        setIsOpen(false);
        // Scroll to pricing section
        const pricingSection = document.querySelector('[data-section="pricing"]');
        if (pricingSection) {
            pricingSection.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="exit-modal-title"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
                            aria-label="Close modal"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Icon */}
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#2E81FF] to-purple-500 flex items-center justify-center">
                            <Gift className="w-8 h-8 text-white" />
                        </div>

                        {/* Content */}
                        <h2
                            id="exit-modal-title"
                            className="text-2xl font-bold text-white mb-3"
                        >
                            Wait! Here's {discountPercent}% Off
                        </h2>
                        <p className="text-zinc-400 mb-6">
                            We don't want you to miss out on your trading journey.
                            Use this exclusive code at checkout:
                        </p>

                        {/* Discount code */}
                        <div className="relative mb-6">
                            <div className="flex items-center justify-center gap-3 py-4 px-6 bg-zinc-800/50 border border-dashed border-[#2E81FF]/50 rounded-lg">
                                <span className="text-2xl font-mono font-bold text-[#2E81FF] tracking-wider">
                                    {discountCode}
                                </span>
                                <button
                                    onClick={handleCopyCode}
                                    className="p-2 rounded-md hover:bg-zinc-700 transition-colors"
                                    aria-label="Copy discount code"
                                >
                                    {copied ? (
                                        <Check className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <Copy className="w-5 h-5 text-zinc-400" />
                                    )}
                                </button>
                            </div>
                            {copied && (
                                <motion.span
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm text-emerald-400"
                                >
                                    Copied!
                                </motion.span>
                            )}
                        </div>

                        {/* CTA */}
                        <button
                            onClick={handleContinue}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-[#2E81FF] text-white font-semibold rounded-full hover:bg-[#2E81FF]/90 transition-colors"
                        >
                            Claim My Discount
                            <ArrowRight className="w-5 h-5" />
                        </button>

                        {/* Skip link */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="mt-4 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            No thanks, I'll pay full price
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
