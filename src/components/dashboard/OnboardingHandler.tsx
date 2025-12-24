"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function OnboardingHandler() {
    const router = useRouter();

    useEffect(() => {
        const savedIntent = localStorage.getItem("onboarding_intent");
        if (savedIntent) {
            try {
                const { intent, tier, price } = JSON.parse(savedIntent);
                if (intent === "buy_evaluation" && tier) {
                    // Clear the intent so we don't loop
                    localStorage.removeItem("onboarding_intent");

                    // Redirect to the Buy Evaluation tab instead of direct checkout
                    router.push("/buy-evaluation");
                }
            } catch (e) {
                console.error("Failed to parse onboarding intent", e);
                localStorage.removeItem("onboarding_intent");
            }
        }
    }, [router]);

    return null; // Invisible component
}
