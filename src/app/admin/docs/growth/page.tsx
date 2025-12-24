"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Lightbulb, Zap, CheckCircle2 } from "lucide-react";

export default function GrowthDocsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fly-in-bottom duration-500 pb-20">
            {/* Header */}
            <div className="border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">OPERATING MANUAL v1.0</Badge>
                    <span className="text-zinc-500 text-sm">Last updated: Today</span>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    Growth & Acquisition Strategy
                </h1>
                <p className="text-xl text-zinc-400 mt-2">
                    How to use the Growth Desk to identify "Whales" and eliminate "Toxic Flow".
                </p>
            </div>

            {/* Section 1: Influencer ROI */}
            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800 text-sm border border-zinc-700">1</span>
                    Influencer ROI: Finding the Signal
                </h2>
                <div className="prose prose-invert max-w-none text-zinc-300">
                    <p>
                        Most prop firms make the mistake of valuing <strong>Volume</strong> over <strong>Quality</strong>.
                        A YouTuber who sends you 10,000 signups is <em>useless</em> if they all chargeback or win significantly more than they lose (Toxic Flow).
                    </p>
                </div>

                <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardContent className="pt-6 flex gap-4">
                        <AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />
                        <div>
                            <h4 className="font-bold text-amber-400 mb-1">Warning: Simulated Toxic Traffic</h4>
                            <p className="text-sm text-zinc-300">
                                If you see an influencer in the leaderboard with <span className="text-red-400 font-mono">Negative Net Revenue</span>,
                                it means their audience is consistently beating the house. <strong>Cancel their contract immediately.</strong>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" /> Action Items
                    </h3>
                    <ul className="space-y-2 text-sm text-zinc-400">
                        <li className="flex gap-2">
                            <span className="text-zinc-600">•</span>
                            Look for the 🥇 Medal icon. Reward this partner with higher commissions.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-zinc-600">•</span>
                            Monitor the "Whales" column. A partner with low volume but high whales is a "Sniper" affiliate. Keep them close.
                        </li>
                    </ul>
                </div>
            </section>

            {/* Section 2: Market Hooks */}
            <section className="space-y-4 pt-8 border-t border-zinc-800">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800 text-sm border border-zinc-700">2</span>
                    Market Hooks: "The First Bet"
                </h2>
                <div className="prose prose-invert max-w-none text-zinc-300">
                    <p>
                        Users rarely sign up for the platform itself. They sign up to trade a <strong>Specific Event</strong>.
                        The "Market Hooks" chart visualizes exactly which event triggered the signup.
                    </p>
                </div>

                <Card className="bg-indigo-500/10 border-indigo-500/20">
                    <CardContent className="pt-6 flex gap-4">
                        <Lightbulb className="h-6 w-6 text-indigo-400 shrink-0" />
                        <div>
                            <h4 className="font-bold text-indigo-400 mb-1">Pro Tip: LTV Multipliers</h4>
                            <p className="text-sm text-zinc-300">
                                Hover over the bars to see the <strong>LTV Multiplier</strong>. You might find that "Crypto Traders" last 3x longer than "Political Traders".
                                Shift your ad spend accordingly.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Section 3: Discount War Room */}
            <section className="space-y-4 pt-8 border-t border-zinc-800">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800 text-sm border border-zinc-700">3</span>
                    Discount War Room: Elasticity
                </h2>
                <div className="prose prose-invert max-w-none text-zinc-300">
                    <p>
                        Discounts are a drug. Used correctly, they boost growth. Used poorly, they destroy margin.
                        The War Room chart overlays <strong>Revenue Volume</strong> (Green Area) against <strong>Discount Depth</strong> (Purple Line).
                    </p>
                </div>

                <Card className="bg-green-500/10 border-green-500/20">
                    <CardContent className="pt-6 flex gap-4">
                        <Zap className="h-6 w-6 text-green-500 shrink-0" />
                        <div>
                            <h4 className="font-bold text-green-400 mb-1">The Golden Rule</h4>
                            <p className="text-sm text-zinc-300">
                                Only increase the discount if the Green Area (Revenue) spikes significantly.
                                If the Green Area stays flat while the Purple Line goes up, you are hitting <strong>Saturation</strong>.
                                Pull back the discount immediately.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
