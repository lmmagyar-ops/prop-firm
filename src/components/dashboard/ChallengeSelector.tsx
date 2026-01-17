"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface Challenge {
    id: string;
    tier: string;
    accountNumber: string;
    currentBalance: string;
    startingBalance: string;
    equity?: string; // Cash + position value
    positionValue?: string; // Value of open positions
    status: string;
    platform?: "polymarket" | "kalshi";
}

// Platform icon helper
const getPlatformIcon = (platform?: string) => {
    if (platform === "kalshi") return "🇺🇸";
    return "🌐";
};

interface ChallengeSelectorProps {
    challenges: Challenge[];
    selectedChallengeId: string | null;
    onSelect: (challengeId: string) => void;
}

export function ChallengeSelector({ challenges, selectedChallengeId, onSelect }: ChallengeSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // PERF: Debounced resize listener to avoid excessive re-renders
    const resizeTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const checkMobile = () => {
            if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
            resizeTimeout.current = setTimeout(() => {
                setIsMobile(window.innerWidth < 768);
            }, 150);
        };

        // Initial check (immediate)
        setIsMobile(window.innerWidth < 768);

        window.addEventListener("resize", checkMobile);
        return () => {
            window.removeEventListener("resize", checkMobile);
            if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K to open
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(true);
            }

            // Esc to close
            if (e.key === "Escape") {
                setIsOpen(false);
            }

            // 1-9 for quick switch (when dropdown is open)
            if (isOpen && /^[1-9]$/.test(e.key)) {
                const index = parseInt(e.key) - 1;
                if (challenges[index]) {
                    onSelect(challenges[index].id);
                    setIsOpen(false);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, challenges, onSelect]);

    const selectedChallenge = challenges.find(c => c.id === selectedChallengeId) || challenges[0];

    if (!selectedChallenge) {
        return (
            <div className="px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-500">
                No Active Evaluations
            </div>
        );
    }

    const calculatePnL = (challenge: Challenge) => {
        // Use equity (cash + positions) if available, otherwise fall back to cash
        const equity = challenge.equity ? parseFloat(challenge.equity) : parseFloat(challenge.currentBalance);
        const starting = parseFloat(challenge.startingBalance);
        const pnl = equity - starting;
        const pnlPercent = (pnl / starting) * 100;
        return { pnl, pnlPercent };
    };

    return (
        <>
            {/* Desktop Dropdown */}
            {!isMobile && (
                <div className="relative">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:bg-zinc-900 hover:border-zinc-700 transition-all text-sm"
                    >
                        <span className="text-sm">{getPlatformIcon(selectedChallenge.platform)}</span>
                        <Briefcase className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-white">
                            ${parseFloat(selectedChallenge.equity || selectedChallenge.currentBalance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-zinc-500 text-xs">
                            ({parseInt(selectedChallenge.startingBalance) >= 25000 ? '25k' : parseInt(selectedChallenge.startingBalance) >= 10000 ? '10k' : '5k'})
                        </span>
                        <span className="text-zinc-600 font-mono text-xs">
                            #{selectedChallenge.accountNumber || selectedChallenge.id.slice(0, 8).toUpperCase()}
                        </span>
                        <ChevronDown className={cn(
                            "w-4 h-4 text-zinc-500 transition-transform",
                            isOpen && "rotate-180"
                        )} />
                    </button>

                    <AnimatePresence>
                        {isOpen && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsOpen(false)}
                                />

                                {/* Dropdown */}
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full mt-2 right-0 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                                >
                                    <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
                                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                            Active Evaluations ({challenges.length}/5)
                                        </p>
                                    </div>

                                    <div className="max-h-96 overflow-y-auto">
                                        {challenges.map((challenge, index) => {
                                            const { pnl, pnlPercent } = calculatePnL(challenge);
                                            const isSelected = challenge.id === selectedChallengeId;

                                            return (
                                                <button
                                                    key={challenge.id}
                                                    onClick={() => {
                                                        const wasAlreadySelected = challenge.id === selectedChallengeId;
                                                        onSelect(challenge.id);
                                                        setIsOpen(false);
                                                        // Reload page to fetch correct platform markets (only if switching)
                                                        if (!wasAlreadySelected) {
                                                            setTimeout(() => window.location.reload(), 100);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "w-full px-4 py-3 flex items-start gap-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0",
                                                        isSelected && "bg-blue-500/10"
                                                    )}
                                                >
                                                    {/* Checkmark or Number */}
                                                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                                        {isSelected ? (
                                                            <Check className="w-4 h-4 text-blue-500" />
                                                        ) : (
                                                            <span className="text-xs text-zinc-600 font-medium">
                                                                {index + 1}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Challenge Info */}
                                                    <div className="flex-1 text-left">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm">{getPlatformIcon(challenge.platform)}</span>
                                                            <span className={cn(
                                                                "font-medium text-sm",
                                                                isSelected ? "text-blue-400" : "text-white"
                                                            )}>
                                                                ${parseInt(challenge.startingBalance).toLocaleString()} Eval
                                                            </span>
                                                            <span className="text-xs text-zinc-500 font-mono">
                                                                #{challenge.accountNumber || challenge.id.slice(0, 8).toUpperCase()}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-zinc-400">
                                                                Balance: ${parseFloat(challenge.equity || challenge.currentBalance).toLocaleString()}
                                                            </span>
                                                            <span className={cn(
                                                                "font-mono font-medium",
                                                                pnl >= 0 ? "text-green-500" : "text-red-500"
                                                            )}>
                                                                {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Footer hint */}
                                    <div className="p-2 bg-zinc-900/50 border-t border-zinc-800">
                                        <p className="text-[10px] text-zinc-600 text-center">
                                            Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">⌘K</kbd> to open • <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">1-9</kbd> to quick switch
                                        </p>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Mobile Full-Screen Modal */}
            {isMobile && (
                <>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm"
                    >
                        <Briefcase className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-white text-xs">
                            ${parseFloat(selectedChallenge.equity || selectedChallenge.currentBalance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-zinc-500 text-[10px]">
                            ({parseInt(selectedChallenge.startingBalance) >= 25000 ? '25k' : parseInt(selectedChallenge.startingBalance) >= 10000 ? '10k' : '5k'})
                        </span>
                    </button>

                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end"
                                onClick={() => setIsOpen(false)}
                            >
                                <motion.div
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                                    className="w-full bg-zinc-900 rounded-t-3xl max-h-[80vh] overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Handle bar */}
                                    <div className="flex justify-center pt-3 pb-2">
                                        <div className="w-12 h-1 bg-zinc-700 rounded-full" />
                                    </div>

                                    {/* Header */}
                                    <div className="px-6 py-4 border-b border-zinc-800">
                                        <h3 className="text-lg font-bold text-white">Switch Evaluation</h3>
                                        <p className="text-sm text-zinc-400 mt-1">
                                            {challenges.length} of 5 active
                                        </p>
                                    </div>

                                    {/* Challenges List */}
                                    <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
                                        {challenges.map((challenge) => {
                                            const { pnl, pnlPercent } = calculatePnL(challenge);
                                            const isSelected = challenge.id === selectedChallengeId;

                                            return (
                                                <button
                                                    key={challenge.id}
                                                    onClick={() => {
                                                        const wasAlreadySelected = challenge.id === selectedChallengeId;
                                                        onSelect(challenge.id);
                                                        setIsOpen(false);
                                                        // Reload page to fetch correct platform markets (only if switching)
                                                        if (!wasAlreadySelected) {
                                                            setTimeout(() => window.location.reload(), 100);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "w-full p-4 rounded-xl border transition-all text-left",
                                                        isSelected
                                                            ? "bg-blue-500/10 border-blue-500/50"
                                                            : "bg-zinc-800/50 border-zinc-700 active:bg-zinc-800"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    "font-bold text-base",
                                                                    isSelected ? "text-blue-400" : "text-white"
                                                                )}>
                                                                    ${parseInt(challenge.startingBalance).toLocaleString()} Evaluation
                                                                </span>
                                                                {isSelected && (
                                                                    <Check className="w-5 h-5 text-blue-500" />
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-zinc-500 font-mono">
                                                                Account #{challenge.accountNumber || challenge.id.slice(0, 8).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-700/50">
                                                        <div>
                                                            <p className="text-xs text-zinc-500">Current Equity</p>
                                                            <p className="text-sm font-medium text-white">
                                                                ${parseFloat(challenge.equity || challenge.currentBalance).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-zinc-500">P&L</p>
                                                            <p className={cn(
                                                                "text-sm font-bold font-mono",
                                                                pnl >= 0 ? "text-green-500" : "text-red-500"
                                                            )}>
                                                                {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                                                                <span className="text-xs ml-1">
                                                                    ({pnlPercent.toFixed(2)}%)
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </>
    );
}
