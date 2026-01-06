"use client";

import { ChevronRight, ArrowRight } from "lucide-react";

const FAQ_ITEMS = [
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
];

export function FAQSection() {
    return (
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
                {FAQ_ITEMS.map((faq, i) => (
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
    );
}
