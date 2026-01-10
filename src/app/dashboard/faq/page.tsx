"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle, DollarSign, TrendingUp, CreditCard, Settings, MessageCircle, Zap, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

// FAQ Data organized by category
const faqCategories = [
    {
        id: "general",
        title: "General Questions",
        icon: HelpCircle,
        questions: [
            {
                q: "Is this a scam?",
                a: "No. We are the world's first prediction market-based prop firm. We provide capital for traders to trade on Polymarket and Kalshi. You keep 80-90% of profits. It's a legitimate business model used by hundreds of prop firms in forex/futures - we're just the first to do it for prediction markets."
            },
            {
                q: "Do I risk my own money?",
                a: "No. You pay a one-time evaluation fee ($79/$149/$299 depending on tier), but you never risk your own capital during trading. All positions are funded by us. Your only cost is the evaluation fee, which is refunded with your first payout if you pass."
            },
            {
                q: "What if I lose?",
                a: "Your evaluation ends when you hit the drawdown limit. The challenge fee is non-refundable if you fail. You can purchase a new evaluation when you're ready. Many of our successful traders failed 2-3 times before getting funded - it's part of the learning process."
            },
            {
                q: "How do you make money if challenges are refundable?",
                a: "We make money from the profit split when you succeed (20% base, or 10% if you bought the upgrade). Our model is built on trader success, not trader failure. The more you profit, the more we profit."
            }
        ]
    },
    {
        id: "pricing",
        title: "Pricing & Tiers",
        icon: DollarSign,
        questions: [
            {
                q: "Which tier should I choose?",
                a: "Most traders start with the 10k Grinder tier ($149). It offers the best balance of capital size and cost. If you're completely new to prediction markets, start with the 5k Scout tier ($79). Experienced traders who want maximum capital choose the 25k Executive tier ($299)."
            },
            {
                q: "Is the evaluation fee refundable?",
                a: "Yes, IF you pass the evaluation. Your evaluation fee is fully refunded with your first payout. So if you pay $149 for the 10k tier and make $1,000 profit, you'll receive $800 (80% split) + $149 (fee refund) = $949 total. If you fail, the fee is non-refundable."
            },
            {
                q: "Can I buy multiple evaluations?",
                a: "Yes. You can run multiple evaluations simultaneously. Many traders run 2-3 accounts at once to diversify across different markets and strategies."
            },
            {
                q: "What's the 90% profit split upgrade?",
                a: "By default, you keep 80% of profits. You can purchase a 90% profit split upgrade as an add-on to keep 90% instead."
            }
        ]
    },
    {
        id: "rules",
        title: "Trading Rules",
        icon: TrendingUp,
        questions: [
            {
                q: "What markets can I trade?",
                a: "Only Polymarket and Kalshi prediction markets. This includes politics, sports, economics, crypto, entertainment, and all other categories on these platforms."
            },
            {
                q: "Is there a daily loss limit?",
                a: "Yes. Scout (5k): 4% ($200), Grinder (10k): 5% ($500), Executive (25k): 5% ($1,250). Daily limits reset at midnight UTC."
            },
            {
                q: "What is the max drawdown limit?",
                a: "Scout (5k): 8% max drawdown. Grinder (10k): 10% max drawdown. Executive (25k): 10% max drawdown. The drawdown is \"trailing\" from your high-water mark."
            },
            {
                q: "How long do I have to complete the evaluation?",
                a: "No hard time limit. The suggested maximum is 60 days, but the only requirement is trading on at least 5 different days before passing."
            },
            {
                q: "Can I trade during news events?",
                a: "Yes! Unlike some prop firms, we have no restrictions on trading during high-impact news or events. Election nights, economic announcements, breaking news - trade whenever you want."
            },
            {
                q: "Can I use leverage?",
                a: "No. All positions are 1:1. This is a platform limitation on Polymarket and Kalshi, not ours."
            }
        ]
    },
    {
        id: "payouts",
        title: "Payouts",
        icon: CreditCard,
        questions: [
            {
                q: "How often do you pay out?",
                a: "After your first 30 days in a funded account, payouts are bi-weekly (every 14 days). The first month has a 30-day payout cycle."
            },
            {
                q: "What payment methods do you support?",
                a: "USDC (preferred), PayPal for fiat, Bitcoin, and Ethereum. Processing time is 1-3 business days."
            },
            {
                q: "Is there a minimum payout amount?",
                a: "Yes, $100 minimum. You can request payouts as often as bi-weekly cycles allow."
            },
            {
                q: "What's the payout cap?",
                a: "Scout (5k) & Grinder (10k): Unlimited. Executive (25k): $2,000 cap on your FIRST payout only, then unlimited."
            }
        ]
    },
    {
        id: "comparison",
        title: "Vs Other Firms",
        icon: Scale,
        questions: [
            {
                q: "How is this different from other prop firms?",
                a: "We're the only firm offering prediction markets (Polymarket/Kalshi). Others only do futures/forex. Plus: fair loss limits, instant funding (no consistency phase), and competitive 80-90% profit split."
            },
            {
                q: "Why prediction markets instead of futures?",
                a: "Prediction markets offer unique alpha from news/events and don't require technical analysis. Profit from your knowledge of politics, sports, and current events - not just chart patterns."
            }
        ]
    },
    {
        id: "fees",
        title: "Fees & Costs",
        icon: DollarSign,
        questions: [
            {
                q: "How much does a challenge cost?",
                a: "Scout (5k): $79, Grinder (10k): $149, Executive (25k): $299. Check pricing page for current promotions."
            },
            {
                q: "Are there monthly fees?",
                a: "Challenge Phase: No monthly fees. Funded Phase: $50/month for platform access (covers data, infrastructure, support)."
            },
            {
                q: "Any hidden fees?",
                a: "No. You pay: challenge fee (refundable if you pass), $50/month once funded, market spreads, and network fees for crypto payouts. Complete transparency."
            }
        ]
    },
    {
        id: "platform",
        title: "Platform & Technical",
        icon: Settings,
        questions: [
            {
                q: "What is Polymarket? What is Kalshi?",
                a: "Polymarket: Decentralized prediction market using USDC. More volume, wild markets. Kalshi: CFTC-regulated US exchange. Cleaner contracts, more structured."
            },
            {
                q: "Do I need my own Polymarket or Kalshi account?",
                a: "No. You trade directly through our dashboard interface, which connects to the underlying markets."
            },
            {
                q: "Can I use bots or automated trading?",
                a: "Not during evaluation. Once funded, we allow automation with prior approval. Contact support for details."
            }
        ]
    }
];

