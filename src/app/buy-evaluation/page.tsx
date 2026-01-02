
"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { HelpCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { PLANS, CHALLENGE_RULES } from "@/config/plans";

import { Suspense } from "react";

export default function BuyEvaluationPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-white">Loading...</div>}>
            <BuyEvaluationContent />
        </Suspense>
    );
}

function BuyEvaluationContent() {
    const plans = Object.values(PLANS);

    return (
        <div className="min-h-screen bg-background flex text-foreground font-sans">
            <Sidebar active="Buy Evaluation" />

            <main className="flex-1 p-8 ml-64 space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white">Choose Your Challenge</h1>
                    <p className="text-zinc-500 mt-2">
                        One-step evaluation. Pass once, get funded. Keep up to 90% of your profits.
                    </p>
                </div>

                {/* Info Banner */}
                <div className="bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border border-blue-500/20 rounded-xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Check className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">1-Step Challenge</h3>
                            <p className="text-sm text-zinc-400">
                                Hit your profit target within 60 days. No verification phase. Instant funding.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="bg-zinc-900/30 border border-white/5 rounded-2xl">
                    {/* Header Row */}
                    <div className="grid grid-cols-[240px_repeat(5,1fr)] bg-zinc-900/80 border-b border-white/5 rounded-t-2xl">
                        <div className="p-6 flex items-center gap-2 text-sm font-bold text-zinc-300">
                            Account Details
                        </div>
                        {plans.map((plan) => (
                            <div key={plan.size} className="p-6 text-center relative">
                                {plan.isPopular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            POPULAR
                                        </span>
                                    </div>
                                )}
                                <div className="font-bold text-white text-lg">
                                    ${plan.size.toLocaleString()}
                                </div>

                            </div>
                        ))}
                    </div>

                    {/* Profit Split Row */}
                    <MetricRow
                        label="Profit Split"
                        tooltip="Keep up to 90% of all profits. We take 10%."
                        values={plans.map(() => CHALLENGE_RULES.profitSplit)}
                        isUniform
                    />

                    {/* Profit Target Row */}
                    <MetricRow
                        label="Profit Target"
                        tooltip="Reach 8% profit to pass the challenge and get funded."
                        values={plans.map((plan) => `$${plan.profitTarget.toLocaleString()}`)}
                        highlight="blue"
                    />

                    {/* Max Daily Loss Row */}
                    <MetricRow
                        label="Max Daily Loss"
                        tooltip="Maximum allowed loss in a single trading day."
                        values={plans.map((p) => `${p.dailyLossPercent}%`)}
                        isUniform={false}
                    />

                    {/* Max Drawdown Row */}
                    <MetricRow
                        label="Max Drawdown"
                        tooltip="Maximum total loss from high water mark."
                        values={plans.map((p) => `${p.maxDrawdownPercent}%`)}
                        isUniform={false}
                    />

                    {/* Duration Row */}
                    <MetricRow
                        label="Challenge Duration"
                        tooltip="Complete the challenge within 60 days."
                        values={plans.map(() => CHALLENGE_RULES.duration)}
                        isUniform
                    />

                    {/* Minimum Trading Days Row */}
                    <MetricRow
                        label="Min Trading Days"
                        tooltip="You must trade for at least this many days."
                        values={plans.map(() => CHALLENGE_RULES.minTradingDays)}
                        isUniform
                    />

                    {/* Payout Cap Row */}
                    <MetricRow
                        label="Payout Cap"
                        tooltip="Maximum withdrawal limit on your first payout."
                        values={plans.map((p) => (p as any).payoutCap || "Unlimited")}
                        highlight="green"
                    />

                    {/* Pricing Row */}
                    <div className="grid grid-cols-[240px_repeat(5,1fr)] bg-zinc-900/50 border-t border-white/5 p-6 items-center rounded-b-2xl">
                        <div className="font-bold text-white flex items-center gap-2">
                            Evaluation Fee
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="w-4 h-4 text-zinc-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>One-time fee to start your challenge</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        {plans.map((plan) => (
                            <div key={plan.size} className="px-2 text-center">
                                <Link
                                    href={`/checkout?size=${plan.size}&price=${plan.price}&from_dashboard=true`}
                                >
                                    <Button
                                        className={`w-full font-bold py-6 ${plan.isPopular
                                            ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                                            : "bg-blue-500 hover:bg-blue-400"
                                            }`}
                                    >
                                        ${plan.price}
                                    </Button>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-8">
                    <h3 className="text-xl font-bold mb-6">Frequently Asked Questions</h3>
                    <div className="space-y-4">
                        <FAQItem
                            question="What happens when I pass?"
                            answer="You get instant access to trade with firm capital. Keep up to 90% of all profits with no maximum cap."
                        />
                        <FAQItem
                            question="What if I fail the challenge?"
                            answer="You can purchase a new evaluation at any time. Many successful traders pass on their 2nd or 3rd attempt."
                        />
                        <FAQItem
                            question="Are there trading limits?"
                            answer="No position limits or market restrictions. Trade prediction markets freely within your risk parameters."
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

// Helper Components

function MetricRow({
    label,
    tooltip,
    values,
    isUniform,
    highlight,
}: {
    label: string;
    tooltip: string;
    values: string[];
    isUniform?: boolean;
    highlight?: "blue" | "green";
}) {
    return (
        <div className="grid grid-cols-[240px_repeat(5,1fr)] border-b border-white/5 hover:bg-white/[0.02] transition-colors">
            <div className="p-6 flex items-center gap-2 text-sm font-medium text-white">
                {label}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <HelpCircle className="w-4 h-4 text-zinc-600" />
                        </TooltipTrigger>
                        <TooltipContent>{tooltip}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            {values.map((value, idx) => (
                <div
                    key={idx}
                    className={`p-6 text-center text-sm font-mono ${isUniform ? "text-zinc-400" : highlight === "blue" ? "text-blue-400 font-bold" : "text-white"
                        }`}
                >
                    {value}
                </div>
            ))}
        </div>
    );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
    return (
        <div>
            <h4 className="font-semibold text-white mb-2">{question}</h4>
            <p className="text-sm text-zinc-400">{answer}</p>
        </div>
    );
}
