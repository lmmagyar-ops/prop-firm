import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Scale, Shield, AlertTriangle } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/signup">
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Sign Up
                        </Button>
                    </Link>
                    <div className="flex-1" />
                    <Link href="/" className="font-serif font-bold text-xl tracking-tight">
                        Propshot
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="space-y-8">
                    {/* Title */}
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full">
                            <FileText className="h-8 w-8 text-blue-400" />
                        </div>
                        <h1 className="text-4xl font-bold">Terms and Conditions</h1>
                        <p className="text-zinc-400">
                            Last updated: January 1, 2026
                        </p>
                    </div>

                    {/* Placeholder Notice */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-amber-400">Terms Coming Soon</h3>
                            <p className="text-zinc-400 mt-1">
                                Our legal team is finalizing the Terms and Conditions. This page will be updated with the complete terms before public launch.
                            </p>
                        </div>
                    </div>

                    {/* Placeholder Sections */}
                    <div className="space-y-8 text-zinc-300">
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Scale className="h-5 w-5 text-blue-400" />
                                <h2 className="text-2xl font-semibold text-white">1. Acceptance of Terms</h2>
                            </div>
                            <p className="leading-relaxed">
                                By accessing or using Propshot Trading (&quot;the Service&quot;), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, you may not use the Service.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Shield className="h-5 w-5 text-green-400" />
                                <h2 className="text-2xl font-semibold text-white">2. Description of Service</h2>
                            </div>
                            <p className="leading-relaxed">
                                Propshot provides a simulated trading evaluation platform. Users trade with simulated funds on real prediction market data. Successful traders may qualify for funded accounts with profit-sharing arrangements.
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-zinc-400">
                                <li>All trading is simulated using virtual balances</li>
                                <li>Market data is sourced from real prediction markets</li>
                                <li>Payouts are subject to meeting evaluation criteria</li>
                                <li>Funded accounts operate under specific risk parameters</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">3. User Eligibility</h2>
                            <p className="leading-relaxed">
                                To use the Service, you must be at least 18 years of age and legally able to enter into binding contracts in your jurisdiction. Users from restricted countries may not be eligible.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">4. Account Responsibilities</h2>
                            <p className="leading-relaxed">
                                You are responsible for maintaining the confidentiality of your account credentials. Any activity under your account is your responsibility.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">5. Risk Disclosure</h2>
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                                <p className="text-red-400 font-medium">
                                    Trading prediction markets involves substantial risk. Past performance does not guarantee future results. Only trade with funds you can afford to lose.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">6. Contact</h2>
                            <p className="leading-relaxed">
                                For questions about these Terms, please contact us at{" "}
                                <a href="mailto:legal@projectx.com" className="text-blue-400 hover:text-blue-300 underline">
                                    legal@projectx.com
                                </a>
                            </p>
                        </section>
                    </div>

                    {/* Back Button */}
                    <div className="pt-8 border-t border-white/10 text-center">
                        <Link href="/signup">
                            <Button className="bg-blue-600 hover:bg-blue-500">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Sign Up
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
