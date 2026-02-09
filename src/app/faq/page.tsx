"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Rocket, TrendingUp, DollarSign, Shield, CheckCircle, CreditCard, Headphones } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import ScrollReveal from "@/components/reactbits/ScrollReveal";

interface FAQItem {
    question: string;
    answer: string;
    category: string;
}

const faqs: FAQItem[] = [
    // Getting Started
    {
        category: "Getting Started",
        question: "What exactly is a prop firm, and how is this different from my personal trading account?",
        answer: "Simple: we give you capital, you make profitable trades, and we split the profits. Think of it like getting sponsored. Instead of risking your own $10,000, you trade with ours. You prove your skills in an evaluation, and if you pass, you get access to real capital. You keep 80-90% of what you make, we handle the risk. It's a win-win."
    },
    {
        category: "Getting Started",
        question: "I've never traded prediction markets before. Can I still do this?",
        answer: "You can, but we'd recommend getting familiar with how Polymarket or Kalshi works first. This isn't a training program—it's an evaluation of existing skills. Paper trade for a week or two, learn how markets resolve, understand the spreads. Then come back when you're confident."
    },
    {
        category: "Getting Started",
        question: "Can I run multiple accounts at the same time?",
        answer: "Absolutely. Lots of our best traders run 3-5 funded accounts simultaneously to scale their edge. Just don't hedge between them or share strategies—that violates our fair trading policy."
    },
    {
        category: "Getting Started",
        question: "What happens if I blow an account?",
        answer: "It ends. No second chances on that specific challenge. But here's the thing: failure is part of the game. Learn from it, adjust your risk management, and grab a new challenge when you're ready. Some of our most successful traders failed 2-3 times before getting funded."
    },

    // Challenge Rules
    {
        category: "Challenge Rules",
        question: "What are the profit targets, and how long do I have?",
        answer: "Phase 1 (Challenge): Hit 10% profit. Phase 2 (Verification): Hit 5% profit. No time limits on either. Take a week, take six months—we don't care. We're looking for consistency, not speed. Once you're funded, there are no profit targets. Just trade well and request payouts."
    },
    {
        category: "Challenge Rules",
        question: "Explain the daily loss limit like I'm five.",
        answer: "You can't lose more than 5% of your starting balance in a single trading day (resets at midnight UTC). So on a $10k account, if you're down $500 in a day, you're done trading until tomorrow. This keeps you from revenge trading your way into a hole."
    },
    {
        category: "Challenge Rules",
        question: "What's this 'max drawdown' thing?",
        answer: "Your account balance can never drop more than 10% below your highest point (your 'high-water mark'). Start with $10k, run it up to $11k, and your max drawdown is now $9,900 (10% below $11k). Hit that number and the challenge ends. It's a trailing stop-loss for your entire account."
    },
    {
        category: "Challenge Rules",
        question: "Can I hold positions overnight? What about over weekends?",
        answer: "Yes and yes. Swing trade all you want. Just know that open positions still count toward your risk limits, and in funded accounts, there's a small overnight 'carry cost' to discourage reckless leverage."
    },
    {
        category: "Challenge Rules",
        question: "What trading strategies are banned?",
        answer: "Hedging across accounts, copy trading, arbitrage between platforms, and sniping already-resolved markets. Basically: don't game the system. Trade legitimately and you'll never have an issue."
    },

    // Trading
    {
        category: "Trading & Markets",
        question: "Polymarket or Kalshi—which should I choose?",
        answer: "Whichever you're more comfortable with. Polymarket has more volume and wild markets (crypto, politics, entertainment). Kalshi is CFTC-regulated with cleaner, more structured contracts. Pick your platform at the start of each challenge."
    },
    {
        category: "Trading & Markets",
        question: "Is there a minimum trade size?",
        answer: "$10 minimum per trade. Keeps things meaningful and prevents micro-scalping nonsense."
    },
    {
        category: "Trading & Markets",
        question: "Can I trade during big news events?",
        answer: "Hell yes. That's when prediction markets are most active. Election nights, Fed announcements, surprise geopolitical events—go for it. Just don't snipe outcomes that have already resolved (we monitor this)."
    },
    {
        category: "Trading & Markets",
        question: "What happens when a market resolves?",
        answer: "Winners get paid instantly, losers eat the loss. All resolution payouts count toward your P&L and payout calculations. If you had 1000 shares of 'Yes' at $0.60 and it resolves 'Yes,' you get $1000."
    },

    // Payouts
    {
        category: "Payouts",
        question: "How much do I actually keep?",
        answer: "80% by default, 90% if you buy the Profit Split add-on. We're not here to nickel-and-dime you. You take the risk (of your time and effort), we take the capital risk. Split the upside."
    },
    {
        category: "Payouts",
        question: "When can I take my first payout?",
        answer: "After you pass verification and trade for at least 5 active days in your funded account. Then request as often as you want—just keep the $100 minimum in mind."
    },
    {
        category: "Payouts",
        question: "How fast do payouts process?",
        answer: "1-3 business days. We're not one of those firms that makes you wait 30 days. You earned it, you get it."
    },
    {
        category: "Payouts",
        question: "What's the max I can withdraw per cycle?",
        answer: "Your starting balance. So a $10k account caps at $10k per payout cycle. Run up $50k in profit? Take $10k now, trade the rest to $60k, take another $10k next cycle. Rinse and repeat."
    },
    {
        category: "Payouts",
        question: "Crypto or PayPal?",
        answer: "Your choice. We support BTC, ETH, USDC via Confirmo, or traditional PayPal payouts. Moonpay is also available as a backup. (Integration launches after business registration—about 2 weeks.)"
    },

    // Security
    {
        category: "Security",
        question: "Do I really need 2FA?",
        answer: "Yes. Seriously. We've seen accounts get compromised because someone reused a password from a 2019 data breach. Takes 60 seconds to set up Google Authenticator. Do it."
    },
    {
        category: "Security",
        question: "Can I change my email?",
        answer: "Yep, in Settings → User Info. You'll need to verify the new email before it goes live."
    },
    {
        category: "Security",
        question: "What if someone gets into my account?",
        answer: "Email support@projectxtrading.com immediately. We'll lock it down and investigate. Pro tip: enable 2FA and this will never happen."
    },

    // KYC
    {
        category: "KYC & Verification",
        question: "Why do I need to send you my ID?",
        answer: "Because we're paying you real money, and every country on earth requires financial firms to verify identities. We use SumSub (bank-level security), and your data never touches our servers directly."
    },
    {
        category: "KYC & Verification",
        question: "When do I actually need to do KYC?",
        answer: "Only after you pass a challenge and request funded account access. You can buy and attempt challenges without it."
    },
    {
        category: "KYC & Verification",
        question: "What documents do you need?",
        answer: "Government ID (passport, driver's license, national ID), a selfie video for liveness check, and proof of address (utility bill or bank statement from the last 90 days)."
    },
    {
        category: "KYC & Verification",
        question: "How long does verification take?",
        answer: "Usually 24-48 hours. Occasionally up to 5 days if something's unclear (blurry photo, expired doc, etc.). We'll let you know if we need anything."
    },

    // Fees
    {
        category: "Fees & Costs",
        question: "How much does a challenge cost?",
        answer: "$150 for $10k, $300 for $25k, $500 for $50k, $1000 for $100k. Check the Pricing page for current promos."
    },
    {
        category: "Fees & Costs",
        question: "Do I get the challenge fee back?",
        answer: "Yes—it's fully refunded with your first payout. Think of it as a refundable deposit. Pass the challenge, make a profit, get it all back."
    },
    {
        category: "Fees & Costs",
        question: "Are there monthly fees?",
        answer: "Not during the challenge or verification phases. Once you're funded, it's $50/month for the platform (covers data, infrastructure, support). That's it."
    },
    {
        category: "Fees & Costs",
        question: "Any hidden fees I should know about?",
        answer: "Nope. You pay: (1) challenge fee (refundable), (2) $50/month in funded phase, (3) market spreads from Polymarket/Kalshi, and (4) network fees for crypto payouts if applicable. Complete transparency."
    },

    // Support
    {
        category: "Support",
        question: "The site isn't loading. What do I do?",
        answer: "Clear your cache, try incognito mode, or switch browsers (Chrome/Firefox/Safari all work). Check our status page. Still broken? Email support with your browser and OS."
    },
    {
        category: "Support",
        question: "My trade didn't go through. Help?",
        answer: "Check: (1) Do you have enough balance? (2) Did you hit your daily loss limit? (3) Are you past max drawdown? (4) Stable internet? If all clear and it's still broken, contact support ASAP."
    },
    {
        category: "Support",
        question: "How do I report a bug?",
        answer: "bugs@projectxtrading.com. Include steps to reproduce, screenshots, browser/device info. We reply within 24 hours."
    },
    {
        category: "Support",
        question: "Do you have a mobile app?",
        answer: "Not yet. The site works great on mobile browsers for now. Native apps are coming Q2 2026."
    },
];

