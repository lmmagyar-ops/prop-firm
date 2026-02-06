import Link from "next/link";

export const metadata = {
    title: "Refund Policy | Predictions Firm",
    description: "Refund and cancellation policy for Predictions Firm evaluation services.",
};

export default function RefundPage() {
    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
            <div className="max-w-3xl mx-auto px-6 py-20">
                <Link href="/" className="text-[#29AF73] hover:underline mb-8 inline-block">
                    ← Back to Home
                </Link>

                <h1 className="text-4xl font-medium mb-8">Refund Policy</h1>
                <p className="text-[var(--text-secondary)] mb-8">Last updated: February 3, 2026</p>

                <div className="prose prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-medium mb-4">Overview</h2>
                        <p className="text-[var(--text-secondary)]">
                            At Predictions Firm, we want you to be satisfied with your purchase. This policy
                            outlines the terms under which refunds may be requested for our evaluation services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">14-Day Refund Window</h2>
                        <p className="text-[var(--text-secondary)]">
                            You may request a full refund within 14 days of your purchase, provided you have
                            <strong> not started</strong> your evaluation challenge. Once your evaluation period
                            begins (i.e., you place your first trade or the challenge timer starts), the evaluation
                            fee becomes non-refundable.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">Non-Refundable Scenarios</h2>
                        <p className="text-[var(--text-secondary)] mb-4">Refunds will not be issued in the following cases:</p>
                        <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
                            <li>The evaluation challenge has already started</li>
                            <li>You have violated our Terms of Service</li>
                            <li>More than 14 days have passed since purchase (for unused evaluations)</li>
                            <li>The refund request is for a promotional or discounted evaluation</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">How to Request a Refund</h2>
                        <p className="text-[var(--text-secondary)]">
                            To request a refund, please email us at{" "}
                            <a href="mailto:contact@predictionsfirm.com" className="text-[#29AF73] hover:underline">
                                contact@predictionsfirm.com
                            </a>{" "}
                            with your order number and the email address used for the purchase. We aim to process
                            all refund requests within 5-7 business days.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">Refund Processing</h2>
                        <p className="text-[var(--text-secondary)]">
                            Approved refunds will be credited to the original payment method used for the purchase.
                            Please allow 5-10 business days for the refund to appear in your account, depending on
                            your payment provider.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">Exceptions</h2>
                        <p className="text-[var(--text-secondary)]">
                            In exceptional circumstances, such as technical issues on our platform that prevented
                            you from using the service, we may consider refunds outside of this policy at our
                            discretion. Please contact our support team to discuss your situation.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-medium mb-4">Contact Us</h2>
                        <p className="text-[var(--text-secondary)]">
                            If you have questions about our refund policy, please contact us at{" "}
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
