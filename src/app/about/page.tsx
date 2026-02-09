"use client";

import Link from "next/link";
import { ArrowRight, Shield, Zap, Target, Users } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import ScrollReveal from "@/components/reactbits/ScrollReveal";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import SplitText from "@/components/reactbits/SplitText";
import DecryptedText from "@/components/reactbits/DecryptedText";
import ClickSpark from "@/components/reactbits/ClickSpark";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />

            {/* Hero */}
            <section className="relative pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-6xl font-medium mb-6">
                        <SplitText
                            text="The Future of"
                            className="text-white"
                            delay={0.04}
                            duration={0.5}
                            splitType="words"
                        />{" "}
                        <SplitText
                            text="Prop Trading"
                            className="text-[#29af73]"
                            delay={0.04}
                            duration={0.5}
                            splitType="words"
                        />
                    </h1>
                    <ScrollReveal delay={0.3}>
                        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                            We&apos;re building the first prop firm dedicated to prediction markets.
                            Trade on events, not just charts.
                        </p>
                    </ScrollReveal>
                </div>
            </section>

            {/* Mission */}
            <section className="py-16 px-6 border-t border-zinc-800">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal>
                        <h2 className="text-2xl font-bold mb-6">
                            <DecryptedText
                                text="Our Mission"
                                speed={50}
                                sequential
                                revealDirection="start"
                                className="text-white"
                                encryptedClassName="text-zinc-600"
                                animateOn="view"
                            />
                        </h2>
                    </ScrollReveal>
                    <ScrollReveal delay={0.1}>
                        <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                            Traditional prop firms focus on forex and futures. We saw an opportunity
                            in the rapidly growing prediction market space—platforms like Polymarket
                            and Kalshi that let you trade on real-world events.
                        </p>
                    </ScrollReveal>
                    <ScrollReveal delay={0.2}>
                        <p className="text-lg text-zinc-400 leading-relaxed">
                            Our mission is simple: find talented traders, fund them with our capital,
                            and share in the profits. No personal capital at risk. No complicated
                            fee structures. Just skill-based trading.
                        </p>
                    </ScrollReveal>
                </div>
            </section>

            {/* Values */}
            <section className="py-16 px-6 bg-zinc-900/50">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal>
                        <h2 className="text-2xl font-bold mb-8">
                            <DecryptedText
                                text="What We Stand For"
                                speed={50}
                                sequential
                                revealDirection="start"
                                className="text-white"
                                encryptedClassName="text-zinc-600"
                                animateOn="view"
                            />
                        </h2>
                    </ScrollReveal>
                    <div className="grid md:grid-cols-2 gap-6">
                        <ScrollReveal delay={0}>
                            <ValueCard
                                icon={Shield}
                                title="Transparency"
                                description="Clear rules, no hidden fees, straightforward profit splits. What you see is what you get."
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={0.1}>
                            <ValueCard
                                icon={Zap}
                                title="Speed"
                                description="Fast evaluations, quick funding, and bi-weekly USDC payouts. We respect your time."
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={0.2}>
                            <ValueCard
                                icon={Target}
                                title="Fair Evaluation"
                                description="Reasonable profit targets and drawdown limits designed for real trading, not impossible challenges."
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={0.3}>
                            <ValueCard
                                icon={Users}
                                title="Trader First"
                                description="We succeed when you succeed. Up to 90% profit split means we're aligned with your goals."
                            />
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6 text-center">
                <ScrollReveal>
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold mb-6">Ready to Get Funded?</h2>
                        <p className="text-zinc-400 mb-8">
                            Start your evaluation today. No experience in prediction markets required—just
                            good trading instincts and risk management.
                        </p>
                        <ClickSpark sparkColor="#29af73" sparkSize={12} sparkCount={10}>
                            <Link
                                href="/signup"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-[#29af73] text-white font-semibold rounded-full hover:bg-[#29af73]/90 transition-colors"
                            >
                                Start Your Challenge
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </ClickSpark>
                    </div>
                </ScrollReveal>
            </section>

            {/* Footer */}
            <footer className="border-t border-zinc-800 py-8 px-6">
                <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
                    <Link href="/" className="hover:text-white transition-colors">Home</Link>
                    <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
                    <Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
                    <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                    <Link href="/login" className="hover:text-white transition-colors">Login</Link>
                </div>
            </footer>
        </div>
    );
}

function ValueCard({
    icon: Icon,
    title,
    description
}: {
    icon: React.ElementType;
    title: string;
    description: string;
}) {
    return (
        <SpotlightCard
            className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 h-full"
            spotlightColor="rgba(41, 175, 115, 0.10)"
            spotlightSize={300}
        >
            <Icon className="w-8 h-8 text-[#29af73] mb-4" />
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-zinc-400 text-sm">{description}</p>
        </SpotlightCard>
    );
}
