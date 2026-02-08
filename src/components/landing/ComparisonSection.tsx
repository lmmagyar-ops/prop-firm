"use client";

import { CheckCircle2, BarChart3 } from "lucide-react";

const COMPARISON_DATA = [
    { feature: "Asset Class", ours: "Prediction Markets", industry: "Forex/Crypto", highlight: true },
    { feature: "Time Limit", ours: "Unlimited", industry: "30-60 days" },
    { feature: "Profit Split", ours: "Up to 90%", industry: "70-80%" },
    { feature: "Payout Frequency", ours: "Bi-weekly", industry: "Monthly" },
    { feature: "Payout Method", ours: "USDC", industry: "Bank Wire" },
    { feature: "News Trading", ours: true, industry: false },
    { feature: "Weekend Holding", ours: true, industry: false },
    { feature: "Fee Refund", ours: "1st Payout", industry: "Varies" },
];

export function ComparisonSection() {
    return (
        <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
            <div className="h-px w-full bg-[var(--vapi-border)] mb-24" />

            <div className="text-center mb-16">
                <div className="mono-label text-[var(--vapi-mint)] mb-4">Why Predictions Firm</div>
                <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-4">
                    See The Difference.
                </h2>
                <p className="text-[var(--vapi-gray-text)] text-lg max-w-2xl mx-auto">
                    We're not just another prop firm. We're the first for prediction markets.
                </p>
            </div>

            {/* Comparison Table */}
            <div className="thin-border-card rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--vapi-border)]">
                                <th className="text-left p-6 text-[var(--vapi-gray-text)] font-normal"></th>
                                <th className="p-6 text-center">
                                    <div className="inline-flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--vapi-mint)]/10 border border-[var(--vapi-mint)]/30 flex items-center justify-center">
                                            <BarChart3 className="w-5 h-5 text-[var(--vapi-mint)]" />
                                        </div>
                                        <span className="font-bold text-white">Predictions Firm</span>
                                    </div>
                                </th>
                                <th className="p-6 text-center">
                                    <span className="text-[var(--vapi-gray-text)]">Industry Average</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {COMPARISON_DATA.map((row, i) => (
                                <tr key={i} className="border-b border-[var(--vapi-border)] last:border-0">
                                    <td className="p-6 text-[var(--vapi-gray-text)]">{row.feature}</td>
                                    <td className="p-6 text-center">
                                        {row.highlight ? (
                                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--vapi-mint)]/10 text-[var(--vapi-mint)] font-bold text-sm">
                                                ★ {row.ours}
                                            </span>
                                        ) : typeof row.ours === 'boolean' ? (
                                            row.ours ? (
                                                <CheckCircle2 className="w-5 h-5 text-[var(--vapi-mint)] mx-auto" />
                                            ) : (
                                                <span className="text-red-400">✗</span>
                                            )
                                        ) : (
                                            <span className="text-white font-bold">{row.ours}</span>
                                        )}
                                    </td>
                                    <td className="p-6 text-center">
                                        {typeof row.industry === 'boolean' ? (
                                            row.industry ? (
                                                <CheckCircle2 className="w-5 h-5 text-[var(--vapi-mint)] mx-auto" />
                                            ) : (
                                                <span className="text-red-400">✗</span>
                                            )
                                        ) : (
                                            <span className="text-[var(--vapi-gray-text)]">{row.industry}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-center text-[var(--vapi-gray-text)] text-sm mt-6">
                ★ The only prop firm built for prediction markets.
            </p>
        </section>
    );
}
