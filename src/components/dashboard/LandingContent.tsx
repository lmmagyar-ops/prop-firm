"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, ChevronRight, Zap, ShieldCheck, Wallet, Trophy, BarChart3, ArrowRight, TrendingUp, TrendingDown, Users, Globe, Activity } from "lucide-react";
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

// Interactive Quiz Card Component
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

            {/* Answer Buttons - Only show if not answered */}
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

            {/* Feedback with Explanation */}
            {answered && (
                <div className={`rounded-2xl p-6 border-2 ${isCorrect
                    ? "border-[var(--vapi-mint)]/50 bg-[var(--vapi-mint)]/10"
                    : "border-red-500/50 bg-red-500/10"
                    }`}>
                    {/* Header */}
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

                    {/* Explanation */}
                    <p className="text-[var(--vapi-gray-text)] mb-6">
                        {isCorrect ? question.explanationCorrect : question.explanationWrong}
                    </p>

                    {/* Next Question Button */}
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

export function LandingContent() {
    // For animated timeline
    const [activeStep, setActiveStep] = useState(0);
    const timelineRef = useRef<HTMLDivElement>(null);

    // Animate through steps on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = parseInt(entry.target.getAttribute('data-step') || '0');
                        setActiveStep(Math.max(activeStep, index));
                    }
                });
            },
            { threshold: 0.5 }
        );

        const stepElements = document.querySelectorAll('[data-step]');
        stepElements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [activeStep]);

    return (
        <div className="min-h-screen bg-[#000000] text-white selection:bg-[var(--vapi-mint)]/30 overflow-x-hidden font-sans">

            {/* Persistent Dot Grid */}
            <div className="fixed inset-0 bg-dot-grid-subtle opacity-40 pointer-events-none z-0" />

            {/* Atmospheric Glows */}
            <div className="fixed top-1/4 left-0 w-[500px] h-[500px] bg-[var(--vapi-glow-indigo)] blur-[150px] rounded-full pointer-events-none opacity-50" />
            <div className="fixed bottom-0 right-1/4 w-[600px] h-[400px] bg-[var(--vapi-glow-purple)] blur-[150px] rounded-full pointer-events-none opacity-40" />


            {/* As Featured In - Press Logos */}
            <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-12">
                <div className="text-center mb-8">
                    <div className="mono-label text-[var(--vapi-gray-text)] text-[10px]">AS FEATURED IN</div>
                </div>
                <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 opacity-50 hover:opacity-70 transition-opacity">
                    {[
                        { name: "MarketWatch", href: "#" },
                        { name: "Yahoo Finance", href: "#" },
                        { name: "NASDAQ", href: "#" },
                        { name: "Bloomberg", href: "#" },
                    ].map((outlet, i) => (
                        <a
                            key={i}
                            href={outlet.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xl md:text-2xl font-bold text-white/60 hover:text-white transition-colors"
                        >
                            {outlet.name}
                        </a>
                    ))}
                </div>
            </section>


            {/* How It Works Section - ANIMATED TIMELINE */}
            <section className="relative z-10 max-w-6xl mx-auto px-6 py-32" ref={timelineRef}>
                <div className="text-center mb-20">
                    <div className="mono-label text-[var(--vapi-mint)] mb-4">How It Works</div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white">
                        Your Path to <span className="text-gradient-mint">Capital.</span>
                    </h2>
                    <p className="text-[var(--vapi-gray-text)] text-lg mt-4 max-w-xl mx-auto">
                        A simple, transparent evaluation process designed to get you funded.
                    </p>
                </div>

                {/* Timeline Container */}
                <div className="relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-[var(--vapi-border)]">
                        <div
                            className="h-full bg-gradient-to-r from-[var(--vapi-mint)] via-[var(--vapi-mint)] to-transparent transition-all duration-1000 ease-out"
                            style={{ width: `${(activeStep / 2) * 100}%` }}
                        />
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                step: "01",
                                icon: Zap,
                                title: "The Challenge",
                                desc: "Show us your skills. Hit the profit target without violating drawdown.",
                            },
                            {
                                step: "02",
                                icon: ShieldCheck,
                                title: "The Verification",
                                desc: "Prove consistency. Repeat your performance to validate your strategy.",
                            },
                            {
                                step: "03",
                                icon: Wallet,
                                title: "Professional Trader",
                                desc: "Trade our capital. Keep up to 90% of profits. Bi-weekly USDC payouts.",
                            }
                        ].map((item, i) => (
                            <div
                                key={i}
                                data-step={i}
                                className={`group relative thin-border-card rounded-3xl p-8 transition-all duration-500 ${i <= activeStep
                                    ? 'border-[var(--vapi-mint)]/40 shadow-[0_0_40px_-15px_var(--vapi-mint)]'
                                    : 'hover:border-[var(--vapi-mint)]/20'
                                    }`}
                            >
                                {/* Step Number Circle */}
                                <div className={`absolute -top-4 left-8 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${i <= activeStep
                                    ? 'bg-[var(--vapi-mint)] text-black'
                                    : 'bg-[var(--vapi-border)] text-[var(--vapi-gray-text)]'
                                    }`}>
                                    {item.step}
                                </div>

                                <div className="flex justify-between items-start mb-8 pt-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${i <= activeStep
                                        ? 'bg-[var(--vapi-mint)]/10 border-[var(--vapi-mint)]/30'
                                        : 'bg-white/5 border-white/10'
                                        }`}>
                                        <item.icon className={`w-6 h-6 transition-colors duration-500 ${i <= activeStep ? 'text-[var(--vapi-mint)]' : 'text-[var(--vapi-gray-text)]'
                                            }`} />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                                <p className="text-[var(--vapi-gray-text)] leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* Pricing Section - ENHANCED HOVERS */}
            <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
                <div className="h-px w-full bg-[var(--vapi-border)] mb-24" />

                <div className="text-center mb-16">
                    <div className="mono-label text-[var(--vapi-mint)] mb-4">Pricing</div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                        Simple, Transparent.
                    </h2>
                    <p className="text-[var(--vapi-gray-text)] text-lg mt-4">
                        One-time payment. Refundable with your first payout.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 items-stretch">
                    {/* Scout - $5K */}
                    <div className="group thin-border-card rounded-3xl p-8 flex flex-col hover:border-[var(--vapi-mint)]/40 hover:shadow-[0_0_50px_-20px_var(--vapi-mint)] hover:-translate-y-1 transition-all duration-300">
                        <div className="mono-label text-[var(--vapi-gray-text)] mb-2">Scout</div>
                        <div className="text-5xl font-black text-white mb-2 group-hover:text-gradient-mint transition-all">$5K</div>
                        <p className="text-[var(--vapi-gray-text)] text-sm mb-6">Perfect for learning market mechanics.</p>

                        <div className="flex-1 space-y-0 text-sm">
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Profit Target</span>
                                <span className="text-white font-mono">$500 <span className="text-[var(--vapi-mint)]">(10%)</span></span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Max Drawdown</span>
                                <span className="text-white font-mono">8%</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Daily Loss Limit</span>
                                <span className="text-white font-mono">4%</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Time Limit</span>
                                <span className="text-white font-mono">Unlimited ✓</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Min Trading Days</span>
                                <span className="text-white font-mono">5 days</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Profit Split</span>
                                <span className="text-[var(--vapi-mint)] font-mono font-bold">Up to 90%</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Payouts</span>
                                <span className="text-white font-mono">Bi-weekly (USDC)</span>
                            </div>
                            <div className="flex justify-between py-2.5">
                                <span className="text-[var(--vapi-gray-text)]">Fee Refund</span>
                                <span className="text-[var(--vapi-mint)] font-mono">1st Payout ✓</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-[var(--vapi-border)]">
                            <div className="text-3xl font-black text-white mb-4">$79</div>
                            <Link href="/signup?intent=buy_evaluation&tier=scout&price=79" className="block">
                                <button className="w-full py-4 rounded-full thin-border-card text-white font-bold group-hover:bg-white group-hover:text-black transition-all">
                                    Start Challenge
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* Grinder - $10K (Popular) */}
                    <div className="relative thin-border-card border-[var(--vapi-mint)]/40 rounded-3xl p-8 flex flex-col shadow-[0_0_60px_-20px_var(--vapi-mint)] hover:-translate-y-2 transition-all duration-300">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[var(--vapi-mint)] text-black mono-label text-[10px] animate-pulse">
                            Most Popular
                        </div>

                        <div className="mono-label text-[var(--vapi-mint)] mb-2">Grinder</div>
                        <div className="text-5xl font-black text-white mb-2">$10K</div>
                        <p className="text-[var(--vapi-gray-text)] text-sm mb-6">The standard for serious traders.</p>

                        <div className="flex-1 space-y-0 text-sm">
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Profit Target</span>
                                <span className="text-white font-mono">$1,000 <span className="text-[var(--vapi-mint)]">(10%)</span></span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Max Drawdown</span>
                                <span className="text-white font-mono">10%</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Daily Loss Limit</span>
                                <span className="text-white font-mono">5%</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Time Limit</span>
                                <span className="text-white font-mono">Unlimited ✓</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Min Trading Days</span>
                                <span className="text-white font-mono">5 days</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Profit Split</span>
                                <span className="text-[var(--vapi-mint)] font-mono font-bold">Up to 90%</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Payouts</span>
                                <span className="text-white font-mono">Bi-weekly (USDC)</span>
                            </div>
                            <div className="flex justify-between py-2.5">
                                <span className="text-[var(--vapi-gray-text)]">Fee Refund</span>
                                <span className="text-[var(--vapi-mint)] font-mono">1st Payout ✓</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-[var(--vapi-border)]">
                            <div className="text-3xl font-black text-white mb-4">$149</div>
                            <Link href="/signup?intent=buy_evaluation&tier=grinder&price=149" className="block">
                                <button className="pill-btn pill-btn-mint w-full py-4 flex items-center justify-center gap-2">
                                    Start Challenge <ArrowRight className="w-4 h-4" />
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* Executive - $25K */}
                    <div className="group thin-border-card rounded-3xl p-8 flex flex-col hover:border-[var(--vapi-mint)]/40 hover:shadow-[0_0_50px_-20px_var(--vapi-mint)] hover:-translate-y-1 transition-all duration-300">
                        <div className="mono-label text-[var(--vapi-gray-text)] mb-2">Executive</div>
                        <div className="text-5xl font-black text-white mb-2 group-hover:text-gradient-mint transition-all">$25K</div>
                        <p className="text-[var(--vapi-gray-text)] text-sm mb-6">Maximum capital for experienced traders.</p>

                        <div className="flex-1 space-y-0 text-sm">
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Profit Target</span>
                                <span className="text-white font-mono">$2,500 <span className="text-[var(--vapi-mint)]">(10%)</span></span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Max Drawdown</span>
                                <span className="text-white font-mono">10%</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Daily Loss Limit</span>
                                <span className="text-white font-mono">5%</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Time Limit</span>
                                <span className="text-white font-mono">Unlimited ✓</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Min Trading Days</span>
                                <span className="text-white font-mono">5 days</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Profit Split</span>
                                <span className="text-[var(--vapi-mint)] font-mono font-bold">Up to 90%</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Payouts</span>
                                <span className="text-white font-mono">Bi-weekly (USDC)</span>
                            </div>
                            <div className="flex justify-between py-2.5">
                                <span className="text-[var(--vapi-gray-text)]">Fee Refund</span>
                                <span className="text-[var(--vapi-mint)] font-mono">1st Payout ✓</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-[var(--vapi-border)]">
                            <div className="text-3xl font-black text-white mb-4">$299</div>
                            <Link href="/signup?intent=buy_evaluation&tier=executive&price=299" className="block">
                                <button className="w-full py-4 rounded-full thin-border-card text-white font-bold group-hover:bg-white group-hover:text-black transition-all">
                                    Start Challenge
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>


            {/* Interactive Quiz Section - "You're Already an Analyst" */}
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


            {/* Comparison Table Section - "See The Difference" */}
            <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
                <div className="h-px w-full bg-[var(--vapi-border)] mb-24" />

                <div className="text-center mb-16">
                    <div className="mono-label text-[var(--vapi-mint)] mb-4">Why Project X</div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                        See The Difference.
                    </h2>
                    <p className="text-[var(--vapi-gray-text)] text-lg max-w-2xl mx-auto">
                        We're not just another prop firm. We're the first for prediction markets.
                    </p>
                </div>

                {/* Comparison Table */}
                <div className="thin-border-card rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--vapi-border)]">
                                    <th className="text-left p-6 text-[var(--vapi-gray-text)] font-normal"></th>
                                    <th className="p-6 text-center">
                                        <div className="inline-flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 rounded-xl bg-[var(--vapi-mint)]/10 border border-[var(--vapi-mint)]/30 flex items-center justify-center">
                                                <BarChart3 className="w-5 h-5 text-[var(--vapi-mint)]" />
                                            </div>
                                            <span className="font-bold text-white">Project X</span>
                                        </div>
                                    </th>
                                    <th className="p-6 text-center">
                                        <span className="text-[var(--vapi-gray-text)]">Industry Average</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { feature: "Asset Class", ours: "Prediction Markets", industry: "Forex/Crypto", highlight: true },
                                    { feature: "Time Limit", ours: "Unlimited", industry: "30-60 days" },
                                    { feature: "Profit Split", ours: "Up to 90%", industry: "70-80%" },
                                    { feature: "Payout Frequency", ours: "Bi-weekly", industry: "Monthly" },
                                    { feature: "Payout Method", ours: "USDC", industry: "Bank Wire" },
                                    { feature: "News Trading", ours: true, industry: false },
                                    { feature: "Weekend Holding", ours: true, industry: false },
                                    { feature: "Fee Refund", ours: "1st Payout", industry: "Varies" },
                                ].map((row, i) => (
                                    <tr key={i} className="border-b border-[var(--vapi-border)] last:border-0">
                                        <td className="p-6 text-[var(--vapi-gray-text)]">{row.feature}</td>
                                        <td className="p-6 text-center">
                                            {row.highlight ? (
                                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--vapi-mint)]/10 text-[var(--vapi-mint)] font-bold text-sm">
                                                    ★ {row.ours}
                                                </span>
                                            ) : typeof row.ours === 'boolean' ? (
                                                row.ours ? (
                                                    <CheckCircle2 className="w-5 h-5 text-[var(--vapi-mint)] mx-auto" />
                                                ) : (
                                                    <span className="text-red-400">✗</span>
                                                )
                                            ) : (
                                                <span className="text-white font-bold">{row.ours}</span>
                                            )}
                                        </td>
                                        <td className="p-6 text-center">
                                            {typeof row.industry === 'boolean' ? (
                                                row.industry ? (
                                                    <CheckCircle2 className="w-5 h-5 text-[var(--vapi-mint)] mx-auto" />
                                                ) : (
                                                    <span className="text-red-400">✗</span>
                                                )
                                            ) : (
                                                <span className="text-[var(--vapi-gray-text)]">{row.industry}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <p className="text-center text-[var(--vapi-gray-text)] text-sm mt-6">
                    ★ The only prop firm built for prediction markets.
                </p>
            </section>


            {/* FAQ Section */}
            <section className="relative z-10 max-w-4xl mx-auto px-6 py-24">
                <div className="h-px w-full bg-[var(--vapi-border)] mb-24" />

                <div className="text-center mb-16">
                    <div className="mono-label text-[var(--vapi-mint)] mb-4">FAQ</div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                        Got Questions?<br />
                        <span className="text-gradient-mint">We've Got Answers.</span>
                    </h2>
                </div>

                {/* FAQ Items */}
                <div className="space-y-4">
                    {[
                        {
                            icon: "💰",
                            q: "How fast do I get paid?",
                            a: "Bi-weekly. USDC. Direct to your wallet. No waiting. No invoices. No BS."
                        },
                        {
                            icon: "📈",
                            q: "What are prediction markets?",
                            a: "Markets where you trade on the outcome of real-world events. \"Will the Fed cut rates?\" \"Will Trump win?\" You don't need charts—just read the news."
                        },
                        {
                            icon: "⏰",
                            q: "Is there a time limit to pass?",
                            a: "Nope. Take your time. We don't believe in artificial deadlines. Trade when you see opportunity."
                        },
                        {
                            icon: "🎯",
                            q: "What's the profit target?",
                            a: "10% of your account size. Hit it, verify, get funded. Simple."
                        },
                        {
                            icon: "💸",
                            q: "Do I get my fee back?",
                            a: "Yes. Your evaluation fee is refunded with your first payout as a funded trader."
                        },
                        {
                            icon: "🌙",
                            q: "Can I hold positions overnight or over weekends?",
                            a: "Yes to both. Unlike forex prop firms, we don't restrict when you can hold. Markets are 24/7."
                        },
                        {
                            icon: "📰",
                            q: "Can I trade during news events?",
                            a: "Absolutely. That's literally the point. Prediction markets ARE news trading."
                        },
                        {
                            icon: "🔒",
                            q: "What happens if I blow the account?",
                            a: "You fail the evaluation and need to purchase a new one. But with our risk tools and no time pressure, most traders who follow the rules pass."
                        },
                    ].map((faq, i) => (
                        <details key={i} className="group thin-border-card rounded-2xl overflow-hidden">
                            <summary className="flex items-center gap-4 p-6 cursor-pointer list-none hover:bg-white/5 transition-colors">
                                <span className="text-2xl">{faq.icon}</span>
                                <span className="text-white font-bold flex-1">{faq.q}</span>
                                <ChevronRight className="w-5 h-5 text-[var(--vapi-gray-text)] group-open:rotate-90 transition-transform" />
                            </summary>
                            <div className="px-6 pb-6 pl-16 text-[var(--vapi-gray-text)]">
                                {faq.a}
                            </div>
                        </details>
                    ))}
                </div>

                {/* Ask Luna CTA */}
                <div className="mt-12 thin-border-card rounded-2xl p-8 bg-[var(--vapi-mint)]/5 border-[var(--vapi-mint)]/20 text-center">
                    <div className="text-4xl mb-4">🎙️</div>
                    <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
                    <p className="text-[var(--vapi-gray-text)] mb-6">
                        Talk to Luna, our AI assistant. She knows everything about Project X.
                    </p>
                    <button className="pill-btn pill-btn-mint flex items-center gap-2 mx-auto">
                        Ask Luna <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </section>


            {/* Footer */}
            <footer className="relative z-10 border-t border-[var(--vapi-border)] py-16 mt-24">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <div className="flex justify-center items-center gap-8 mono-label text-[var(--vapi-gray-text)] mb-6">
                        <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
                        <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
                        <span className="hover:text-white cursor-pointer transition-colors">Risk Disclosure</span>
                    </div>
                    <p className="text-[var(--vapi-gray-text)] text-sm">
                        © 2025 Project X via Polymarket Data. All rights reserved.<br />
                        <span className="text-white/30">This is a simulated trading environment. No real funds are at risk during evaluation.</span>
                    </p>
                </div>
            </footer>
        </div>
    );
}
