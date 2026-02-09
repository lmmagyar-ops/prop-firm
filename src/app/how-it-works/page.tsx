"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle, TrendingUp, Shield, DollarSign, Clock, BarChart3, Zap } from "lucide-react";
import { PLANS, CHALLENGE_RULES } from "@/config/plans";
import { Navbar } from "@/components/Navbar";
import ScrollReveal from "@/components/reactbits/ScrollReveal";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import SplitText from "@/components/reactbits/SplitText";
import DecryptedText from "@/components/reactbits/DecryptedText";

export default function HowItWorksPage() {
    const planKeys = Object.keys(PLANS) as (keyof typeof PLANS)[];
    planKeys.sort((a, b) => PLANS[a].price - PLANS[b].price);

    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />

            {/* Hero */}
            <section className="relative pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="mono-label text-[var(--vapi-mint)] mb-4 tracking-widest text-sm">
                        <DecryptedText
                            text="HOW IT WORKS"
                            speed={40}
                            sequential
                            revealDirection="center"
                            className="text-[var(--vapi-mint)]"
                            encryptedClassName="text-[var(--vapi-mint)]/40"
                            animateOn="view"
                        />
                    </p>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-tight mb-6 leading-[1.1]">
                        <SplitText
                            text="One evaluation."
                            className="text-white"
                            delay={0.03}
                            duration={0.5}
                            splitType="chars"
                        />{" "}
                        <SplitText
                            text="Instant funding."
                            className="text-gradient-mint"
                            delay={0.03}
                            duration={0.5}
                            splitType="chars"
                        />
                    </h1>
                    <ScrollReveal delay={0.3}>
                        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                            No multi-phase process. No verification. Pass once and trade prediction markets with our capital.
                            Keep up to 90% of what you earn.
                        </p>
                    </ScrollReveal>
                </div>
            </section>

            {/* 3-Step Flow */}
            <section className="py-20 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-8 md:gap-12">
                        <ScrollReveal delay={0}>
                            <StepCard
                                number={1}
                                icon={DollarSign}
                                title="Buy Your Evaluation"
                                description="Choose your account size and pay the one-time evaluation fee. No subscriptions, no hidden costs. Start trading immediately."
                                detail={`From $${PLANS.scout.price}`}
                            />
                        </ScrollReveal>

                        {/* Connector */}
                        <div className="hidden md:flex items-center justify-center -mx-6">
                            <div className="w-full h-px bg-gradient-to-r from-[var(--vapi-mint)]/40 to-[var(--vapi-mint)]/40 relative">
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-[var(--vapi-mint)] rounded-full" />
                            </div>
                        </div>

                        <ScrollReveal delay={0.15}>
                            <StepCard
                                number={2}
                                icon={TrendingUp}
                                title="Trade Prediction Markets"
                                description="Trade real Polymarket data — politics, sports, tech, economics. Hit your profit target within 60 days while staying within risk limits."
                                detail="200+ live markets"
                            />
                        </ScrollReveal>

                        {/* Connector */}
                        <div className="hidden md:flex items-center justify-center -mx-6">
                            <div className="w-full h-px bg-gradient-to-r from-[var(--vapi-mint)]/40 to-[var(--vapi-mint)]/40 relative">
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-[var(--vapi-mint)] rounded-full" />
                            </div>
                        </div>

                        <ScrollReveal delay={0.3}>
                            <StepCard
                                number={3}
                                icon={Zap}
                                title="Get Funded"
                                description="Pass the evaluation and start trading with our capital. Keep up to 90% of your profits with bi-weekly payouts."
                                detail="Up to 90% profit split"
                            />
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* Rules at a Glance */}
            <section className="py-20 px-6 bg-zinc-950">
                <div className="max-w-5xl mx-auto">
                    <ScrollReveal>
                        <div className="text-center mb-12">
                            <p className="mono-label text-[var(--vapi-mint)] mb-3 tracking-widest text-sm">
                                <DecryptedText
                                    text="THE RULES"
                                    speed={40}
                                    sequential
                                    revealDirection="center"
                                    className="text-[var(--vapi-mint)]"
                                    encryptedClassName="text-[var(--vapi-mint)]/40"
                                    animateOn="view"
                                />
                            </p>
                            <h2 className="text-3xl md:text-4xl font-medium tracking-tight">Clear. Fair. No surprises.</h2>
                        </div>
                    </ScrollReveal>

                    {/* Rules Comparison Table */}
                    <ScrollReveal delay={0.15}>
                        <div className="rounded-2xl border border-white/5 overflow-hidden">
                            {/* Header */}
                            <div className="grid grid-cols-4 bg-zinc-900/80 border-b border-white/5">
                                <div className="p-5 text-sm font-medium text-zinc-400">Rule</div>
                                {planKeys.map((key) => (
                                    <div key={key} className="p-5 text-center">
                                        <div className="text-sm font-bold text-white">
                                            ${(PLANS[key].size / 1000).toFixed(0)}K
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-0.5">${PLANS[key].price}</div>
                                    </div>
                                ))}
                            </div>

                            <RuleRow
                                label="Profit Target"
                                icon={BarChart3}
                                values={planKeys.map((k) => `$${PLANS[k].profitTarget.toLocaleString()}`)}
                            />
                            <RuleRow
                                label="Max Drawdown"
                                icon={Shield}
                                values={planKeys.map((k) => `${PLANS[k].maxDrawdownPercent}%`)}
                            />
                            <RuleRow
                                label="Daily Loss Limit"
                                icon={Shield}
                                values={planKeys.map((k) => `${PLANS[k].dailyLossPercent}%`)}
                            />
                            <RuleRow
                                label="Time Limit"
                                icon={Clock}
                                values={planKeys.map(() => CHALLENGE_RULES.duration)}
                                uniform
                            />
                            <RuleRow
                                label="Min Trading Days"
                                icon={Clock}
                                values={planKeys.map(() => CHALLENGE_RULES.minTradingDays)}
                                uniform
                            />
                            <RuleRow
                                label="Profit Split"
                                icon={DollarSign}
                                values={planKeys.map(() => "Up to 90%")}
                                uniform
                                highlight
                            />
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* What Markets */}
            <section className="py-20 px-6 border-t border-white/5">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal>
                        <div className="text-center mb-12">
                            <p className="mono-label text-[var(--vapi-mint)] mb-3 tracking-widest text-sm">
                                <DecryptedText
                                    text="MARKETS"
                                    speed={40}
                                    sequential
                                    revealDirection="start"
                                    className="text-[var(--vapi-mint)]"
                                    encryptedClassName="text-[var(--vapi-mint)]/40"
                                    animateOn="view"
                                />
                            </p>
                            <h2 className="text-3xl md:text-4xl font-medium tracking-tight">Trade on real-world events</h2>
                            <p className="text-zinc-400 mt-4 max-w-2xl mx-auto">
                                Live prices from Polymarket and Kalshi. Eight categories, 200+ active markets.
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { name: "Politics", emoji: "🏛️" },
                            { name: "Sports", emoji: "⚽" },
                            { name: "Technology", emoji: "💻" },
                            { name: "Economics", emoji: "📊" },
                            { name: "Entertainment", emoji: "🎬" },
                            { name: "Science", emoji: "🔬" },
                            { name: "Current Events", emoji: "📰" },
                            { name: "Weather", emoji: "🌡️" },
                        ].map((cat, i) => (
                            <ScrollReveal key={cat.name} delay={i * 0.05}>
                                <SpotlightCard
                                    className="p-4 rounded-xl border border-white/5 bg-zinc-900/30 text-center hover:border-[var(--vapi-mint)]/20 transition-colors"
                                    spotlightColor="rgba(41, 175, 115, 0.12)"
                                    spotlightSize={250}
                                >
                                    <span className="text-2xl mb-2 block">{cat.emoji}</span>
                                    <span className="text-sm text-zinc-300">{cat.name}</span>
                                </SpotlightCard>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* After You Pass */}
            <section className="py-20 px-6 bg-zinc-950">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal>
                        <div className="text-center mb-12">
                            <p className="mono-label text-[var(--vapi-mint)] mb-3 tracking-widest text-sm">
                                <DecryptedText
                                    text="AFTER YOU PASS"
                                    speed={40}
                                    sequential
                                    revealDirection="center"
                                    className="text-[var(--vapi-mint)]"
                                    encryptedClassName="text-[var(--vapi-mint)]/40"
                                    animateOn="view"
                                />
                            </p>
                            <h2 className="text-3xl md:text-4xl font-medium tracking-tight">What happens next?</h2>
                        </div>
                    </ScrollReveal>

                    <div className="grid md:grid-cols-2 gap-6">
                        <ScrollReveal delay={0}>
                            <BenefitCard
                                icon={CheckCircle}
                                title="Instant Funding"
                                description="No waiting period. Pass the evaluation and your funded account is ready immediately. All open positions are auto-closed on transition."
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={0.1}>
                            <BenefitCard
                                icon={DollarSign}
                                title="Up to 90% Profit Split"
                                description="Default 80% split, upgradable to 90%. Industry-leading payout ratio from day one."
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={0.2}>
                            <BenefitCard
                                icon={Clock}
                                title="Bi-Weekly Payouts"
                                description="Request payouts after 5 active trading days. Processing in 1-3 business days. No delays."
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={0.3}>
                            <BenefitCard
                                icon={Shield}
                                title="Same Risk Rules"
                                description="The funded account keeps the same drawdown and daily loss limits. No surprises. Trade the same way you did in evaluation."
                            />
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6 text-center border-t border-white/5">
                <ScrollReveal>
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
                            Ready to prove your edge?
                        </h2>
                        <p className="text-zinc-400 mb-8 text-lg">
                            Choose your account size and start trading today.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/signup"
                                className="pill-btn pill-btn-mint flex items-center gap-2 text-lg px-10 py-5 font-bold"
                            >
                                Get Funded
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                href="/buy-evaluation"
                                className="flex items-center gap-2 text-lg px-8 py-5 font-bold text-white bg-transparent border border-white/20 rounded-full hover:bg-white/10 transition-all"
                            >
                                View Pricing
                            </Link>
                        </div>
                    </div>
                </ScrollReveal>
            </section>

            {/* Footer */}
            <footer className="border-t border-zinc-800 py-8 px-6">
                <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
                    <Link href="/" className="hover:text-white transition-colors">Home</Link>
                    <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
                    <Link href="/about" className="hover:text-white transition-colors">About</Link>
                    <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                    <Link href="/login" className="hover:text-white transition-colors">Login</Link>
                </div>
            </footer>
        </div>
    );
}

