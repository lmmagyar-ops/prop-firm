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
        type: "math",
        question: "What is 15 + 27?",
        options: ["32", "42", "38", "44"],
        answer: "42",
        hint: "Add the tens, then the ones"
    },
    {
        type: "math",
        question: "If you buy at $0.40 and sell at $0.70, what's your profit?",
        options: ["$0.20", "$0.30", "$0.40", "$1.10"],
        answer: "$0.30",
        hint: "Sell price minus buy price"
    },
    {
        type: "math",
        question: "What is 8 × 7?",
        options: ["54", "48", "56", "63"],
        answer: "56",
        hint: "Think: 8 × 7"
    },
    {
        type: "math",
        question: "A share costs $0.50. How many can you buy with $10?",
        options: ["15", "20", "25", "50"],
        answer: "20",
        hint: "$10 ÷ $0.50"
    },
    {
        type: "math",
        question: "What is 100 - 37?",
        options: ["53", "67", "63", "73"],
        answer: "63",
        hint: "Subtract from 100"
    },
    {
        type: "math",
        question: "You invest $200 and earn 50% profit. What's your total?",
        options: ["$250", "$300", "$350", "$400"],
        answer: "$300",
        hint: "50% of $200 = $100"
    },
    {
        type: "math",
        question: "What is 144 ÷ 12?",
        options: ["11", "12", "13", "14"],
        answer: "12",
        hint: "A dozen squared"
    },
    {
        type: "math",
        question: "If a stock drops 20% from $50, what's the new price?",
        options: ["$30", "$35", "$40", "$45"],
        answer: "$40",
        hint: "20% of $50 = $10"
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
                                        "border hover:border-primary/50 hover:bg-primary/10",
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
