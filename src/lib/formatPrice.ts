/**
 * Price Formatting Utilities
 * 
 * Formats prices based on platform convention:
 * - Polymarket: 56% (percent)
 * - Kalshi: 56¢ (cents)
 */

import type { Platform } from "./platform-theme";

/**
 * Format a probability (0-1) as a display price
 */
export function formatPrice(price: number, platform: Platform = "polymarket"): string {
    const cents = Math.round(price * 100);

    if (platform === "kalshi") {
        if (cents < 1) return "<1¢";
        if (cents > 99) return "99¢";
        return `${cents}¢`;
    }

    // Polymarket format (percent)
    if (cents < 1) return "<1%";
    if (cents > 99) return ">99%";
    return `${cents}%`;
}

/**
 * Format potential payout: "$100 → $174"
 */
export function formatPayout(price: number, stake: number = 100): string {
    if (price <= 0 || price >= 1) return "";
    const payout = Math.round(stake / price);
    return `$${stake} → $${payout}`;
}

/**
 * Get color class for a price (higher = greener for frontrunners)
 */
export function getPriceColorClass(price: number, isSelected: boolean = false): string {
    if (isSelected) return "bg-green-500 text-white";
    if (price >= 0.7) return "bg-green-500/20 text-green-400";
    if (price >= 0.4) return "bg-zinc-700 text-white";
    return "bg-zinc-800 text-zinc-300";
}
