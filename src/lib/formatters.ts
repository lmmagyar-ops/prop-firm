/**
 * Unified Formatting Utilities
 * 
 * Single source of truth for all display formatting across the app.
 * Consolidates formatPrice, formatVolume, formatCurrency, etc.
 */

import type { Platform } from "./platform-theme";

// ─────────────────────────────────────────────────────────────────
// PRICE FORMATTING
// ─────────────────────────────────────────────────────────────────

/**
 * Format a probability (0-1) as a display price
 * @param price - Probability between 0 and 1
 * @param platform - "polymarket" (56%) or "kalshi" (56¢)
 */
export function formatPrice(price: number, platform: Platform = "polymarket"): string {
    const cents = price * 100;

    if (platform === "kalshi") {
        if (cents < 1) return "<1¢";
        if (cents > 99) return "99¢";
        return `${cents.toFixed(1)}¢`;
    }

    // Polymarket format (percent)
    if (cents < 1) return "<1%";
    if (cents > 99) return ">99%";
    return `${cents.toFixed(1)}%`;
}

/**
 * Format price from string (order book format)
 * @param price - String price like "0.56"
 */
export function formatOrderBookPrice(price: string): string {
    const p = parseFloat(price);
    return `${(p * 100).toFixed(1)}¢`;
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

// ─────────────────────────────────────────────────────────────────
// VOLUME / CURRENCY FORMATTING
// ─────────────────────────────────────────────────────────────────

/**
 * Format volume with K/M/B suffixes
 * @param volume - Raw volume number
 * @param prefix - Currency prefix (default "$")
 */
export function formatVolume(volume: number, prefix: string = "$"): string {
    if (volume >= 1_000_000_000) return `${prefix}${(volume / 1_000_000_000).toFixed(1)}B`;
    if (volume >= 1_000_000) return `${prefix}${(volume / 1_000_000).toFixed(1)}M`;
    if (volume >= 1_000) return `${prefix}${(volume / 1_000).toFixed(0)}k`;
    return `${prefix}${volume.toFixed(0)}`;
}

/**
 * Format currency with proper separators
 * @param value - Dollar amount
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Format order book size (K/M suffixes)
 */
export function formatOrderBookSize(size: string): string {
    const s = parseFloat(size);
    if (s >= 1_000_000) return `${(s / 1_000_000).toFixed(1)}M`;
    if (s >= 1_000) return `${(s / 1_000).toFixed(1)}K`;
    return s.toFixed(0);
}

// ─────────────────────────────────────────────────────────────────
// PERCENTAGE FORMATTING
// ─────────────────────────────────────────────────────────────────

/**
 * Format a decimal as percentage
 * @param value - Decimal like 0.15
 * @param decimals - Number of decimal places
 */
export function formatPercent(value: number, decimals: number = 0): string {
    return `${(value * 100).toFixed(decimals)}%`;
}
