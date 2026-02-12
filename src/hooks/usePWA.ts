"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWA() {
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if running as installed PWA
        const checkInstalled = () => {
            const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
            const isIOSStandalone = 'standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true;
            setIsInstalled(isStandalone || isIOSStandalone);
        };

        // Check if iOS
        const checkIOS = () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
            setIsIOS(isIOSDevice);
        };

        // Handle online/offline status
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        // Handle install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        // Handle app installed
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        };

        checkInstalled();
        checkIOS();
        setIsOnline(navigator.onLine);

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const promptInstall = async () => {
        if (!deferredPrompt) return false;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === "accepted") {
                setIsInstallable(false);
                setDeferredPrompt(null);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error prompting install:", error);
            return false;
        }
    };

    return {
        isInstallable,
        isInstalled,
        isOnline,
        isIOS,
        promptInstall,
    };
}
