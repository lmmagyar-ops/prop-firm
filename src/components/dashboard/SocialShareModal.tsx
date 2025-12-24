
"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Twitter, Linkedin, Link as LinkIcon, Facebook } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is installed as per package.json

interface SocialShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    certificateUrl: string; // Generated OG image URL
    userName: string;
    amount: number;
    type: string;
}

export function SocialShareModal({
    isOpen,
    onClose,
    certificateUrl,
    userName,
    amount,
    type,
}: SocialShareModalProps) {

    const shareOnTwitter = () => {
        const text = `Just earned my ${type} certificate from @ProjectX! 💪\n\nTotal: $${amount.toLocaleString()}\n\nReady to join the next generation of traders? 🚀\n\n#PropTrading #PredictionMarkets`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.host + certificateUrl)}`;
        window.open(url, '_blank', 'width=550,height=420');
    };

    const shareOnLinkedIn = () => {
        // LinkedIn sharing usually requires a public URL
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.host + certificateUrl)}`;
        window.open(url, '_blank', 'width=550,height=420');
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.origin + certificateUrl);
            toast.success("Link copied to clipboard!");
        } catch (err) {
            toast.error("Failed to copy link");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-zinc-900 border-white/10 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">Share Your Achievement</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* Preview */}
                    <div className="aspect-[1.91/1] bg-zinc-800 rounded-xl overflow-hidden border border-white/10 relative group">
                        {/* 
                In a real app, this would be an actual OG image. 
                For now we show a placeholder or the actual image if available 
            */}
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 bg-zinc-900/50">
                            <span className="text-sm">Certificate Preview</span>
                        </div>
                        {/* Use standard img tag since Next/Image might need config for external domains */}
                        {/* <img src={certificateUrl} alt="Certificate Preview" className="w-full h-full object-cover" /> */}
                    </div>

                    {/* Share Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={shareOnTwitter}
                            className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white border-none"
                        >
                            <Twitter className="w-4 h-4 mr-2" />
                            Twitter
                        </Button>

                        <Button
                            onClick={shareOnLinkedIn}
                            className="bg-[#0077B5] hover:bg-[#006399] text-white border-none"
                        >
                            <Linkedin className="w-4 h-4 mr-2" />
                            LinkedIn
                        </Button>

                        <Button
                            onClick={copyLink}
                            variant="outline"
                            className="col-span-2 border-white/10 hover:bg-white/5 text-zinc-300"
                        >
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Copy Share Link
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
