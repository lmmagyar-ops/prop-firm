"use client";

import Link from "next/link";
import { ArrowRight, Clock, TrendingUp, BookOpen, Lightbulb, BarChart3 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import ScrollReveal from "@/components/reactbits/ScrollReveal";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import SplitText from "@/components/reactbits/SplitText";
import DecryptedText from "@/components/reactbits/DecryptedText";

/* ─── Blog Post Data ──────────────────────────────────────── */
interface BlogPost {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    readTime: string;
    date: string;
    featured?: boolean;
    icon: React.ElementType;
}

const BLOG_POSTS: BlogPost[] = [
    {
        slug: "what-are-prediction-markets",
        title: "What Are Prediction Markets? A Complete Guide",
        excerpt:
            "Prediction markets let you trade on the outcome of real-world events. Learn how they work, why they're more accurate than polls, and how to profit from them.",
        category: "Education",
        readTime: "8 min read",
        date: "Feb 9, 2026",
        featured: true,
        icon: BookOpen,
    },
    {
        slug: "prediction-markets-vs-sports-betting",
        title: "Prediction Markets vs. Sports Betting: Key Differences",
        excerpt:
            "They look similar on the surface, but prediction markets and sports betting are fundamentally different. Here's why that matters for your strategy.",
        category: "Education",
        readTime: "6 min read",
        date: "Feb 7, 2026",
        featured: true,
        icon: BarChart3,
    },
    {
        slug: "how-to-pass-prediction-market-evaluation",
        title: "How to Pass Your Prediction Market Evaluation",
        excerpt:
            "A step-by-step strategy guide for passing the Predictions Firm evaluation. Risk management, position sizing, and market selection tips from funded traders.",
        category: "Strategy",
        readTime: "10 min read",
        date: "Feb 5, 2026",
        featured: true,
        icon: TrendingUp,
    },
    {
        slug: "risk-management-prediction-markets",
        title: "Risk Management for Prediction Market Traders",
        excerpt:
            "Position sizing, max drawdown strategies, and how to manage risk when trading binary outcomes. The framework our top traders use.",
        category: "Strategy",
        readTime: "7 min read",
        date: "Feb 3, 2026",
        icon: Lightbulb,
    },
    {
        slug: "understanding-event-probability",
        title: "Understanding Event Probability and Market Pricing",
        excerpt:
            "How prediction market prices reflect real-world probabilities, and how to spot mispriced markets for profitable trades.",
        category: "Analysis",
        readTime: "9 min read",
        date: "Feb 1, 2026",
        icon: BarChart3,
    },
    {
        slug: "why-prop-firms-prediction-markets",
        title: "Why Prop Firms Are Coming to Prediction Markets",
        excerpt:
            "The prediction market industry is booming. Here's why prop firms are the natural next step — and why traders should pay attention.",
        category: "Industry",
        readTime: "5 min read",
        date: "Jan 28, 2026",
        icon: TrendingUp,
    },
];

/* ─── Category Badge ──────────────────────────────────────── */
function CategoryBadge({ category }: { category: string }) {
    const colorMap: Record<string, string> = {
        Education: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        Strategy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        Analysis: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        Industry: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };

    return (
        <span
            className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${colorMap[category] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                }`}
        >
            {category}
        </span>
    );
}

/* ─── Featured Post Card ──────────────────────────────────── */
function FeaturedCard({ post }: { post: BlogPost }) {
    const Icon = post.icon;
    return (
        <SpotlightCard
            className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/30 h-full group"
            spotlightColor="rgba(41, 175, 115, 0.08)"
            spotlightSize={400}
        >
            <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-4">
                    <CategoryBadge category={post.category} />
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                    </span>
                </div>

                <div className="flex items-start gap-4 mb-4">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/10 shrink-0">
                        <Icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white group-hover:text-emerald-300 transition-colors leading-tight">
                        {post.title}
                    </h2>
                </div>

                <p className="text-zinc-400 text-sm leading-relaxed mb-6 flex-1">
                    {post.excerpt}
                </p>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{post.date}</span>
                    <span className="text-sm text-emerald-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read article <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                </div>
            </div>
        </SpotlightCard>
    );
}

/* ─── Regular Post Card ───────────────────────────────────── */
function PostCard({ post }: { post: BlogPost }) {
    const Icon = post.icon;
    return (
        <div className="group p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
                <CategoryBadge category={post.category} />
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                </span>
            </div>

            <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-zinc-800/50 shrink-0">
                    <Icon className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors leading-tight">
                    {post.title}
                </h3>
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                {post.excerpt}
            </p>

            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">{post.date}</span>
                <span className="text-sm text-emerald-400/70 font-medium flex items-center gap-1 group-hover:text-emerald-400 group-hover:gap-2 transition-all">
                    Read <ArrowRight className="w-3.5 h-3.5" />
                </span>
            </div>
        </div>
    );
}

/* ─── Blog Page ───────────────────────────────────────────── */
export default function BlogPage() {
    const featuredPosts = BLOG_POSTS.filter((p) => p.featured);
    const regularPosts = BLOG_POSTS.filter((p) => !p.featured);

    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />

            {/* Hero */}
            <section className="relative pt-32 pb-16 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-6xl font-medium mb-6">
                        <SplitText
                            text="Trading"
                            className="text-white"
                            delay={0.04}
                            duration={0.5}
                            splitType="words"
                        />{" "}
                        <SplitText
                            text="Insights"
                            className="text-[#29af73]"
                            delay={0.04}
                            duration={0.5}
                            splitType="words"
                        />
                    </h1>
                    <ScrollReveal delay={0.3}>
                        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                            Prediction market strategies, risk management frameworks, and industry
                            analysis from the world&apos;s first prediction market prop firm.
                        </p>
                    </ScrollReveal>
                </div>
            </section>

            {/* Featured Posts */}
            <section className="py-12 px-6">
                <div className="max-w-5xl mx-auto">
                    <ScrollReveal>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400/70 mb-8">
                            <DecryptedText
                                text="Featured Articles"
                                speed={40}
                                maxIterations={8}
                                animateOn="view"
                                className="text-emerald-400/70"
                                encryptedClassName="text-emerald-400/30"
                            />
                        </h2>
                    </ScrollReveal>

                    <div className="grid md:grid-cols-3 gap-6">
                        {featuredPosts.map((post, i) => (
                            <ScrollReveal key={post.slug} delay={i * 0.1}>
                                <FeaturedCard post={post} />
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* All Posts */}
            <section className="py-12 px-6 border-t border-zinc-800/50">
                <div className="max-w-5xl mx-auto">
                    <ScrollReveal>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-8">
                            <DecryptedText
                                text="All Articles"
                                speed={40}
                                maxIterations={8}
                                animateOn="view"
                                className="text-zinc-500"
                                encryptedClassName="text-zinc-600"
                            />
                        </h2>
                    </ScrollReveal>

                    <div className="grid md:grid-cols-2 gap-5">
                        {regularPosts.map((post, i) => (
                            <ScrollReveal key={post.slug} delay={i * 0.08}>
                                <PostCard post={post} />
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Newsletter CTA */}
            <section className="py-20 px-6 border-t border-zinc-800/50">
                <div className="max-w-2xl mx-auto text-center">
                    <ScrollReveal>
                        <h2 className="text-2xl font-bold mb-4">Stay Ahead of the Markets</h2>
                        <p className="text-zinc-400 mb-8">
                            Get weekly prediction market insights, trading strategies, and exclusive
                            analysis delivered to your inbox.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                            <input
                                type="email"
                                placeholder="your@email.com"
                                className="flex-1 px-4 py-3 rounded-full bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                            />
                            <button className="pill-btn pill-btn-mint px-6 py-3 text-sm font-bold whitespace-nowrap">
                                Subscribe
                            </button>
                        </div>
                        <p className="text-xs text-zinc-600 mt-3">
                            No spam. Unsubscribe anytime.
                        </p>
                    </ScrollReveal>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-zinc-800 py-8 px-6">
                <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
                    <Link href="/" className="hover:text-white transition-colors">Home</Link>
                    <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
                    <Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
                    <Link href="/about" className="hover:text-white transition-colors">About</Link>
                    <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                    <Link href="/login" className="hover:text-white transition-colors">Login</Link>
                </div>
            </footer>
        </div>
    );
}
