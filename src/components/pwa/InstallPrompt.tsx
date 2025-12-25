"use client";

import { useState, useEffect } from "react";
import { usePWA } from "@/hooks/usePWA";
import { X, Download, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function InstallPrompt() {
    const { isInstallable, isInstalled, isIOS, promptInstall } = usePWA();
    const [isDismissed, setIsDismissed] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // Check if user has previously dismissed the prompt
        const dismissed = localStorage.getItem("pwa-install-dismissed");
        if (dismissed) {
            setIsDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsDismissed(true);
        localStorage.setItem("pwa-install-dismissed", "true");
    };

    const handleInstall = async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }

        const installed = await promptInstall();
        if (installed) {
            handleDismiss();
        }
    };

    // Don't show if already installed, dismissed, or not installable
    if (isInstalled || isDismissed || (!isInstallable && !isIOS)) {
        return null;
    }

    return (
        <AnimatePresence>
            {!showIOSInstructions ? (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
                >
                    <div className="bg-[#1A232E]/95 backdrop-blur-xl border border-[#2E3A52] rounded-2xl p-4 shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-[#2E3A52]">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#2E81FF] to-cyan-500 rounded-xl flex items-center justify-center">
                                <Download className="w-6 h-6 text-white" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold text-base mb-1">
                                    Install App
                                </h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    Add to your home screen for quick access and offline support.
                                </p>

                                <button
                                    onClick={handleInstall}
                                    className="mt-3 w-full bg-[#2E81FF] hover:bg-[#1a5acc] text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_-5px_rgba(46,129,255,0.6)]"
                                >
                                    {isIOS ? "View Instructions" : "Install Now"}
                                </button>
                            </div>

                            <button
                                onClick={handleDismiss}
                                className="flex-shrink-0 text-zinc-500 hover:text-white transition-colors p-1"
                                aria-label="Dismiss"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
                >
                    <div className="bg-[#1A232E]/95 backdrop-blur-xl border border-[#2E3A52] rounded-2xl p-4 shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-[#2E3A52]">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#2E81FF] to-cyan-500 rounded-xl flex items-center justify-center">
                                <Share className="w-6 h-6 text-white" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold text-base mb-2">
                                    Install on iOS
                                </h3>
                                <ol className="text-zinc-400 text-sm space-y-1.5 leading-relaxed">
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#2E81FF] font-bold">1.</span>
                                        <span>Tap the <Share className="w-4 h-4 inline mx-1" /> share button</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#2E81FF] font-bold">2.</span>
                                        <span>Scroll and tap "Add to Home Screen"</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#2E81FF] font-bold">3.</span>
                                        <span>Tap "Add" in the top right</span>
                                    </li>
                                </ol>
                            </div>

                            <button
                                onClick={handleDismiss}
                                className="flex-shrink-0 text-zinc-500 hover:text-white transition-colors p-1"
                                aria-label="Dismiss"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
