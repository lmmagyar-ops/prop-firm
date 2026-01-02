import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ShieldCheck, FileText, Camera, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function VerificationPage() {
    const session = await auth();

    // Redirect if not authenticated
    if (!session?.user?.id) {
        redirect('/login');
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20 shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]">
                    <ShieldCheck className="w-10 h-10 text-blue-500" />
                </div>
                <h1 className="text-3xl font-bold text-white">Identity Verification Required</h1>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                    To receive payouts from your funded account, we need to verify your identity.
                    This is a one-time process required by financial regulations.
                </p>
            </div>

            {/* Status Alert */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-blue-400">KYC Integration Coming Soon</h3>
                        <p className="text-zinc-400">
                            We're currently in pre-launch phase. Our identity verification partner will be integrated closer to launch.
                            In the meantime, you can review what documentation you'll need to prepare.
                        </p>
                    </div>
                </div>
            </div>

            {/* What You'll Need */}
            <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-8">
                <h2 className="text-xl font-bold text-white mb-6">What You'll Need to Prepare</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Government ID */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
                                <FileText className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="font-semibold text-white">Government-Issued ID</h3>
                        </div>
                        <ul className="text-sm text-zinc-400 space-y-1 ml-15">
                            <li>• Passport</li>
                            <li>• Driver's License</li>
                            <li>• National ID Card</li>
                        </ul>
                    </div>

                    {/* Selfie */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center border border-green-500/20">
                                <Camera className="w-6 h-6 text-green-400" />
                            </div>
                            <h3 className="font-semibold text-white">Selfie Verification</h3>
                        </div>
                        <ul className="text-sm text-zinc-400 space-y-1 ml-15">
                            <li>• Clear photo of your face</li>
                            <li>• Good lighting</li>
                            <li>• No filters or editing</li>
                        </ul>
                    </div>

                    {/* Proof of Address */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center border border-orange-500/20">
                                <FileText className="w-6 h-6 text-orange-400" />
                            </div>
                            <h3 className="font-semibold text-white">Proof of Address</h3>
                        </div>
                        <ul className="text-sm text-zinc-400 space-y-1 ml-15">
                            <li>• Utility bill (within 3 months)</li>
                            <li>• Bank statement</li>
                            <li>• Government letter</li>
                        </ul>
                    </div>

                    {/* Payment Information */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                                <CreditCard className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="font-semibold text-white">Payment Information</h3>
                        </div>
                        <ul className="text-sm text-zinc-400 space-y-1 ml-15">
                            <li>• Bank account details</li>
                            <li>• Crypto wallet address</li>
                            <li>• PayPal (if supported)</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Why We Need This */}
            <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-8">
                <h2 className="text-xl font-bold text-white mb-4">Why Is This Required?</h2>
                <div className="space-y-3 text-zinc-400">
                    <p>
                        As a financial services provider, we are required by law to verify the identity of all users who receive payouts.
                        This process helps us:
                    </p>
                    <ul className="space-y-2 ml-6">
                        <li>✓ Comply with anti-money laundering (AML) regulations</li>
                        <li>✓ Prevent fraud and protect your account</li>
                        <li>✓ Ensure secure and legitimate transactions</li>
                        <li>✓ Meet Know Your Customer (KYC) requirements</li>
                    </ul>
                    <p className="text-sm text-zinc-500 mt-4">
                        Your information is encrypted and stored securely. We never share your personal data with third parties
                        without your explicit consent.
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 pt-4">
                <Link href="/dashboard">
                    <Button variant="outline" className="bg-transparent border-zinc-700 hover:bg-zinc-800">
                        ← Back to Dashboard
                    </Button>
                </Link>
                <Button
                    disabled
                    className="bg-blue-600 hover:bg-blue-700 text-white opacity-50 cursor-not-allowed"
                >
                    Start Verification (Coming Soon)
                </Button>
            </div>

            {/* Footer Note */}
            <div className="text-center text-sm text-zinc-600 border-t border-white/5 pt-6">
                Questions about verification? Contact us at <span className="text-blue-400">support@projectx.com</span>
            </div>
        </div>
    );
}
