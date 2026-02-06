"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";

/**
 * Testimonials - Social proof carousel for landing page
 * 
 * Anthropic Engineering Standards:
 * - Auto-rotate with pause on hover
 * - Keyboard navigation support
 * - Smooth crossfade animations
 * - Mobile responsive
 */

interface Testimonial {
    id: string;
    name: string;
    location: string;
    tier: "Scout" | "Grinder" | "Executive";
    avatar: string;
    quote: string;
    profit: number;
    rating: 5;
}

/**
 * Testimonial data
 * In production, this could be fetched from CMS or API
 */
const TESTIMONIALS: Testimonial[] = [
    {
        id: "1",
        name: "Marcus T.",
        location: "Austin, TX",
        tier: "Executive",
        avatar: "MT",
        quote: "Finally, a prop firm that understands prediction markets. The evaluation was challenging but fair, and I've already received two payouts.",
        profit: 4200,
        rating: 5,
    },
    {
        id: "2",
        name: "Sarah K.",
        location: "London, UK",
        tier: "Grinder",
        avatar: "SK",
        quote: "The real-time market data and intuitive interface made the transition from sports betting seamless. Highly recommend for anyone serious about event trading.",
        profit: 1850,
        rating: 5,
    },
    {
        id: "3",
        name: "David L.",
        location: "Singapore",
        tier: "Scout",
        avatar: "DL",
        quote: "Started with the Scout tier to test the waters. Passed in just 3 weeks and immediately upgraded. The support team is incredibly responsive.",
        profit: 720,
        rating: 5,
    },
    {
        id: "4",
        name: "Elena R.",
        location: "Miami, FL",
        tier: "Executive",
        avatar: "ER",
        quote: "I've tried three other prop firms. This is the only one with actual prediction market expertise. The risk management tools are next level.",
        profit: 6100,
        rating: 5,
    },
    {
        id: "5",
        name: "James W.",
        location: "Toronto, CA",
        tier: "Grinder",
        avatar: "JW",
        quote: "The 90% profit split on funded accounts is unmatched. Made my first withdrawal within 2 weeks of getting funded.",
        profit: 2340,
        rating: 5,
    },
];

// Tier badge colors
const TIER_COLORS: Record<string, string> = {
    Scout: "bg-zinc-700 text-zinc-300",
    Grinder: "bg-blue-900/50 text-blue-400",
    Executive: "bg-purple-900/50 text-purple-400",
};

/**
 * Star rating component
 */
function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
            {[...Array(5)].map((_, i) => (
                <Star
                    key={i}
                    className={`w-4 h-4 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-zinc-700"
                        }`}
                />
            ))}
        </div>
    );
}

/**
 * Individual testimonial card
 */
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-8 relative"
        >
            {/* Quote icon */}
            <Quote className="absolute top-6 right-6 w-8 h-8 text-zinc-800" />

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#29af73] to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.avatar}
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="text-white font-semibold">{testimonial.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLORS[testimonial.tier]}`}>
                            {testimonial.tier}
                        </span>
                    </div>
                    <p className="text-zinc-500 text-sm">{testimonial.location}</p>
                </div>

                <StarRating rating={testimonial.rating} />
            </div>

            {/* Quote */}
            <blockquote className="text-zinc-300 text-lg leading-relaxed mb-6">
                "{testimonial.quote}"
            </blockquote>

            {/* Profit badge */}
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <span className="text-sm text-zinc-500">Profit earned:</span>
                <span className="text-lg">${testimonial.profit.toLocaleString()}</span>
            </div>
        </motion.div>
    );
}

export function Testimonials() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const goToNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, []);

    const goToPrev = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
    }, []);

    // Auto-rotate every 5 seconds
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(goToNext, 5000);
        return () => clearInterval(interval);
    }, [isPaused, goToNext]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") goToPrev();
            if (e.key === "ArrowRight") goToNext();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [goToNext, goToPrev]);

    return (
        <section
            className="relative py-20 bg-black"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            aria-label="Customer Testimonials"
        >
            <div className="max-w-4xl mx-auto px-6">
                {/* Section header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Trusted by Traders Worldwide
                    </h2>
                    <p className="text-zinc-500 text-lg">
                        Join hundreds of funded traders earning consistent profits
                    </p>
                </div>

                {/* Carousel */}
                <div className="relative">
                    <AnimatePresence mode="wait">
                        <TestimonialCard
                            key={TESTIMONIALS[currentIndex].id}
                            testimonial={TESTIMONIALS[currentIndex]}
                        />
                    </AnimatePresence>

                    {/* Navigation arrows */}
                    <button
                        onClick={goToPrev}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                        aria-label="Previous testimonial"
                    >
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>

                    <button
                        onClick={goToNext}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                        aria-label="Next testimonial"
                    >
                        <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Dot indicators */}
                <div className="flex justify-center gap-2 mt-8" role="tablist">
                    {TESTIMONIALS.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
                                    ? "w-6 bg-[#29af73]"
                                    : "bg-zinc-700 hover:bg-zinc-600"
                                }`}
                            role="tab"
                            aria-selected={index === currentIndex}
                            aria-label={`Go to testimonial ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
