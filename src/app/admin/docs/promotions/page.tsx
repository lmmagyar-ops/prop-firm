"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Lightbulb, Zap, CheckCircle2, Shield, DollarSign, Users, TrendingUp } from "lucide-react";

export default function PromotionsDocsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fly-in-bottom duration-500 pb-20">
            {/* Header */}
            <div className="border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">GROWTH TOOLS v1.0</Badge>
                    <span className="text-zinc-500 text-sm">Last updated: January 2026</span>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    Discount Codes & Affiliate Program
                </h1>
                <p className="text-xl text-zinc-400 mt-2">
                    Your guide to running promotions and building a scalable affiliate network.
                </p>
            </div>

            {/* Quick Stats Overview */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/20">
                                <DollarSign className="h-5 w-5 text-indigo-400" />
                            </div>
                            <div>
                                <div className="text-sm text-zinc-400">Discount System</div>
                                <div className="text-lg font-bold text-white">15+ Validation Rules</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/20">
                                <Users className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <div className="text-sm text-zinc-400">Affiliate Tiers</div>
                                <div className="text-lg font-bold text-white">3-Tier System</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Section 1: Discount Codes */}
            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800 text-sm border border-zinc-700">1</span>
                    Discount Codes: Strategic Promotions
                </h2>
                <div className="prose prose-invert max-w-none text-zinc-300">
                    <p>
                        Discount codes are your primary tool for <strong>time-sensitive campaigns</strong> and <strong>targeted acquisition</strong>.
                        The system supports percentage discounts (e.g., 25% off), fixed amounts (e.g., $50 off), and tier-specific targeting.
                    </p>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                    <h3 className="font-bold text-white mb-4">Discount Types</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="font-mono text-purple-400 mb-1">Percentage</div>
                            <div className="text-zinc-400">25% off all tiers. Example: <code>SUMMER25</code></div>
                        </div>
                        <div>
                            <div className="font-mono text-primary mb-1">Fixed Amount</div>
                            <div className="text-zinc-400">$50 off. Example: <code>SAVE50</code></div>
                        </div>
                        <div>
                            <div className="font-mono text-green-400 mb-1">Tier-Specific</div>
                            <div className="text-zinc-400">10% off on $25k tier only</div>
                        </div>
                        <div>
                            <div className="font-mono text-amber-400 mb-1">New Customers</div>
                            <div className="text-zinc-400">Only for first-time buyers</div>
                        </div>
                    </div>
                </div>

                <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardContent className="pt-6 flex gap-4">
                        <AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />
                        <div>
                            <h4 className="font-bold text-amber-400 mb-1">Margin Protection Built-In</h4>
                            <p className="text-sm text-zinc-300">
                                All discount codes have <span className="font-mono">maxTotalUses</span> and <span className="font-mono">maxUsesPerUser</span> limits.
                                Set expiration dates to prevent runaway costs. Monitor the Analytics tab for ROI.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" /> How to Create a Discount Code
                    </h3>
                    <ol className="space-y-3 text-sm text-zinc-400 list-decimal list-inside">
                        <li>Navigate to <span className="font-mono text-indigo-400">/admin/discounts</span></li>
                        <li>Click <strong>"Create Discount Code"</strong></li>
                        <li>Set the code (e.g., <code>FLASH25</code>), name, and discount value</li>
                        <li>Configure eligibility (tier restrictions, new customers only)</li>
                        <li>Set validity dates and usage limits</li>
                        <li>Click <strong>"Create"</strong> - code is live immediately</li>
                    </ol>
                </div>

                <Card className="bg-indigo-500/10 border-indigo-500/20">
                    <CardContent className="pt-6 flex gap-4">
                        <Lightbulb className="h-6 w-6 text-indigo-400 shrink-0" />
                        <div>
                            <h4 className="font-bold text-indigo-400 mb-1">Pro Tip: A/B Test Your Discounts</h4>
                            <p className="text-sm text-zinc-300">
                                Create two codes with different values (e.g., <code>SAVE15</code> vs <code>SAVE25</code>) and send each to different email segments.
                                Check the Analytics tab to see which converted better. Optimize for <strong>Revenue per Redemption</strong>, not just conversion rate.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Section 2: Fraud Prevention */}
            <section className="space-y-4 pt-8 border-t border-zinc-800">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800 text-sm border border-zinc-700">2</span>
                    Fraud Prevention & Abuse Detection
                </h2>
                <div className="prose prose-invert max-w-none text-zinc-300">
                    <p>
                        Every discount redemption is logged with IP address, user agent, and timestamp.
                        The system automatically prevents duplicate redemptions and tracks suspicious patterns.
                    </p>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-lg border border-red-500/20">
                    <h3 className="font-bold text-red-400 mb-4 flex items-center gap-2">
                        <Shield className="h-4 w-4" /> Red Flags to Watch
                    </h3>
                    <ul className="space-y-2 text-sm text-zinc-400">
                        <li className="flex gap-2">
                            <span className="text-red-500">🚨</span>
                            Multiple redemptions from the same IP address (check Analytics → Recent Redemptions)
                        </li>
                        <li className="flex gap-2">
                            <span className="text-red-500">🚨</span>
                            Code shared publicly on coupon sites (monitor Google: <code>site:retailmenot.com "your-code"</code>)
                        </li>
                        <li className="flex gap-2">
                            <span className="text-red-500">🚨</span>
                            Utilization rate hits 100% instantly (bot attack - deactivate immediately)
                        </li>
                    </ul>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" /> Action Items
                    </h3>
                    <ul className="space-y-2 text-sm text-zinc-400">
                        <li className="flex gap-2">
                            <span className="text-zinc-600">•</span>
                            Set <code>maxUsesPerUser: 1</code> for public codes to limit abuse
                        </li>
                        <li className="flex gap-2">
                            <span className="text-zinc-600">•</span>
                            Use unique codes for each influencer partner (e.g., <code>ALEX15</code> vs <code>SARAH15</code>)
                        </li>
                        <li className="flex gap-2">
                            <span className="text-zinc-600">•</span>
                            Deactivate codes immediately if you spot suspicious activity - they can't be re-enabled
                        </li>
                    </ul>
                </div>
            </section>

            {/* Section 3: Affiliate Program */}
            <section className="space-y-4 pt-8 border-t border-zinc-800">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800 text-sm border border-zinc-700">3</span>
                    Affiliate Program: 3-Tier Model
                </h2>
                <div className="prose prose-invert max-w-none text-zinc-300">
                    <p>
                        The affiliate program uses a <strong>hybrid model</strong> that balances ease of access with quality control.
                        Higher tiers earn better commissions but require manual approval.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">Tier 1</Badge>
                                <span className="text-xs text-zinc-500">Self-Serve</span>
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">10%</div>
                            <div className="text-xs text-zinc-400 mb-4">Commission Rate</div>
                            <div className="space-y-2 text-xs text-zinc-400">
                                <div>✓ Instant approval</div>
                                <div>✓ $500/month cap</div>
                                <div>✓ Auto-generated link</div>
                                <div>✗ No LTV bonus</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-purple-500/10 border-purple-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">Tier 2</Badge>
                                <span className="text-xs text-zinc-500">Vetted</span>
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">15-20%</div>
                            <div className="text-xs text-zinc-400 mb-4">Commission Rate</div>
                            <div className="space-y-2 text-xs text-zinc-400">
                                <div>✓ Manual review (1-2 days)</div>
                                <div>✓ No earning cap</div>
                                <div>✓ 5% LTV bonus</div>
                                <div>✓ Priority support</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-amber-500/10 border-amber-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">Tier 3</Badge>
                                <span className="text-xs text-zinc-500">Strategic</span>
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">25%+</div>
                            <div className="text-xs text-zinc-400 mb-4">Commission Rate</div>
                            <div className="space-y-2 text-xs text-zinc-400">
                                <div>✓ Invitation only</div>
                                <div>✓ Custom terms</div>
                                <div>✓ Dedicated AM</div>
                                <div>✓ Revenue share deals</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="bg-green-500/10 border-green-500/20">
                    <CardContent className="pt-6 flex gap-4">
                        <TrendingUp className="h-6 w-6 text-green-500 shrink-0" />
                        <div>
                            <h4 className="font-bold text-green-400 mb-1">The Golden Metric: Customer LTV</h4>
                            <p className="text-sm text-zinc-300">
                                Don't just approve based on audience size. The best affiliates send <strong>high-LTV customers</strong>.
                                Look for partners whose referrals complete the verification phase and become funded traders.
                                This is worth 10x more than a viral TikToker sending one-time buyers.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Section 4: Approval Workflow */}
            <section className="space-y-4 pt-8 border-t border-zinc-800">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800 text-sm border border-zinc-700">4</span>
                    Tier 2 Application Review Process
                </h2>

                <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                    <h3 className="font-bold text-white mb-4">Review Checklist</h3>
                    <div className="space-y-4 text-sm">
                        <div>
                            <div className="font-mono text-purple-400 mb-2">1. Verify Social Presence</div>
                            <ul className="space-y-1 text-zinc-400 ml-4">
                                <li>• Check YouTube/Twitter follower count (minimum 5K recommended)</li>
                                <li>• Look for trading/finance content (not generic meme accounts)</li>
                                <li>• Check engagement rate (comments, likes - bot accounts have low engagement)</li>
                            </ul>
                        </div>
                        <div>
                            <div className="font-mono text-primary mb-2">2. Assess Promotional Strategy</div>
                            <ul className="space-y-1 text-zinc-400 ml-4">
                                <li>• Read their application strategy: Do they have a plan or just "I'll post it"?</li>
                                <li>• Best affiliates create <strong>tutorials</strong> or <strong>case studies</strong>, not just ads</li>
                            </ul>
                        </div>
                        <div>
                            <div className="font-mono text-green-400 mb-2">3. Set Commission Rate</div>
                            <ul className="space-y-1 text-zinc-400 ml-4">
                                <li>• 15% = Standard approval (5K-20K audience)</li>
                                <li>• 18% = Strong content creator with proven track record</li>
                                <li>• 20% = Influencer with 50K+ engaged audience or industry authority</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" /> How to Approve/Reject
                    </h3>
                    <ol className="space-y-3 text-sm text-zinc-400 list-decimal list-inside">
                        <li>Go to <span className="font-mono text-indigo-400">/admin/affiliates</span></li>
                        <li>Filter by <strong>Status: Pending</strong></li>
                        <li>Click on an application to view details (audience size, strategy, social links)</li>
                        <li>Click <strong>"Approve"</strong> and set commission rate OR click <strong>"Reject"</strong></li>
                        <li>Approved affiliates get email notification with their unique referral code</li>
                    </ol>
                </div>

                <Card className="bg-indigo-500/10 border-indigo-500/20">
                    <CardContent className="pt-6 flex gap-4">
                        <Lightbulb className="h-6 w-6 text-indigo-400 shrink-0" />
                        <div>
                            <h4 className="font-bold text-indigo-400 mb-1">Pro Tip: Trial Periods</h4>
                            <p className="text-sm text-zinc-300">
                                Approve new Tier 2 affiliates at <strong>15%</strong> initially.
                                After 30 days, check their stats (conversions, LTV, fraud flags).
                                Bump high-performers to 18-20% to retain them. Demote or suspend underperformers.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Section 5: Attribution & Tracking */}
            <section className="space-y-4 pt-8 border-t border-zinc-800">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800 text-sm border border-zinc-700">5</span>
                    Referral Tracking & Attribution
                </h2>

                <div className="prose prose-invert max-w-none text-zinc-300">
                    <p>
                        The system uses a <strong>30-day cookie window</strong> for attribution.
                        When someone clicks an affiliate link, we store their referral code in a cookie.
                        If they sign up and purchase within 30 days, the affiliate gets credited.
                    </p>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                    <h3 className="font-bold text-white mb-4">Attribution Rules</h3>
                    <div className="space-y-3 text-sm text-zinc-400">
                        <div className="flex items-start gap-3">
                            <span className="text-green-500 shrink-0">✓</span>
                            <div>
                                <strong className="text-white">First-Click Attribution:</strong> The first affiliate link clicked gets the credit (even if user visits again directly)
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-green-500 shrink-0">✓</span>
                            <div>
                                <strong className="text-white">Discount Code Override:</strong> If user manually enters a different affiliate's discount code at checkout, that affiliate gets credited instead
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-amber-500 shrink-0">⚠️</span>
                            <div>
                                <strong className="text-white">30-Day Expiration:</strong> After 30 days, the referral cookie expires and no affiliate is credited
                            </div>
                        </div>
                    </div>
                </div>

                <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardContent className="pt-6 flex gap-4">
                        <AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />
                        <div>
                            <h4 className="font-bold text-amber-400 mb-1">Watch for Self-Referrals</h4>
                            <p className="text-sm text-zinc-300">
                                The system detects when an affiliate's own user account makes a purchase.
                                This is flagged in the Analytics tab. <strong>Suspend affiliates who abuse self-referrals.</strong>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Section 6: Commission Payouts */}
            <section className="space-y-4 pt-8 border-t border-zinc-800">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800 text-sm border border-zinc-700">6</span>
                    Commission Payments & Payout Schedule
                </h2>

                <div className="prose prose-invert max-w-none text-zinc-300">
                    <p>
                        Affiliates earn commissions on <strong>completed purchases only</strong>.
                        Refunds automatically deduct from unpaid commissions. Payouts are processed monthly.
                    </p>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
                    <h3 className="font-bold text-white mb-4">Monthly Payout Workflow</h3>
                    <ol className="space-y-3 text-sm text-zinc-400 list-decimal list-inside">
                        <li>On the 1st of each month, the system calculates total commissions for the previous month</li>
                        <li>Go to <span className="font-mono text-indigo-400">/admin/affiliates</span> → <strong>Payouts</strong> tab</li>
                        <li>Review pending payouts (minimum $50 threshold)</li>
                        <li>Process payments via PayPal/Stripe/Wire (external to platform)</li>
                        <li>Mark payouts as <strong>"Paid"</strong> and enter transaction ID for record-keeping</li>
                    </ol>
                </div>

                <Card className="bg-red-500/10 border-red-500/20">
                    <CardContent className="pt-6 flex gap-4">
                        <Shield className="h-6 w-6 text-red-500 shrink-0" />
                        <div>
                            <h4 className="font-bold text-red-400 mb-1">Fraud Prevention: Hold Period</h4>
                            <p className="text-sm text-zinc-300">
                                Commissions are held for <strong>30 days</strong> before becoming payable.
                                This protects against chargebacks and fraudulent purchases.
                                Only pay affiliates for conversions older than 30 days.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Quick Reference */}
            <section className="space-y-4 pt-8 border-t border-zinc-800">
                <h2 className="text-2xl font-bold text-white">Quick Reference</h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                        <h4 className="font-mono text-purple-400 mb-2">Discount Codes</h4>
                        <div className="space-y-1 text-zinc-400">
                            <div>• Create: <code>/admin/discounts</code></div>
                            <div>• Analytics: <code>/admin/discounts/[id]/analytics</code></div>
                            <div>• Deactivate: Click "Deactivate" button</div>
                        </div>
                    </div>
                    <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                        <h4 className="font-mono text-green-400 mb-2">Affiliates</h4>
                        <div className="space-y-1 text-zinc-400">
                            <div>• Review Apps: <code>/admin/affiliates</code></div>
                            <div>• View Stats: Click affiliate row</div>
                            <div>• Process Payouts: Payouts tab</div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
