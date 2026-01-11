"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface BuyEvaluationButtonProps {
    label?: string;
}

export function BuyEvaluationButton({ label = "Start Challenge - From $79" }: BuyEvaluationButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleBuy = async () => {
        setLoading(true);
        try {
            // Redirect to checkout page (Confirmo/PayPal integration)
            window.location.href = "/buy-evaluation";
        } catch (error) {
            console.error("Checkout failed", error);
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleBuy}
            disabled={loading}
            size="lg"
            className="w-full h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-lg tracking-wide shadow-[0_4px_20px_-5px_rgba(59,130,246,0.5)] transition-all transform hover:scale-[1.02]"
        >
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Redirecting to Checkout...
                </>
            ) : (
                label
            )}
        </Button>
    );
}
