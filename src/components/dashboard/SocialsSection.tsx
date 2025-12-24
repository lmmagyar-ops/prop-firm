
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
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Twitter Tile */}
            <a
                href={socials?.twitter || "#"}
                className="group relative overflow-hidden rounded-xl bg-[#1A232E] border border-[#2E3A52] p-5 hover:border-[#1DA1F2] transition-colors duration-300"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-[#1DA1F2]/10 rounded-lg text-[#1DA1F2]">
                        <Twitter className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-[#58687D] uppercase tracking-wider group-hover:text-[#1DA1F2] transition-colors">
                        Connected
                    </span>
                </div>
                <p className="text-sm font-bold text-white mb-1">Twitter (X)</p>
                <p className="text-xs text-[#94A3B8] truncate">{socials?.twitter || "@username"}</p>
            </a>

            {/* Discord Tile */}
            <a
                href={socials?.discord || "#"}
                className="group relative overflow-hidden rounded-xl bg-[#1A232E] border border-[#2E3A52] p-5 hover:border-[#5865F2] transition-colors duration-300"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-[#5865F2]/10 rounded-lg text-[#5865F2]">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-[#58687D] uppercase tracking-wider group-hover:text-[#5865F2] transition-colors">
                        Connected
                    </span>
                </div>
                <p className="text-sm font-bold text-white mb-1">Discord</p>
                <p className="text-xs text-[#94A3B8] truncate">{socials?.discord || "Join Server"}</p>
            </a>

            {/* Telegram Tile */}
            <a
                href={socials?.telegram || "#"}
                className="group relative overflow-hidden rounded-xl bg-[#1A232E] border border-[#2E3A52] p-5 hover:border-[#0088CC] transition-colors duration-300"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-[#0088CC]/10 rounded-lg text-[#0088CC]">
                        <Send className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-[#58687D] uppercase tracking-wider group-hover:text-[#0088CC] transition-colors">
                        Link Now
                    </span>
                </div>
                <p className="text-sm font-bold text-white mb-1">Telegram</p>
                <p className="text-xs text-[#94A3B8] truncate">{socials?.telegram || "Not Linked"}</p>
            </a>
        </div>
    );
}
