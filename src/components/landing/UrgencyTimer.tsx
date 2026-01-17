"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame } from "lucide-react";

/**
 * UrgencyTimer - Creates FOMO with countdown to offer expiration
 * 
 * Anthropic Engineering Standards:
 * - Persistent across page loads (localStorage)
 * - Graceful expiration handling
 * - Visual urgency indicators
 */

interface UrgencyTimerProps {
    /** Hours until expiration from first visit */
    hoursToExpire?: number;
    /** Text to show next to timer */
    label?: string;
    /** Callback when timer expires */
    onExpire?: () => void;
}

export function UrgencyTimer({
    hoursToExpire = 24,
    label = "Limited offer expires in",
    onExpire,
}: UrgencyTimerProps) {
    const [timeLeft, setTimeLeft] = useState<{
        hours: number;
        minutes: number;
        seconds: number;
    } | null>(null);
    const [isExpired, setIsExpired] = useState(false);
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        // Get or create expiration timestamp
        let expirationTime = localStorage.getItem("urgencyTimerExpires");

        if (!expirationTime) {
            const expiry = Date.now() + hoursToExpire * 60 * 60 * 1000;
            localStorage.setItem("urgencyTimerExpires", expiry.toString());
            expirationTime = expiry.toString();
        }

        const expiryMs = parseInt(expirationTime, 10);

        const updateTimer = () => {
            const now = Date.now();
            const diff = expiryMs - now;

            if (diff <= 0) {
                setIsExpired(true);
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                onExpire?.();
                return;
            }

            // Check if less than 1 hour remaining
            setIsUrgent(diff < 60 * 60 * 1000);

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({ hours, minutes, seconds });
        };

        // Initial update
        updateTimer();

        // Update every second
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [hoursToExpire, onExpire]);

    if (!timeLeft) return null;

    const formatNumber = (n: number) => n.toString().padStart(2, "0");

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border ${isExpired
                    ? "bg-zinc-800/50 border-zinc-700"
                    : isUrgent
                        ? "bg-red-500/10 border-red-500/30 animate-pulse"
                        : "bg-[#2E81FF]/10 border-[#2E81FF]/30"
                }`}
        >
            {isUrgent ? (
                <Flame className="w-4 h-4 text-red-400" />
            ) : (
                <Clock className="w-4 h-4 text-[#2E81FF]" />
            )}

            <span className={`text-sm font-medium ${isExpired ? "text-zinc-500" : isUrgent ? "text-red-400" : "text-zinc-300"
                }`}>
                {isExpired ? "Offer expired" : label}
            </span>

            {!isExpired && (
                <div className="flex items-center gap-1 font-mono font-bold">
                    <TimeBlock value={formatNumber(timeLeft.hours)} label="h" urgent={isUrgent} />
                    <span className={isUrgent ? "text-red-400" : "text-[#2E81FF]"}>:</span>
                    <TimeBlock value={formatNumber(timeLeft.minutes)} label="m" urgent={isUrgent} />
                    <span className={isUrgent ? "text-red-400" : "text-[#2E81FF]"}>:</span>
                    <TimeBlock value={formatNumber(timeLeft.seconds)} label="s" urgent={isUrgent} />
                </div>
            )}
        </motion.div>
    );
}

function TimeBlock({
    value,
    label,
    urgent
}: {
    value: string;
    label: string;
    urgent: boolean;
}) {
    return (
        <div className="flex items-baseline">
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={value}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`text-lg ${urgent ? "text-red-400" : "text-[#2E81FF]"}`}
                >
                    {value}
                </motion.span>
            </AnimatePresence>
            <span className={`text-xs ml-0.5 ${urgent ? "text-red-400/70" : "text-[#2E81FF]/70"}`}>
                {label}
            </span>
        </div>
    );
}

/**
 * Hook to reset the urgency timer (for testing or new promotions)
 */
export function useResetUrgencyTimer() {
    return () => {
        localStorage.removeItem("urgencyTimerExpires");
        window.location.reload();
    };
}
