import Link from "next/link";

export const metadata = {
    title: "Terms of Service | Predictions Firm",
    description: "Terms and conditions for using Predictions Firm evaluation services.",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
            <div className="max-w-3xl mx-auto px-6 py-20">
                <Link href="/" className="text-[#29AF73] hover:underline mb-8 inline-block">
                    ← Back to Home
                </Link>

                <h1 className="text-4xl font-medium mb-8">Terms of Service</h1>
                <p className="text-[var(--text-secondary)] mb-8">Last updated: February 3, 2026</p>

                <div className="prose prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-medium mb-4">1. Introduction</h2>
                        <p className="text-[var(--text-secondary)]">
                            Welcome to Predictions Firm. By accessing or using our skills evaluation platform,
                            you agree to be bound by these Terms of Service. Please read them carefully.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">2. Service Description</h2>
                        <p className="text-[var(--text-secondary)]">
                            Predictions Firm provides a skills evaluation service for prediction market traders.
                            Users pay a one-time evaluation fee to access our simulated trading platform and demonstrate
                            their trading abilities. This is an educational and evaluation service, not a gambling service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">3. Eligibility</h2>
                        <p className="text-[var(--text-secondary)]">
                            You must be at least 18 years old to use our services. By using Predictions Firm,
                            you confirm that you meet this age requirement. We reserve the right to request
                            proof of age at any time.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">4. Evaluation Fee</h2>
                        <p className="text-[var(--text-secondary)]">
                            The evaluation fee grants you access to our skills assessment platform for the duration
                            specified in your chosen plan. This fee covers the cost of the evaluation service and
                            associated platform access. The evaluation fee is not an investment and does not guarantee
                            any financial returns.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">5. Funded Accounts</h2>
                        <p className="text-[var(--text-secondary)]">
                            Traders who successfully complete the evaluation may be offered access to funded trading
                            accounts. Funded accounts are provided at our sole discretion. Trading on funded accounts
                            is conducted through regulated third-party platforms. Performance on funded accounts is
                            subject to risk management rules and profit-sharing arrangements as specified in your
                            funded trader agreement.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">6. Risk Disclosure</h2>
                        <p className="text-[var(--text-secondary)]">
                            Trading prediction markets involves substantial risk of loss. Past performance on evaluation
                            challenges is not indicative of future results. The evaluation challenges simulate trading
                            conditions and do not guarantee future success. You should only participate if you understand
                            and accept these risks.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">7. Prohibited Activities</h2>
                        <p className="text-[var(--text-secondary)]">
                            You may not use our services for any unlawful purpose, attempt to manipulate or exploit
                            the evaluation system, share account credentials, or engage in any activity that could
                            harm other users or Predictions Firm.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">8. Intellectual Property</h2>
                        <p className="text-[var(--text-secondary)]">
                            All content, branding, and technology on our platform is owned by Chapman & Privatt Ltd
                            or its licensors. You may not copy, reproduce, or redistribute any part of our service
                            without prior written permission.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">9. Limitation of Liability</h2>
                        <p className="text-[var(--text-secondary)]">
                            Chapman & Privatt Ltd is not liable for any indirect, incidental, or consequential damages
                            arising from your use of the service. Our total liability is limited to the amount you
                            paid for the evaluation fee.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">10. Governing Law</h2>
                        <p className="text-[var(--text-secondary)]">
                            These Terms are governed by the laws of England and Wales. Any disputes shall be resolved
                            in the courts of England and Wales.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">11. Contact</h2>
                        <p className="text-[var(--text-secondary)]">
                            For questions about these Terms, please contact us at{" "}
                            <a href="mailto:contact@predictionsfirm.com" className="text-[#29AF73] hover:underline">
                                contact@predictionsfirm.com
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