const categories = [
    { name: "All", icon: null },
    { name: "Getting Started", icon: Rocket },
    { name: "Challenge Rules", icon: TrendingUp },
    { name: "Trading & Markets", icon: TrendingUp },
    { name: "Payouts", icon: DollarSign },
    { name: "Security", icon: Shield },
    { name: "KYC & Verification", icon: CheckCircle },
    { name: "Fees & Costs", icon: CreditCard },
    { name: "Support", icon: Headphones },
];

export default function FAQPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const filteredFAQs = faqs.filter((faq) => {
        const matchesSearch =
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-[#0D1117] text-white">
            <Navbar />

            {/* Header */}
            <div className="border-b border-white/5 bg-gradient-to-b from-[#1A232E] to-[#0D1117]">
                <div className="max-w-5xl mx-auto px-6 pt-28 pb-16">
                    <h1 className="text-5xl font-bold mb-4">Frequently Asked Questions</h1>
                    <p className="text-xl text-zinc-400">
                        Everything you need to know about trading with us. Can&apos;t find an answer?{" "}
                        <Link href="/contact" className="text-primary hover:text-primary/80 underline">
                            Hit up support
                        </Link>
                        .
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-12">
                {/* Search */}
                <div className="mb-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <Input
                            type="text"
                            placeholder="Search questions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 bg-[#1A232E] border-[#2E3A52] text-white placeholder:text-zinc-500 h-14 text-lg"
                        />
                    </div>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap gap-2 mb-12">
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = selectedCategory === cat.name;
                        return (
                            <button
                                key={cat.name}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${isActive
                                    ? "bg-primary text-white"
                                    : "bg-[#1A232E] text-zinc-400 hover:bg-[#2E3A52] hover:text-white"
                                    }`}
                            >
                                {Icon && <Icon className="w-4 h-4" />}
                                {cat.name}
                            </button>
                        );
                    })}
                </div>

                {/* FAQ List */}
                <div className="space-y-3">
                    {filteredFAQs.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-zinc-500 text-lg">No questions found matching "{searchQuery}"</p>
                            <p className="text-zinc-600 text-sm mt-2">
                                Try a different search term or{" "}
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="text-primary hover:text-primary/80 underline"
                                >
                                    clear your search
                                </button>
                            </p>
                        </div>
                    ) : (
                        filteredFAQs.map((faq, index) => {
                            const isOpen = openIndex === index;
                            return (
                                <ScrollReveal key={index} delay={Math.min(index * 0.04, 0.3)}>
                                    <div
                                        className="bg-[#1A232E] border border-[#2E3A52] rounded-xl overflow-hidden hover:border-primary/30 transition-all"
                                    >
                                        <button
                                            onClick={() => setOpenIndex(isOpen ? null : index)}
                                            className="w-full px-6 py-5 flex items-start justify-between gap-4 text-left"
                                        >
                                            <div className="flex-1">
                                                <span className="text-xs text-primary font-medium mb-1 block">
                                                    {faq.category}
                                                </span>
                                                <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
                                            </div>
                                            <ChevronDown
                                                className={`w-5 h-5 text-zinc-500 flex-shrink-0 mt-1 transition-transform ${isOpen ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </button>
                                        {isOpen && (
                                            <div className="px-6 pb-6 pt-2 border-t border-white/5">
                                                <p className="text-zinc-300 leading-relaxed">{faq.answer}</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollReveal>
                            );
                        })
                    )}
                </div>

                {/* CTA */}
                <div className="mt-16 bg-gradient-to-br from-primary/10 to-purple-600/10 border border-primary/20 rounded-2xl p-8 text-center">
                    <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
                    <p className="text-zinc-400 mb-6">
                        Our support team is here to help. Average response time: under 4 hours.
                    </p>
                    <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 rounded-lg font-semibold transition-colors"
                    >
                        <Headphones className="w-5 h-5" />
                        Contact Support
                    </Link>
                </div>
            </div>
        </div>
    );
}