/* ─── Helper Components ─── */

function StepCard({
    number,
    icon: Icon,
    title,
    description,
    detail,
}: {
    number: number;
    icon: React.ElementType;
    title: string;
    description: string;
    detail: string;
}) {
    return (
        <SpotlightCard
            className="relative p-6 rounded-2xl border border-white/5 bg-zinc-900/30 hover:border-[var(--vapi-mint)]/20 transition-all group h-full"
            spotlightColor="rgba(41, 175, 115, 0.12)"
            spotlightSize={350}
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--vapi-mint)]/10 border border-[var(--vapi-mint)]/20 flex items-center justify-center text-sm font-bold text-[var(--vapi-mint)]">
                    {number}
                </div>
                <Icon className="w-5 h-5 text-zinc-500 group-hover:text-[var(--vapi-mint)] transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed mb-3">{description}</p>
            <span className="mono-label text-xs text-[var(--vapi-mint)]">{detail}</span>
        </SpotlightCard>
    );
}

function RuleRow({
    label,
    icon: Icon,
    values,
    uniform,
    highlight,
}: {
    label: string;
    icon: React.ElementType;
    values: string[];
    uniform?: boolean;
    highlight?: boolean;
}) {
    return (
        <div className="grid grid-cols-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
            <div className="p-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Icon className="w-4 h-4 text-zinc-600" />
                {label}
            </div>
            {values.map((value, idx) => (
                <div
                    key={idx}
                    className={`p-4 text-center text-sm font-mono ${highlight
                        ? "text-[var(--vapi-mint)] font-bold"
                        : uniform
                            ? "text-zinc-500"
                            : "text-white"
                        }`}
                >
                    {value}
                </div>
            ))}
        </div>
    );
}

function BenefitCard({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
}) {
    return (
        <SpotlightCard
            className="p-6 rounded-xl border border-white/5 bg-zinc-900/30 h-full"
            spotlightColor="rgba(41, 175, 115, 0.10)"
            spotlightSize={300}
        >
            <Icon className="w-6 h-6 text-[var(--vapi-mint)] mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
        </SpotlightCard>
    );
}
