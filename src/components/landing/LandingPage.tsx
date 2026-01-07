"use client";

import { useState, useEffect, useRef } from "react";
import { Zap, ShieldCheck, Wallet, ArrowRight } from "lucide-react";
import Link from "next/link";

// Import extracted sections
import { QuizSection } from "./QuizSection";
import { ComparisonSection } from "./ComparisonSection";
import { FAQSection } from "./FAQSection";

export function LandingPage() {
    const [activeStep, setActiveStep] = useState(0);
    const timelineRef = useRef<HTMLDivElement>(null);

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
            <PressLogos />

            {/* How It Works Section */}
            <HowItWorksSection activeStep={activeStep} timelineRef={timelineRef} />

            {/* Pricing Section */}
            <PricingSection />

            {/* Interactive Quiz Section */}
            <QuizSection />

            {/* Comparison Table Section */}
            <ComparisonSection />

            {/* FAQ Section */}
            <FAQSection />

            {/* Footer */}
            <Footer />
        </div>
    );
}

function PressLogos() {
    return (
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
    );
}

interface HowItWorksSectionProps {
    activeStep: number;
    timelineRef: React.RefObject<HTMLDivElement | null>;
}

function HowItWorksSection({ activeStep, timelineRef }: HowItWorksSectionProps) {
    const steps = [
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
    ];

    return (
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

            <div className="relative">
                {/* Connecting Line (Desktop) */}
                <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-[var(--vapi-border)]">
                    <div
                        className="h-full bg-gradient-to-r from-[var(--vapi-mint)] via-[var(--vapi-mint)] to-transparent transition-all duration-1000 ease-out"
                        style={{ width: `${(activeStep / 2) * 100}%` }}
                    />
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {steps.map((item, i) => (
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
    );
}

function PricingSection() {
    const tiers = [
        {
            name: "Scout",
            balance: "$5K",
            desc: "Perfect for learning market mechanics.",
            price: 79,
            profitTarget: "$500 (10%)",
            maxDrawdown: "8%",
            dailyLoss: "4%",
            popular: false,
        },
        {
            name: "Grinder",
            balance: "$10K",
            desc: "The standard for serious traders.",
            price: 149,
            profitTarget: "$1,000 (10%)",
            maxDrawdown: "10%",
            dailyLoss: "5%",
            popular: true,
        },
        {
            name: "Executive",
            balance: "$25K",
            desc: "Maximum capital for experienced traders.",
            price: 299,
            profitTarget: "$2,500 (10%)",
            maxDrawdown: "10%",
            dailyLoss: "5%",
            popular: false,
        },
    ];

    return (
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
                {tiers.map((tier, i) => (
                    <div
                        key={i}
                        className={`group relative thin-border-card rounded-3xl p-8 flex flex-col transition-all duration-300 ${tier.popular
                            ? 'border-[var(--vapi-mint)]/40 shadow-[0_0_60px_-20px_var(--vapi-mint)] hover:-translate-y-2'
                            : 'hover:border-[var(--vapi-mint)]/40 hover:shadow-[0_0_50px_-20px_var(--vapi-mint)] hover:-translate-y-1'
                            }`}
                    >
                        {tier.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[var(--vapi-mint)] text-black mono-label text-[10px] animate-pulse">
                                Most Popular
                            </div>
                        )}

                        <div className={`mono-label mb-2 ${tier.popular ? 'text-[var(--vapi-mint)]' : 'text-[var(--vapi-gray-text)]'}`}>
                            {tier.name}
                        </div>
                        <div className="text-5xl font-black text-white mb-2 group-hover:text-gradient-mint transition-all">
                            {tier.balance}
                        </div>
                        <p className="text-[var(--vapi-gray-text)] text-sm mb-6">{tier.desc}</p>

                        <div className="flex-1 space-y-0 text-sm">
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Profit Target</span>
                                <span className="text-white font-mono">{tier.profitTarget.split(' ')[0]} <span className="text-[var(--vapi-mint)]">{tier.profitTarget.split(' ')[1]}</span></span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Max Drawdown</span>
                                <span className="text-white font-mono">{tier.maxDrawdown}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-[var(--vapi-border)]">
                                <span className="text-[var(--vapi-gray-text)]">Daily Loss Limit</span>
                                <span className="text-white font-mono">{tier.dailyLoss}</span>
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
                            <div className="text-3xl font-black text-white mb-4">${tier.price}</div>
                            <Link href={`/signup?intent=buy_evaluation&tier=${tier.name.toLowerCase()}&price=${tier.price}`} className="block">
                                <button className={`w-full py-4 rounded-full font-bold transition-all ${tier.popular
                                    ? 'pill-btn pill-btn-mint flex items-center justify-center gap-2'
                                    : 'thin-border-card text-white group-hover:bg-white group-hover:text-black'
                                    }`}>
                                    Start Challenge {tier.popular && <ArrowRight className="w-4 h-4" />}
                                </button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer className="relative z-10 border-t border-[var(--vapi-border)] py-16 mt-24">
            <div className="max-w-6xl mx-auto px-6 text-center">
                <div className="flex justify-center items-center gap-8 mono-label text-[var(--vapi-gray-text)] mb-6">
                    <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
                    <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
                    <span className="hover:text-white cursor-pointer transition-colors">Risk Disclosure</span>
                </div>
                <p className="text-[var(--vapi-gray-text)] text-sm">
                    © 2025 Propshot via Polymarket Data. All rights reserved.<br />
                    <span className="text-white/30">This is a simulated trading environment. No real funds are at risk during evaluation.</span>
                </p>
            </div>
        </footer>
    );
}
