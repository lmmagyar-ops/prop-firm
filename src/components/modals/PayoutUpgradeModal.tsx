"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, TrendingUp, DollarSign, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PayoutUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    payoutAmount: number;
}

export function PayoutUpgradeModal({ isOpen, onClose, payoutAmount }: PayoutUpgradeModalProps) {
    const router = useRouter();
    const [dismissed, setDismissed] = useState(false);

    if (!isOpen || dismissed) return null;

    const handleUpgrade = async () => {
        // Navigate to privacy settings
        router.push("/dashboard/settings?tab=privacy");
        onClose();
    };

    const handleDismiss = () => {
        setDismissed(true);
        onClose();
        // Store in localStorage to not show again for this user
        localStorage.setItem("payout_upgrade_dismissed", "true");
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1A232E] border-2 border-green-500/50 rounded-2xl max-w-lg w-full p-8 relative animate-in fade-in zoom-in duration-200">
                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <DollarSign className="w-8 h-8 text-green-400" />
                </div>

                {/* Content */}
                <h2 className="text-2xl font-bold text-white text-center mb-3">
                    🎉 Congrats on Your First Payout!
                </h2>
                <p className="text-lg text-green-400 text-center font-semibold mb-6">
                    ${payoutAmount.toLocaleString()} earned
                </p>

                <div className="bg-[#0E1217] border border-[#2E3A52] rounded-xl p-6 mb-6 space-y-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" />
                        Ready to Build Your Reputation?
                    </h3>
                    <p className="text-sm text-zinc-400">
                        You've proven your trading skills. Making your profile public can help you:
                    </p>
                    <ul className="space-y-2 text-sm text-zinc-300">
                        <li className="flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>Attract potential clients who want to copy your trades</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>Build credibility with verifiable performance stats</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>Compete on leaderboards with your real name</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
                    <p className="text-xs text-zinc-400 text-center">
                        You're currently in <span className="text-primary font-semibold">Semi-Private</span> mode.
                        Switch to <span className="text-green-400 font-semibold">Public</span> to showcase your success!
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        onClick={handleDismiss}
                        variant="outline"
                        className="flex-1 bg-transparent border-[#2E3A52] text-zinc-400 hover:bg-[#2E3A52] hover:text-white"
                    >
                        Maybe Later
                    </Button>
                    <Button
                        onClick={handleUpgrade}
                        className="flex-1 bg-gradient-to-r from-primary to-green-600 hover:from-primary/80 hover:to-green-700 text-white font-semibold"
                    >
                        Go Public Now
                    </Button>
                </div>

                <p className="text-xs text-zinc-600 text-center mt-4">
                    You can change your privacy settings anytime in Settings → Privacy
                </p>
            </div>
        </div>
    );
}
