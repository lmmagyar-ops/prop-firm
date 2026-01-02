/**
 * Platform Theme Configuration
 * 
 * Defines visual styling differences between Polymarket and Kalshi.
 */

export type Platform = "polymarket" | "kalshi";

export interface PlatformTheme {
    name: string;
    icon: string;
    priceFormat: "percent" | "cents";
    mode: "dark" | "light";
    colors: {
        // Accent colors
        accent: string;
        accentBg: string;
        accentBorder: string;
        accentHover: string;
        positive: string;      // Win/Yes color
        negative: string;      // Lose/No color
        positiveText: string;
        negativeText: string;
    };
    page: {
        // Full page theming
        background: string;
        text: string;
        textMuted: string;
        border: string;
        // Cards
        cardBg: string;
        cardBorder: string;
        cardHover: string;
        // Inputs & buttons
        inputBg: string;
        buttonBg: string;
        buttonText: string;
        // Sidebar & header
        sidebarBg: string;
        sidebarText: string;
        sidebarHover: string;
        headerBg: string;
        // Scrollbar
        scrollTrack: string;
        scrollThumb: string;
    };
    cardStyle: "stacked" | "matchup";
}

export const platformThemes: Record<Platform, PlatformTheme> = {
    polymarket: {
        name: "Polymarket",
        icon: "🌐",
        priceFormat: "percent",
        mode: "dark",
        colors: {
            accent: "text-purple-400",
            accentBg: "bg-purple-500/10",
            accentBorder: "border-purple-500/30",
            accentHover: "hover:bg-purple-500/20",
            positive: "bg-emerald-500",
            negative: "bg-red-500",
            positiveText: "text-emerald-400",
            negativeText: "text-red-400",
        },
        page: {
            background: "bg-zinc-950",
            text: "text-white",
            textMuted: "text-zinc-400",
            border: "border-white/10",
            cardBg: "bg-zinc-900/50",
            cardBorder: "border-white/5",
            cardHover: "hover:border-white/20",
            inputBg: "bg-zinc-800",
            buttonBg: "bg-zinc-800",
            buttonText: "text-white",
            sidebarBg: "bg-zinc-950",
            sidebarText: "text-zinc-300",
            sidebarHover: "hover:bg-white/5",
            headerBg: "bg-zinc-950/80",
            scrollTrack: "bg-zinc-900",
            scrollThumb: "bg-zinc-700",
        },
        cardStyle: "stacked",
    },
    kalshi: {
        name: "Kalshi",
        icon: "🇺🇸",
        priceFormat: "cents",
        mode: "light",
        colors: {
            accent: "text-green-600",
            accentBg: "bg-green-500/10",
            accentBorder: "border-green-500/30",
            accentHover: "hover:bg-green-500/20",
            positive: "bg-green-500",
            negative: "bg-slate-500",
            positiveText: "text-green-600",
            negativeText: "text-slate-600",
        },
        page: {
            background: "bg-slate-50",
            text: "text-slate-900",
            textMuted: "text-slate-500",
            border: "border-slate-200",
            cardBg: "bg-white",
            cardBorder: "border-slate-200",
            cardHover: "hover:border-slate-300 hover:shadow-md",
            inputBg: "bg-white",
            buttonBg: "bg-slate-100",
            buttonText: "text-slate-900",
            sidebarBg: "bg-white",
            sidebarText: "text-slate-700",
            sidebarHover: "hover:bg-slate-100",
            headerBg: "bg-white/80",
            scrollTrack: "bg-slate-100",
            scrollThumb: "bg-slate-400",
        },
        cardStyle: "matchup",
    },
};

export function getTheme(platform: Platform): PlatformTheme {
    return platformThemes[platform];
}

