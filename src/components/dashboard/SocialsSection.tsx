
"use client";

import { Twitter, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SocialsSectionProps {
    socials?: {
        twitter?: string;
        discord?: string;
        telegram?: string;
    };
}

export function SocialsSection({ socials }: SocialsSectionProps) {
    const hasTwitter = !!socials?.twitter;
    const hasDiscord = !!socials?.discord;
    const hasTelegram = !!socials?.telegram;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Twitter Tile */}
            <a
                href={hasTwitter ? `https://twitter.com/${socials.twitter}` : "#"}
                className="group relative overflow-hidden rounded-xl bg-[#1A232E] border border-[#2E3A52] p-5 hover:border-[#1DA1F2] transition-colors duration-300"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-[#1DA1F2]/10 rounded-lg text-[#1DA1F2]">
                        <Twitter className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${hasTwitter
                            ? "text-[#1DA1F2] group-hover:text-[#1DA1F2]"
                            : "text-[#58687D] group-hover:text-[#1DA1F2]"
                        }`}>
                        {hasTwitter ? "Connected" : "Link Now"}
                    </span>
                </div>
                <p className="text-sm font-bold text-white mb-1">Twitter (X)</p>
                <p className="text-xs text-[#94A3B8] truncate">
                    {hasTwitter ? `@${socials.twitter}` : "Not Linked"}
                </p>
            </a>

            {/* Discord Tile */}
            <a
                href={hasDiscord ? socials.discord : "#"}
                className="group relative overflow-hidden rounded-xl bg-[#1A232E] border border-[#2E3A52] p-5 hover:border-[#5865F2] transition-colors duration-300"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-[#5865F2]/10 rounded-lg text-[#5865F2]">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${hasDiscord
                            ? "text-[#5865F2] group-hover:text-[#5865F2]"
                            : "text-[#58687D] group-hover:text-[#5865F2]"
                        }`}>
                        {hasDiscord ? "Connected" : "Link Now"}
                    </span>
                </div>
                <p className="text-sm font-bold text-white mb-1">Discord</p>
                <p className="text-xs text-[#94A3B8] truncate">
                    {hasDiscord ? socials.discord : "Not Linked"}
                </p>
            </a>

            {/* Telegram Tile */}
            <a
                href={hasTelegram ? `https://t.me/${socials.telegram}` : "#"}
                className="group relative overflow-hidden rounded-xl bg-[#1A232E] border border-[#2E3A52] p-5 hover:border-[#0088CC] transition-colors duration-300"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-[#0088CC]/10 rounded-lg text-[#0088CC]">
                        <Send className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${hasTelegram
                            ? "text-[#0088CC] group-hover:text-[#0088CC]"
                            : "text-[#58687D] group-hover:text-[#0088CC]"
                        }`}>
                        {hasTelegram ? "Connected" : "Link Now"}
                    </span>
                </div>
                <p className="text-sm font-bold text-white mb-1">Telegram</p>
                <p className="text-xs text-[#94A3B8] truncate">
                    {hasTelegram ? `@${socials.telegram}` : "Not Linked"}
                </p>
            </a>
        </div>
    );
}
