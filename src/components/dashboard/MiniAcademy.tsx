"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, CheckCircle2, XCircle } from "lucide-react";

const SCENARIOS = [
    {
        id: 1,
        headline: "Fed Chair Signals Interest Rate Cut",
        context: "Jerome Powell hints at lowering rates to stimulate economy",
        question: "What happens to the 'Rate Cut in 2024' market?",
        correctAnswer: "up",
        explanation: "Exactly! When the Fed signals a rate cut, the probability of it happening increases. You just identified alpha in 5 seconds."
    },
    {
        id: 2,
        headline: "Major Candidate Drops Out of Presidential Race",
        context: "Third-party candidate withdraws, endorses frontrunner",
        question: "What happens to the frontrunner's winning probability?",
        correctAnswer: "up",
        explanation: "Correct! Consolidation of support increases the frontrunner's chances. You're a natural analyst."
    },
    {
        id: 3,
        headline: "Company Misses Earnings Expectations",
        context: "Tech giant reports 20% revenue decline",
        question: "What happens to 'Stock Hits New High' market?",
        correctAnswer: "down",
        explanation: "Perfect! Bad earnings = lower stock price probability. This is how you trade events, not charts."
    }
];

export function MiniAcademy() {
    const [currentScenario, setCurrentScenario] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);

    const scenario = SCENARIOS[currentScenario];
    const isCorrect = selectedAnswer === scenario.correctAnswer;

    const handleAnswer = (answer: string) => {
        setSelectedAnswer(answer);
        setShowResult(true);
        if (answer === scenario.correctAnswer) {
            setScore(score + 1);
        }
    };

    const handleNext = () => {
        if (currentScenario < SCENARIOS.length - 1) {
            setCurrentScenario(currentScenario + 1);
            setSelectedAnswer(null);
            setShowResult(false);
        } else {
            // Reset to beginning
            setCurrentScenario(0);
            setSelectedAnswer(null);
            setShowResult(false);
            setScore(0);
        }
    };

    return (
        <section className="relative z-10 max-w-5xl mx-auto px-6 py-32">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Section Header */}
            <div className="relative text-center space-y-4 mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider mb-6">
                        <Sparkles className="w-3 h-3" /> Test Your Instincts
                    </div>

                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white leading-tight">
                        You're Already an Analyst.
                        <br />
                        <span className="text-zinc-500">You Just Didn't Know It.</span>
                    </h2>

                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
                        In Forex, mastering technical analysis takes years. In prediction markets, it takes seconds.
                    </p>
                </motion.div>
            </div>

            {/* Interactive Quiz Card */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative"
            >
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur-xl opacity-30" />

                <div className="relative bg-gradient-to-b from-[#131722] to-[#0B0E14] border border-[#2E3A52] rounded-3xl p-8 md:p-12">

                    {/* Score Indicator */}
                    <div className="flex justify-between items-center mb-8 pb-6 border-b border-zinc-800">
                        <div className="text-sm font-mono text-zinc-500">
                            Question {currentScenario + 1} of {SCENARIOS.length}
                        </div>
                        <div className="text-sm font-mono text-zinc-500">
                            Score: <span className="text-green-400 font-bold">{score}/{SCENARIOS.length}</span>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentScenario}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* News Headline */}
                            <div className="mb-8 space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                                    📰 Breaking News
                                </div>

                                <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
                                    {scenario.headline}
                                </h3>

                                <p className="text-zinc-400 text-lg">
                                    {scenario.context}
                                </p>
                            </div>

                            {/* Question */}
                            <div className="mb-8 p-6 bg-[#1A232E]/50 border border-[#2E3A52] rounded-2xl">
                                <p className="text-lg font-bold text-white">
                                    {scenario.question}
                                </p>
                            </div>

                            {/* Answer Buttons */}
                            {!showResult ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleAnswer("up")}
                                        className="group relative overflow-hidden bg-green-500/10 hover:bg-green-500/20 border-2 border-green-500/30 hover:border-green-500/50 rounded-2xl p-6 transition-all duration-300 hover:scale-105 active:scale-95"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex flex-col items-center gap-3">
                                            <TrendingUp className="w-8 h-8 text-green-400" />
                                            <span className="text-xl font-black text-green-400">Price Goes UP</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => handleAnswer("down")}
                                        className="group relative overflow-hidden bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/30 hover:border-red-500/50 rounded-2xl p-6 transition-all duration-300 hover:scale-105 active:scale-95"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex flex-col items-center gap-3">
                                            <TrendingDown className="w-8 h-8 text-red-400" />
                                            <span className="text-xl font-black text-red-400">Price Goes DOWN</span>
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {/* Result Feedback */}
                                    <div className={`p-8 rounded-2xl border-2 ${isCorrect
                                            ? 'bg-green-500/10 border-green-500/30'
                                            : 'bg-red-500/10 border-red-500/30'
                                        }`}>
                                        <div className="flex items-start gap-4 mb-4">
                                            {isCorrect ? (
                                                <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
                                            ) : (
                                                <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
                                            )}
                                            <div>
                                                <h4 className={`text-2xl font-black mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'
                                                    }`}>
                                                    {isCorrect ? 'Correct!' : 'Not Quite'}
                                                </h4>
                                                <p className="text-zinc-300 text-lg leading-relaxed">
                                                    {isCorrect ? scenario.explanation : `The correct answer was ${scenario.correctAnswer === 'up' ? 'UP' : 'DOWN'}. ${scenario.explanation}`}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleNext}
                                            className="w-full mt-6 bg-[#2E81FF] hover:bg-[#2E81FF]/90 text-white font-bold py-4 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
                                        >
                                            {currentScenario < SCENARIOS.length - 1 ? 'Next Question' : 'Try Again'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                </div>
            </motion.div>

            {/* Bottom Message */}
            {!showResult && (
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center mt-12"
                >
                    <p className="text-zinc-500 text-sm">
                        This is how prediction markets work. <span className="text-white font-bold">If you can read the news, you can trade.</span>
                    </p>
                </motion.div>
            )}
        </section>
    );
}
