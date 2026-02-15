"use client";

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

interface BuyEvaluationClientProps {
    hasActiveChallenge: boolean;
}

export default function BuyEvaluationClient({ hasActiveChallenge }: BuyEvaluationClientProps) {
    const plans = Object.values(PLANS);

    return (
        <div className="min-h-screen bg-background flex text-foreground font-sans" data-testid="buy-eval-page">
            <Sidebar active="Buy Evaluation" hasActiveChallenge={hasActiveChallenge} />

            <main className="flex-1 p-4 md:p-8 md:ml-64 space-y-6 md:space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Choose Your Challenge</h1>
                    <p className="text-zinc-500 mt-2 text-sm md:text-base">
                        One-step evaluation. Pass once, get funded. Keep up to 90% of your profits.
                    </p>
                </div>

                {/* Info Banner */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/80/10 border border-primary/20 rounded-xl p-4 md:p-6">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-3 bg-primary/20 rounded-lg shrink-0">
                            <Check className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm md:text-base">1-Step Challenge</h3>
                            <p className="text-xs md:text-sm text-zinc-400">
                                Hit your profit target within 60 days. No verification phase. Instant funding.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Mobile: Stacked Tier Cards */}
                <div className="block md:hidden space-y-4">
                    {plans.map((plan) => (
                        <div
                            key={plan.size}
                            className={`bg-zinc-900/30 border rounded-2xl overflow-hidden ${plan.isPopular ? "border-primary/40" : "border-white/5"}`}
                        >
                            {/* Card Header */}
                            <div className={`p-5 text-center ${plan.isPopular ? "bg-primary/10" : "bg-zinc-900/80"}`}>
                                {plan.isPopular && (
                                    <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block">
                                        POPULAR
                                    </span>
                                )}
                                <div className="font-bold text-white text-2xl">
                                    ${plan.size.toLocaleString()}
                                </div>
                                <div className="text-zinc-400 text-sm mt-1">Account Size</div>
                            </div>

                            {/* Card Metrics */}
                            <div className="divide-y divide-white/5">
                                <MobileMetricRow label="Profit Split" value={CHALLENGE_RULES.profitSplit} />
                                <MobileMetricRow label="Profit Target" value={`$${plan.profitTarget.toLocaleString()}`} highlight="blue" />
                                <MobileMetricRow label="Max Daily Loss" value={`${plan.dailyLossPercent}%`} />
                                <MobileMetricRow label="Max Drawdown" value={`${plan.maxDrawdownPercent}%`} />
                                <MobileMetricRow label="Challenge Duration" value={CHALLENGE_RULES.duration} />
                                <MobileMetricRow label="Min Trading Days" value={CHALLENGE_RULES.minTradingDays} />
                                <MobileMetricRow label="Payout Cap" value={'payoutCap' in plan ? String(plan.payoutCap) : "Unlimited"} highlight="green" />
                            </div>

                            {/* CTA */}
                            <div className="p-4">
                                <Link href={`/checkout?size=${plan.size}&price=${plan.price}&tier=${plan.id}&from_dashboard=true`}>
                                    <Button
                                        className={`w-full font-bold py-5 text-base ${plan.isPopular
                                            ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-cyan-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                                            : "bg-primary hover:bg-primary/80"
                                            }`}
                                    >
                                        Start for ${plan.price}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop: Comparison Table */}
                <div className="hidden md:block bg-zinc-900/30 border border-white/5 rounded-2xl">
                    {/* Header Row */}
                    <div className="grid grid-cols-[240px_repeat(3,1fr)] bg-zinc-900/80 border-b border-white/5 rounded-t-2xl">
                        <div className="p-6 flex items-center gap-2 text-sm font-bold text-zinc-300">
                            Account Details
                        </div>
                        {plans.map((plan) => (
                            <div key={plan.size} className="p-6 text-center relative">
                                {plan.isPopular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
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
                        values={plans.map((p) => ('payoutCap' in p ? String(p.payoutCap) : "Unlimited"))}
                        highlight="green"
                    />

                    {/* Pricing Row */}
                    <div className="grid grid-cols-[240px_repeat(3,1fr)] bg-zinc-900/50 border-t border-white/5 p-6 items-center rounded-b-2xl">
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
                                    href={`/checkout?size=${plan.size}&price=${plan.price}&tier=${plan.id}&from_dashboard=true`}
                                >
                                    <Button
                                        className={`w-full font-bold py-6 ${plan.isPopular
                                            ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-cyan-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                                            : "bg-primary hover:bg-primary/80"
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
                <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5 md:p-8">
                    <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Frequently Asked Questions</h3>
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

// Helper Components — Mobile card row

function MobileMetricRow({
    label,
    value,
    highlight,
}: {
    label: string;
    value: string;
    highlight?: "blue" | "green";
}) {
    return (
        <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-zinc-400">{label}</span>
            <span className={`text-sm font-mono font-medium ${highlight === "blue" ? "text-primary" : highlight === "green" ? "text-emerald-400" : "text-white"}`}>
                {value}
            </span>
        </div>
    );
}

// Helper Components — Desktop table row

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
        <div className="grid grid-cols-[240px_repeat(3,1fr)] border-b border-white/5 hover:bg-white/[0.02] transition-colors">
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
                    className={`p-6 text-center text-sm font-mono ${isUniform ? "text-zinc-400" : highlight === "blue" ? "text-primary font-bold" : "text-white"
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
