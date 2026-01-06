"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

// Placeholder SVG logos for partners
function TrustpilotLogo() {
    return (
        <div className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-[#00b67a] text-[#00b67a]" />
            <span className="font-bold text-white text-lg tracking-tight">Trustpilot</span>
        </div>
    );
}

function StripeLogo() {
    return (
        <svg viewBox="0 0 60 25" className="h-6 w-auto fill-current">
            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-6.73 0-4.11 2.66-6.7 6.38-6.7 3.88 0 5.82 2.72 5.82 6.55 0 .26 0 .61-.01.86ZM53.2 11.23c.11-1.6-1.12-2.32-2.33-2.32-1.63 0-2.6.93-2.9 2.32h5.23Zm-15.06 9.07H33.5V6.7h4.64v13.6Zm-6.55-13.88v13.88h-4.63v-5.26c-.85 1-2.18 1.48-3.7 1.48-3.08 0-5.38-2.3-5.38-5.73S20.1 5.06 23.3 5.06c1.6 0 2.87.5 3.65 1.48V6.7h4.63ZM22.5 8.65c-1.62 0-2.9 1.25-2.9 3.12 0 1.87 1.28 3.12 2.9 3.12 1.62 0 2.9-1.25 2.9-3.12 0-1.87-1.28-3.12-2.9-3.12ZM9.95 20.3h-4.2c0-2.3-1.04-3.57-3.06-4.04V13.8c3.08.64 5.3 2.1 6.5 4.88l.76 1.62ZM7.27 12.33a2.35 2.35 0 0 1 0-4.7 2.35 2.35 0 0 1 0 4.7ZM14.1 6.7v13.6h-4.64V6.7h4.64Z" />
        </svg>
    );
}

function CoinbaseLogo() {
    return (
        <span className="font-bold text-xl tracking-tight text-white flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-[#0052FF] flex items-center justify-center text-[10px] text-white">C</span>
            coinbase
        </span>
    );
}

function TradingViewLogo() {
    return (
        <span className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity="0.2" /><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" /><path d="M13 7h-2v10h2V7z" /></svg>
            TradingView
        </span>
    );
}

export function TrustBadges() {
    return (
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-b border-[#2E3A52]/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16">

                {/* Partner Logos - Centered when alone */}
                <div className="flex w-full justify-center items-center gap-10 md:gap-20 opacity-60 hover:opacity-100 transition-opacity duration-500">

                    <motion.div whileHover={{ scale: 1.05, filter: "brightness(1.5)" }} className="text-zinc-400">
                        <StripeLogo />
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, filter: "brightness(1.5)" }} className="text-zinc-400">
                        <CoinbaseLogo />
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, filter: "brightness(1.5)" }} className="text-zinc-400">
                        <TradingViewLogo />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
