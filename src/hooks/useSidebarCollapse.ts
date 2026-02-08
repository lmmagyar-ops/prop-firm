"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "sidebar-collapsed-override";

/** Routes where the sidebar auto-collapses by default */
const AUTO_COLLAPSE_ROUTES = ["/dashboard/trade"];

function shouldAutoCollapse(pathname: string): boolean {
    return AUTO_COLLAPSE_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Context-aware sidebar collapse hook.
 *
 * - Auto-collapses on trade routes for maximum market grid space
 * - Remembers manual overrides per-route-class in localStorage
 * - `[` keyboard shortcut toggles
 */
export function useSidebarCollapse() {
    const pathname = usePathname();
    const isTradeRoute = shouldAutoCollapse(pathname);

    const [isCollapsed, setIsCollapsed] = useState(() => {
        // SSR-safe: default to route-aware state
        if (typeof window === "undefined") return isTradeRoute;

        // Check for a stored manual override
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
            const override = JSON.parse(stored) as {
                tradeCollapsed?: boolean;
                defaultCollapsed?: boolean;
            };
            if (isTradeRoute && override.tradeCollapsed !== undefined) {
                return override.tradeCollapsed;
            }
            if (!isTradeRoute && override.defaultCollapsed !== undefined) {
                return override.defaultCollapsed;
            }
        }

        // No override — use route-aware default
        return isTradeRoute;
    });

    // When route changes, apply the correct default (unless overridden)
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
            const override = JSON.parse(stored) as {
                tradeCollapsed?: boolean;
                defaultCollapsed?: boolean;
            };
            if (isTradeRoute && override.tradeCollapsed !== undefined) {
                setIsCollapsed(override.tradeCollapsed);
                return;
            }
            if (!isTradeRoute && override.defaultCollapsed !== undefined) {
                setIsCollapsed(override.defaultCollapsed);
                return;
            }
        }
        // No override for this route class — use default
        setIsCollapsed(isTradeRoute);
    }, [isTradeRoute]);

    const toggle = useCallback(() => {
        setIsCollapsed((prev) => {
            const next = !prev;

            // Store the override for this route class
            const stored = localStorage.getItem(STORAGE_KEY);
            const override = stored
                ? (JSON.parse(stored) as Record<string, boolean>)
                : {};

            if (isTradeRoute) {
                override.tradeCollapsed = next;
            } else {
                override.defaultCollapsed = next;
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(override));
            return next;
        });
    }, [isTradeRoute]);

    // Keyboard shortcut: `[` to toggle
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Don't trigger in inputs/textareas
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if (e.key === "[") {
                e.preventDefault();
                toggle();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggle]);

    return { isCollapsed, toggle };
}
