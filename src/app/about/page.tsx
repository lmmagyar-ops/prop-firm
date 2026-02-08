import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, Zap, Target, Users } from "lucide-react";

/**
 * About Page - SEO-optimized company information
 * 
 * This page exists primarily for:
 * 1. SEO juice (internal linking + keyword content)
 * 2. Trust building (company story)
 * 3. Google Business Profile eligibility
 */

export const metadata: Metadata = {
    title: "About Us",
    description: "Learn about Predictions Firm, the world's first prediction market prop firm. We fund traders to trade on Polymarket and Kalshi with our capital.",
    openGraph: {
        title: "About Predictions Firm - Prediction Market Prop Firm",
        description: "Learn about Predictions Firm, the world's first prediction market prop firm.",
    },
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Hero */}
            <section className="relative py-24 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-6xl font-medium mb-6">
                        The Future of <span className="text-[#29af73]">Prop Trading</span>
                    </h1>
                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                        We're building the first prop firm dedicated to prediction markets.
                        Trade on events, not just charts.
                    </p>
                </div>
            </section>

            {/* Mission */}
            <section className="py-16 px-6 border-t border-zinc-800">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6">Our Mission</h2>
                    <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                        Traditional prop firms focus on forex and futures. We saw an opportunity
                        in the rapidly growing prediction market space—platforms like Polymarket
                        and Kalshi that let you trade on real-world events.
                    </p>
                    <p className="text-lg text-zinc-400 leading-relaxed">
                        Our mission is simple: find talented traders, fund them with our capital,
                        and share in the profits. No personal capital at risk. No complicated
                        fee structures. Just skill-based trading.
                    </p>
                </div>
            </section>

            {/* Values */}
            <section className="py-16 px-6 bg-zinc-900/50">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold mb-8">What We Stand For</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <ValueCard
                            icon={Shield}
                            title="Transparency"
                            description="Clear rules, no hidden fees, straightforward profit splits. What you see is what you get."
                        />
                        <ValueCard
                            icon={Zap}
                            title="Speed"
                            description="Fast evaluations, quick funding, and bi-weekly USDC payouts. We respect your time."
                        />
                        <ValueCard
                            icon={Target}
                            title="Fair Evaluation"
                            description="Reasonable profit targets and drawdown limits designed for real trading, not impossible challenges."
                        />
                        <ValueCard
                            icon={Users}
                            title="Trader First"
                            description="We succeed when you succeed. Up to 90% profit split means we're aligned with your goals."
                        />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6 text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-3xl font-bold mb-6">Ready to Get Funded?</h2>
                    <p className="text-zinc-400 mb-8">
                        Start your evaluation today. No experience in prediction markets required—just
                        good trading instincts and risk management.
                    </p>
                    <Link
                        href="/signup"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-[#29af73] text-white font-semibold rounded-full hover:bg-[#29af73]/90 transition-colors"
                    >
                        Start Your Challenge
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-zinc-800 py-8 px-6">
                <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
                    <Link href="/" className="hover:text-white">Home</Link>
                    <Link href="/faq" className="hover:text-white">FAQ</Link>
                    <Link href="/terms" className="hover:text-white">Terms</Link>
                    <Link href="/login" className="hover:text-white">Login</Link>
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
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <Icon className="w-8 h-8 text-[#29af73] mb-4" />
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-zinc-400 text-sm">{description}</p>
        </div>
    );
}