function AccordionItem({ question, answer, isOpen, onClick }: {
    question: string;
    answer: string;
    isOpen: boolean;
    onClick: () => void;
}) {
    return (
        <div className="border-b border-[#2E3A52] last:border-0">
            <button
                onClick={onClick}
                className="w-full flex items-center justify-between py-4 text-left hover:bg-[#1A232E]/50 transition-colors px-4 -mx-4"
            >
                <span className="font-medium text-white pr-4">{question}</span>
                <ChevronDown className={cn(
                    "w-5 h-5 text-zinc-400 transition-transform flex-shrink-0",
                    isOpen && "rotate-180"
                )} />
            </button>
            <div className={cn(
                "overflow-hidden transition-all duration-200",
                isOpen ? "max-h-96 pb-4" : "max-h-0"
            )}>
                <p className="text-zinc-400 leading-relaxed">{answer}</p>
            </div>
        </div>
    );
}

function CategorySection({ category, openQuestions, toggleQuestion }: {
    category: typeof faqCategories[0];
    openQuestions: Set<string>;
    toggleQuestion: (id: string) => void;
}) {
    const Icon = category.icon;

    return (
        <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#2E81FF]/20 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#2E81FF]" />
                </div>
                <h2 className="text-lg font-semibold text-white">{category.title}</h2>
            </div>

            <div className="space-y-0">
                {category.questions.map((item, idx) => {
                    const id = `${category.id}-${idx}`;
                    return (
                        <AccordionItem
                            key={id}
                            question={item.q}
                            answer={item.a}
                            isOpen={openQuestions.has(id)}
                            onClick={() => toggleQuestion(id)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export default function FAQPage() {
    const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");

    const toggleQuestion = (id: string) => {
        setOpenQuestions(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Filter categories and questions based on search
    const filteredCategories = searchQuery
        ? faqCategories.map(cat => ({
            ...cat,
            questions: cat.questions.filter(q =>
                q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                q.a.toLowerCase().includes(searchQuery.toLowerCase())
            )
        })).filter(cat => cat.questions.length > 0)
        : faqCategories;

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Frequently Asked Questions</h1>
                    <p className="text-zinc-400 mt-1">Everything you need to know about Propshot</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1A232E] border border-[#2E3A52] rounded-xl px-4 py-3 pl-12 text-white placeholder-zinc-500 focus:outline-none focus:border-[#2E81FF] transition-colors"
                />
                <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-[#2E81FF]">80-90%</div>
                    <div className="text-sm text-zinc-400">Profit Split</div>
                </div>
                <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">$79-299</div>
                    <div className="text-sm text-zinc-400">Evaluation Fee</div>
                </div>
                <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">14 days</div>
                    <div className="text-sm text-zinc-400">Payout Cycle</div>
                </div>
            </div>

            {/* FAQ Categories */}
            <div className="space-y-4">
                {filteredCategories.map(category => (
                    <CategorySection
                        key={category.id}
                        category={category}
                        openQuestions={openQuestions}
                        toggleQuestion={toggleQuestion}
                    />
                ))}
            </div>

            {/* Still have questions? */}
            <div className="bg-gradient-to-br from-[#2E81FF]/20 to-purple-500/20 border border-[#2E81FF]/30 rounded-xl p-6 text-center">
                <MessageCircle className="w-10 h-10 text-[#2E81FF] mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Still have questions?</h3>
                <p className="text-zinc-400 mb-4">Our support team is here to help 24/7</p>
                <a
                    href="mailto:support@propshot.com"
                    className="inline-flex items-center gap-2 px-6 py-2 bg-[#2E81FF] hover:bg-[#2E81FF]/80 text-white font-medium rounded-lg transition-colors"
                >
                    <Zap className="w-4 h-4" />
                    Contact Support
                </a>
            </div>
        </div>
    );
}
