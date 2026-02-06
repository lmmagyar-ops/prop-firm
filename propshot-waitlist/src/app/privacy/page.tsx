import Link from "next/link";

export const metadata = {
    title: "Privacy Policy | Predictions Firm",
    description: "Privacy policy for Predictions Firm - how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
            <div className="max-w-3xl mx-auto px-6 py-20">
                <Link href="/" className="text-[#29AF73] hover:underline mb-8 inline-block">
                    ← Back to Home
                </Link>

                <h1 className="text-4xl font-medium mb-8">Privacy Policy</h1>
                <p className="text-[var(--text-secondary)] mb-8">Last updated: February 3, 2026</p>

                <div className="prose prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-medium mb-4">1. Introduction</h2>
                        <p className="text-[var(--text-secondary)]">
                            Chapman & Privatt Ltd (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy.
                            This Privacy Policy explains how we collect, use, and safeguard your personal information
                            in compliance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">2. Data Controller</h2>
                        <p className="text-[var(--text-secondary)]">
                            Chapman & Privatt Ltd is the data controller for personal data collected through our platform.<br />
                            Registered Address: 41 Limeharbour, London, UK E14 9TS<br />
                            Contact: <a href="mailto:contact@predictionsfirm.com" className="text-[#29AF73] hover:underline">contact@predictionsfirm.com</a>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">3. Information We Collect</h2>
                        <p className="text-[var(--text-secondary)] mb-4">We collect the following types of personal data:</p>
                        <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
                            <li><strong>Account Information:</strong> Email address, name, and contact details when you register or join our waitlist</li>
                            <li><strong>Payment Information:</strong> Payment card details (processed securely by our payment provider)</li>
                            <li><strong>Usage Data:</strong> Information about how you use our platform, including trading activity during evaluations</li>
                            <li><strong>Device Information:</strong> IP address, browser type, and device identifiers</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">4. How We Use Your Information</h2>
                        <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
                            <li>To provide and maintain our evaluation services</li>
                            <li>To process your payments and manage your account</li>
                            <li>To communicate with you about your account and our services</li>
                            <li>To comply with legal obligations</li>
                            <li>To improve our platform and develop new features</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">5. Legal Basis for Processing</h2>
                        <p className="text-[var(--text-secondary)]">
                            We process your personal data based on: (a) your consent where applicable,
                            (b) performance of our contract with you, (c) compliance with legal obligations,
                            and (d) our legitimate interests in operating and improving our business.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">6. Data Sharing</h2>
                        <p className="text-[var(--text-secondary)]">
                            We do not sell your personal data. We may share your data with: payment processors
                            to handle transactions, third-party trading platforms for funded account access,
                            and service providers who assist in operating our platform. All third parties are
                            contractually obligated to protect your data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">7. Data Retention</h2>
                        <p className="text-[var(--text-secondary)]">
                            We retain your personal data for as long as necessary to provide our services
                            and comply with legal obligations. Waitlist data is retained until you unsubscribe
                            or request deletion. Account data is retained for 7 years after account closure
                            for legal compliance purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">8. Your Rights</h2>
                        <p className="text-[var(--text-secondary)] mb-4">Under UK GDPR, you have the right to:</p>
                        <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
                            <li>Access your personal data</li>
                            <li>Rectify inaccurate data</li>
                            <li>Request erasure of your data</li>
                            <li>Restrict or object to processing</li>
                            <li>Data portability</li>
                            <li>Withdraw consent at any time</li>
                            <li>Lodge a complaint with the Information Commissioner&apos;s Office (ICO)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">9. Security</h2>
                        <p className="text-[var(--text-secondary)]">
                            We implement appropriate technical and organisational measures to protect your
                            personal data against unauthorised access, alteration, disclosure, or destruction.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">10. Contact Us</h2>
                        <p className="text-[var(--text-secondary)]">
                            For privacy-related enquiries or to exercise your rights, contact us at{" "}
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
