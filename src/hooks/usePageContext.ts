"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function usePageContext() {
    const pathname = usePathname();
    const [timeOnPage, setTimeOnPage] = useState(0);
    const [scrollDepth, setScrollDepth] = useState(0);

    // Track time on page
    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            setTimeOnPage(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [pathname]);

    // Track scroll depth
    useEffect(() => {
        const handleScroll = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;
            const depth = Math.round((scrollTop / (documentHeight - windowHeight)) * 100);
            setScrollDepth(Math.min(depth, 100));
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return {
        currentPage: pathname,
        timeOnPage,
        scrollDepth,
    };
}
