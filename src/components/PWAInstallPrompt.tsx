"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";

/**
 * PWAInstallPrompt - Prompts mobile users to add app to home screen
 * 
 * Anthropic Engineering Standards:
 * - Detects PWA installability via beforeinstallprompt
 * - iOS Safari specific instructions
 * - Dismissable with localStorage persistence
 * - Non-intrusive timing (after 30s on page)
 */

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed or dismissed
        if (localStorage.getItem("pwaPromptDismissed") === "true") {
            return;
        }

        // Detect iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(iOS);

        // Detect if on mobile device (not desktop)
        // Require BOTH small screen AND mobile UA to prevent false positives on desktop
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isSmallScreen = window.innerWidth < 768;
        const isMobile = isMobileUA && isSmallScreen;

        // Only show on mobile devices
        if (!isMobile) {
            return;
        }

        // Detect if running as standalone (already installed)
        const standalone = window.matchMedia("(display-mode: standalone)").matches;
        setIsStandalone(standalone);

        if (standalone) return;

        // Listen for installability event (Android/Chrome)
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstall);

        // Show prompt after 30 seconds on page
        const timer = setTimeout(() => {
            if (iOS || deferredPrompt) {
                setIsVisible(true);
            }
        }, 30000);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
            clearTimeout(timer);
        };
    }, [deferredPrompt]);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setIsVisible(false);
                setDeferredPrompt(null);
            }
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem("pwaPromptDismissed", "true");
    };

    if (isStandalone) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80"
                >
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
                        <button
                            onClick={handleDismiss}
                            className="absolute top-3 right-3 p-1 text-zinc-500 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-[#29af73]/20 rounded-xl flex items-center justify-center">
                                <Smartphone className="w-6 h-6 text-[#29af73]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-white mb-1">
                                    Add Propshot to Home Screen
                                </h3>
                                <p className="text-xs text-zinc-400 mb-3">
                                    {isIOS
                                        ? "Tap the share button, then 'Add to Home Screen'"
                                        : "Get quick access and a native app experience"
                                    }
                                </p>

                                {!isIOS && deferredPrompt && (
                                    <button
                                        onClick={handleInstall}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#29af73] text-white text-sm font-semibold rounded-lg hover:bg-[#29af73]/90 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Install App
                                    </button>
                                )}

                                {isIOS && (
                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                        <span>Tap</span>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z" />
                                        </svg>
                                        <span>then &quot;Add to Home Screen&quot;</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
