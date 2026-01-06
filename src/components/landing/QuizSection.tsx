"use client";

import { useState } from "react";
import { CheckCircle2, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import Link from "next/link";

// Quiz questions data with explanations
const QUIZ_QUESTIONS = [
    {
        id: 1,
        badge: "BREAKING NEWS",
        headline: "Fed Chair Signals Interest Rate Cut",
        subtext: "Jerome Powell hints at lowering rates to stimulate economy",
        question: "What happens to the 'Rate Cut in 2024' market?",
        correctAnswer: "up" as const,
        explanationCorrect: "Exactly! When the Fed signals a rate cut, the probability of it happening increases. You just identified alpha in 5 seconds.",
        explanationWrong: "The correct answer was UP. When the Fed signals a rate cut, the probability of it happening increases. You just identified alpha in 5 seconds.",
    },
    {
        id: 2,
        badge: "BREAKING NEWS",
        headline: "Tech Giant Misses Earnings Expectations",
        subtext: "Apple reports 12% decline in iPhone sales quarter-over-quarter",
        question: "What happens to the 'Apple Stock Above $200' market?",
        correctAnswer: "down" as const,
        explanationCorrect: "Correct! Poor earnings = lower stock price expectations. The probability of Apple staying above $200 decreases.",
        explanationWrong: "The correct answer was DOWN. Poor earnings = lower stock price expectations. The probability of Apple staying above $200 decreases.",
    },
    {
        id: 3,
        badge: "BREAKING NEWS",
        headline: "Unemployment Claims Hit Record Low",
        subtext: "Weekly jobless claims fall to 187,000, lowest since 1969",
        question: "What happens to the 'Recession in 2024' market?",
        correctAnswer: "down" as const,
        explanationCorrect: "Exactly! Strong employment data means the economy is healthy. Recession probability drops.",
        explanationWrong: "The correct answer was DOWN. Strong employment data means the economy is healthy. Recession probability drops.",
    },
];

export function QuizSection() {
    return (
        <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
            <div className="h-px w-full bg-[var(--vapi-border)] mb-24" />

            {/* Headline */}
            <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-4">
                    You're Already an Analyst.<br />
                    <span className="text-gradient-mint">You Just Didn't Know It.</span>
                </h2>
                <p className="text-[var(--vapi-gray-text)] text-lg max-w-2xl mx-auto">
                    In Forex, mastering technical analysis takes years. In prediction markets, it takes seconds.
                </p>
            </div>

            {/* Quiz Card */}
            <QuizCard />
        </section>
    );
}

function QuizCard() {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [answered, setAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<"up" | "down" | null>(null);
    const [isComplete, setIsComplete] = useState(false);

    const question = QUIZ_QUESTIONS[currentQuestion];
    const isCorrect = selectedAnswer === question.correctAnswer;

    const handleAnswer = (answer: "up" | "down") => {
        if (answered) return;
        setSelectedAnswer(answer);
        setAnswered(true);
        if (answer === question.correctAnswer) {
            setScore(score + 1);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setAnswered(false);
            setSelectedAnswer(null);
        } else {
            setIsComplete(true);
        }
    };

    const resetQuiz = () => {
        setCurrentQuestion(0);
        setScore(0);
        setAnswered(false);
        setSelectedAnswer(null);
        setIsComplete(false);
    };

    if (isComplete) {
        return (
            <div className="thin-border-card rounded-3xl p-8 md:p-12 bg-black/40 backdrop-blur-sm max-w-2xl mx-auto">
                <div className="text-center space-y-6">
                    <div className="text-6xl mb-4">{score === 3 ? "🎯" : score >= 2 ? "👏" : "📚"}</div>
                    <h3 className="text-3xl font-black text-white">
                        {score === 3 ? "Perfect!" : score >= 2 ? "Great Job!" : "Keep Learning!"}
                    </h3>
                    <p className="text-[var(--vapi-gray-text)] text-lg">
                        You got <span className="text-[var(--vapi-mint)] font-bold">{score}/3</span> correct.
                        {score === 3 && " You're ready to trade."}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <button
                            onClick={resetQuiz}
                            className="pill-btn thin-border-card text-white hover:bg-white hover:text-black"
                        >
                            Try Again
                        </button>
                        <Link href="/signup?intent=buy_evaluation">
                            <button className="pill-btn pill-btn-mint flex items-center gap-2">
                                Start Trading <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="thin-border-card rounded-3xl p-8 md:p-12 bg-black/40 backdrop-blur-sm max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <span className="text-[var(--vapi-gray-text)] text-sm">
                    Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
                </span>
                <span className="text-[var(--vapi-gray-text)] text-sm">
                    Score: <span className="text-[var(--vapi-mint)] font-bold">{score}/{QUIZ_QUESTIONS.length}</span>
                </span>
            </div>

            {/* News Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--vapi-mint)]/10 border border-[var(--vapi-mint)]/30 mb-6">
                <span className="text-[var(--vapi-mint)] text-xs font-bold">📺 {question.badge}</span>
            </div>

            {/* Headline */}
            <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
                {question.headline}
            </h3>
            <p className="text-[var(--vapi-gray-text)] mb-8">
                {question.subtext}
            </p>

            {/* Question */}
            <div className="thin-border-card rounded-xl p-4 mb-8 bg-white/5">
                <p className="text-white font-medium">{question.question}</p>
            </div>

            {/* Answer Buttons */}
            {!answered && (
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleAnswer("up")}
                        className="relative p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 border-[var(--vapi-mint)]/30 bg-[var(--vapi-mint)]/5 hover:bg-[var(--vapi-mint)]/10 hover:border-[var(--vapi-mint)]/50 cursor-pointer"
                    >
                        <TrendingUp className="w-8 h-8 text-[var(--vapi-mint)]" />
                        <span className="text-[var(--vapi-mint)] font-bold text-lg">Price Goes UP</span>
                    </button>

                    <button
                        onClick={() => handleAnswer("down")}
                        className="relative p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/50 cursor-pointer"
                    >
                        <TrendingDown className="w-8 h-8 text-red-400" />
                        <span className="text-red-400 font-bold text-lg">Price Goes DOWN</span>
                    </button>
                </div>
            )}

            {/* Feedback */}
            {answered && (
                <div className={`rounded-2xl p-6 border-2 ${isCorrect
                    ? "border-[var(--vapi-mint)]/50 bg-[var(--vapi-mint)]/10"
                    : "border-red-500/50 bg-red-500/10"
                    }`}>
                    <div className="flex items-center gap-3 mb-3">
                        {isCorrect ? (
                            <CheckCircle2 className="w-6 h-6 text-[var(--vapi-mint)]" />
                        ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-red-400 flex items-center justify-center">
                                <span className="text-red-400 text-sm font-bold">✕</span>
                            </div>
                        )}
                        <span className={`font-bold text-lg ${isCorrect ? "text-[var(--vapi-mint)]" : "text-red-400"}`}>
                            {isCorrect ? "Correct!" : "Not Quite"}
                        </span>
                    </div>

                    <p className="text-[var(--vapi-gray-text)] mb-6">
                        {isCorrect ? question.explanationCorrect : question.explanationWrong}
                    </p>

                    <button
                        onClick={handleNextQuestion}
                        className="w-full py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors"
                    >
                        {currentQuestion < QUIZ_QUESTIONS.length - 1 ? "Next Question" : "See Results"}
                    </button>
                </div>
            )}
        </div>
    );
}
