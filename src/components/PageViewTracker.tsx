"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Client component that tracks page views
 * Sends to our event logging API when the pathname changes
 */
export function PageViewTracker({ userId }: { userId: string }) {
    const pathname = usePathname();
    const lastPathRef = useRef<string>("");

    useEffect(() => {
        // Only track if pathname changed (avoid double-tracking)
        if (pathname === lastPathRef.current) return;
        lastPathRef.current = pathname;

        // Fire and forget - don't block rendering
        fetch("/api/events/page-view", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                page: pathname,
                userId
            }),
        }).catch(() => {
            // Silently fail - analytics should never break the app
        });

    }, [pathname, userId]);

    return null; // Invisible component
}
