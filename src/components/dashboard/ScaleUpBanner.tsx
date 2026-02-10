"use client";

import { useState, useEffect } from "react";
import { X, Rocket, ArrowRight } from "lucide-react";
import Link from "next/link";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import ShinyText from "@/components/reactbits/ShinyText";

interface ScaleUpBannerProps {
    /** Current challenge starting balance — used to adapt copy per tier */
    currentTierSize: number;
}

const DISMISS_KEY = "scaleup_banner_dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

function getTierCopy(tierSize: number) {
    if (tierSize <= 5000) {
        return {
            headline: "Diversify Your Edge",
            body: "Top traders run multiple accounts to spread risk. Add a second evaluation and double your funded potential.",
            cta: "Add Another Account",
            shiny: "2× the opportunity",
        };
    }
    if (tierSize <= 10000) {
        return {
            headline: "Go Bigger",
            body: "You're performing well. Multiply your funded capital with an additional $25k account.",
            cta: "Scale Up to $25k",
            shiny: "Maximize your edge",
        };
    }
    // $25k+ users
    return {
        headline: "Run Multiple Accounts",
        body: "Elite traders run 3+ accounts simultaneously. Add another evaluation to compound your profits.",
        cta: "Add Another Account",
        shiny: "Think like a fund",
    };
}

export function ScaleUpBanner({ currentTierSize }: ScaleUpBannerProps) {
    const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash

    useEffect(() => {
        const stored = localStorage.getItem(DISMISS_KEY);
        if (stored) {
            const dismissedAt = parseInt(stored, 10);
            if (Date.now() - dismissedAt < DISMISS_DURATION_MS) {
                setIsDismissed(true);
                return;
            }
        }
        setIsDismissed(false);
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
        setIsDismissed(true);
    };

    if (isDismissed) return null;

    const copy = getTierCopy(currentTierSize);

    return (
        <SpotlightCard
            className="relative bg-gradient-to-r from-[#0f1115] to-[#131720] border border-[#29af73]/20 rounded-2xl overflow-hidden"
            spotlightColor="rgba(41, 175, 115, 0.08)"
            spotlightSize={600}
        >
            {/* Subtle gradient accent line at top */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#29af73]/50 to-transparent" />

            <div className="relative p-5 sm:p-6 flex items-center gap-5">
                {/* Icon */}
                <div className="hidden sm:flex w-12 h-12 rounded-xl bg-[#29af73]/10 items-center justify-center border border-[#29af73]/20 flex-shrink-0">
                    <Rocket className="w-5 h-5 text-[#29af73]" />
                </div>

                {/* Copy */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-bold text-white">
                            {copy.headline}
                        </h3>
                        <ShinyText
                            text={copy.shiny}
                            speed={3}
                            color="#29af73"
                            shineColor="#6ee7b7"
                            className="text-xs font-semibold uppercase tracking-wider"
                        />
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                        {copy.body}
                    </p>
                </div>

                {/* CTA */}
                <Link
                    href="/buy-evaluation"
                    className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#29af73]/10 hover:bg-[#29af73]/20 border border-[#29af73]/30 hover:border-[#29af73]/50 text-[#29af73] text-sm font-semibold transition-all duration-200 hover:scale-[1.02] flex-shrink-0 group"
                >
                    {copy.cta}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* Mobile CTA */}
                <Link
                    href="/buy-evaluation"
                    className="sm:hidden flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#29af73]/10 border border-[#29af73]/30 text-[#29af73] text-xs font-semibold flex-shrink-0"
                >
                    Scale Up
                    <ArrowRight className="w-3 h-3" />
                </Link>

                {/* Dismiss */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 p-1 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-white/5 transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </SpotlightCard>
    );
}
