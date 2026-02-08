"use client";

import { useState } from "react";
import { Link2, Twitter, Check, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ProfileShareButtonsProps {
    userId: string;
}

export function ProfileShareButtons({ userId }: ProfileShareButtonsProps) {
    const [copied, setCopied] = useState(false);

    const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/profile/${userId}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(profileUrl);
            setCopied(true);
            toast.success("Profile link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error("Failed to copy link");
        }
    };

    const shareToTwitter = () => {
        const text = "Check out my trading profile on Predictions Firm!";
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`;
        window.open(url, '_blank', 'width=550,height=420');
    };

    return (
        <div className="flex flex-wrap gap-3">
            <Button
                variant="outline"
                onClick={copyToClipboard}
                className="flex items-center gap-2"
            >
                {copied ? (
                    <>
                        <Check className="w-4 h-4 text-green-400" />
                        Copied!
                    </>
                ) : (
                    <>
                        <Link2 className="w-4 h-4" />
                        Copy Profile Link
                    </>
                )}
            </Button>

            <Button
                variant="outline"
                onClick={shareToTwitter}
                className="flex items-center gap-2 hover:bg-[#1DA1F2] hover:text-white transition-colors"
            >
                <Twitter className="w-4 h-4" />
                Share on Twitter
            </Button>

            <Button
                variant="outline"
                className="flex items-center gap-2"
                title="QR Code coming soon"
                disabled
            >
                <QrCode className="w-4 h-4" />
                QR Code
            </Button>
        </div>
    );
}
