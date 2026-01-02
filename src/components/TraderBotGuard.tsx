"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Percent, DollarSign } from "lucide-react";

interface TraderBotGuardProps {
    onVerified: (verified: boolean) => void;
    className?: string;
}

// Trading-themed challenges
const CHALLENGES = [
    {
        type: "emoji",
        question: "Which emoji represents a winning trade?",
        options: ["🐻", "📉", "🐂", "💀"],
        answer: "🐂",
        hint: "Think bullish..."
    },
    {
        type: "emoji",
        question: "Click the symbol for profit:",
        options: ["📈", "📉", "⏸️", "🔄"],
        answer: "📈",
        hint: "Green means go!"
    },
    {
        type: "math",
        question: "If you buy at 0.40 and sell at 0.70, what's your profit per share?",
        options: ["$0.20", "$0.30", "$0.40", "$1.10"],
        answer: "$0.30",
        hint: "Sell price minus buy price"
    },
    {
        type: "emoji",
        question: "Which animal do traders want to see?",
        options: ["🐻", "🦆", "🐂", "🐍"],
        answer: "🐂",
        hint: "Bulls charge forward!"
    },
    {
        type: "math",
        question: "You bet $100 on YES at 0.50. What's your payout if you win?",
        options: ["$50", "$100", "$150", "$200"],
        answer: "$200",
        hint: "$100 / 0.50 = ?"
    },
    {
        type: "emoji",
        question: "What does 💎🙌 mean?",
        options: ["Selling fast", "Holding strong", "Taking profit", "Cutting losses"],
        answer: "Holding strong",
        hint: "Diamond hands never fold"
    }
];

export function TraderBotGuard({ onVerified, className }: TraderBotGuardProps) {
    const [challenge, setChallenge] = useState(CHALLENGES[0]);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [isWrong, setIsWrong] = useState(false);
    const [attempts, setAttempts] = useState(0);

    // Pick a random challenge on mount
    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * CHALLENGES.length);
        setChallenge(CHALLENGES[randomIndex]);
    }, []);

    const handleSelect = useCallback((answer: string) => {
        if (isVerified) return;

        setSelectedAnswer(answer);

        if (answer === challenge.answer) {
            setIsVerified(true);
            setIsWrong(false);
            onVerified(true);
        } else {
            setIsWrong(true);
            setAttempts(prev => prev + 1);

            // Reset after a moment and pick a new challenge after 2 wrong attempts
            setTimeout(() => {
                setSelectedAnswer(null);
                setIsWrong(false);
                if (attempts >= 1) {
                    const randomIndex = Math.floor(Math.random() * CHALLENGES.length);
                    setChallenge(CHALLENGES[randomIndex]);
                    setAttempts(0);
                }
            }, 1000);
        }
    }, [challenge.answer, isVerified, onVerified, attempts]);

    return (
        <div className={cn("space-y-3", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-5 h-5 rounded flex items-center justify-center transition-colors",
                        isVerified
                            ? "bg-green-500/20"
                            : "bg-zinc-800"
                    )}>
                        {isVerified ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                            <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                    </div>
                    <span className="text-sm text-zinc-400">
                        {isVerified ? "Verified Trader" : "Trader Verification"}
                    </span>
                </div>
                {isVerified && (
                    <span className="text-xs text-green-400 font-medium">✓ Passed</span>
                )}
            </div>

            {/* Challenge Card */}
            <div className={cn(
                "rounded-xl border p-4 transition-all",
                isVerified
                    ? "bg-green-500/5 border-green-500/30"
                    : isWrong
                        ? "bg-red-500/5 border-red-500/30"
                        : "bg-zinc-900/50 border-white/10"
            )}>
                {isVerified ? (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-green-400">You're not a bot!</p>
                            <p className="text-xs text-zinc-500">Trader verification complete</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Question */}
                        <p className="text-sm text-zinc-300 mb-3">
                            {challenge.question}
                        </p>

                        {/* Options Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            {challenge.options.map((option, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelect(option)}
                                    disabled={isVerified}
                                    className={cn(
                                        "py-2.5 px-3 rounded-lg text-sm font-medium transition-all",
                                        "border hover:border-blue-500/50 hover:bg-blue-500/10",
                                        selectedAnswer === option && isWrong
                                            ? "border-red-500/50 bg-red-500/10 text-red-400"
                                            : "border-white/10 bg-black/40 text-zinc-300 hover:text-white",
                                        option.startsWith("$") || option.length > 3
                                            ? "text-sm"
                                            : "text-xl"
                                    )}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>

                        {/* Hint on wrong answer */}
                        {isWrong && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Try again! Hint: {challenge.hint}</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Honeypot - invisible to humans, bots fill it */}
            <input
                type="text"
                name="website_url"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    left: '-9999px',
                    opacity: 0,
                    height: 0,
                    width: 0,
                }}
            />
        </div>
    );
}
