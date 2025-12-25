"use client";

import React from "react";
import { usePWA } from "@/hooks/usePWA";
import { WifiOff, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineIndicator() {
    const { isOnline } = usePWA();

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed top-0 left-0 right-0 z-50"
                >
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 px-4 text-center shadow-lg">
                        <div className="flex items-center justify-center gap-2 text-sm font-bold">
                            <WifiOff className="w-4 h-4" />
                            <span>You're offline - Reconnect to trade</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function OnlineIndicator() {
    const { isOnline } = usePWA();
    const [showReconnected, setShowReconnected] = React.useState(false);

    React.useEffect(() => {
        if (isOnline && !showReconnected) {
            setShowReconnected(true);
            const timer = setTimeout(() => {
                setShowReconnected(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, showReconnected]);

    return (
        <AnimatePresence>
            {showReconnected && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed top-0 left-0 right-0 z-50"
                >
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 px-4 text-center shadow-lg">
                        <div className="flex items-center justify-center gap-2 text-sm font-bold">
                            <Wifi className="w-4 h-4" />
                            <span>Back online!</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
