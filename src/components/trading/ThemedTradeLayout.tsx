"use client";

import { getTheme, type Platform } from "@/lib/platform-theme";
import { cn } from "@/lib/utils";

interface ThemedTradeLayoutProps {
    platform: Platform;
    children: React.ReactNode;
}

/**
 * Applies full platform theming to the trade page content area.
 * Kalshi = light mode, Polymarket = dark mode
 */
export function ThemedTradeLayout({ platform, children }: ThemedTradeLayoutProps) {
    const theme = getTheme(platform);

    return (
        <div
            className={cn(
                "transition-colors duration-300 overflow-x-hidden",
                theme.page.background,
                theme.page.text,
                // Custom scrollbar styling
                platform === "kalshi"
                    ? "[&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full"
                    : "[&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-zinc-900 [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full"
            )}
        >
            {children}
        </div>
    );
}
