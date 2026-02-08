"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect } from "react";
// import { useRouter } from "next/navigation"; // Not redirecting automatically yet, per screenshot "close this window"

export default function VerifySuccessPage() {
    // const router = useRouter();

    // useEffect(() => {
    //     // Optional auto-close or redirect logic
    // }, []);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
            <div className="w-full max-w-lg bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-12 shadow-2xl relative z-10 text-center">

                <h1 className="text-3xl font-bold text-white mb-8">Welcome to Predictions Firm</h1>

                <div className="flex justify-center mb-8">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.5)]">
                        <CheckCircle2 className="w-10 h-10 text-black" />
                    </div>
                </div>

                <p className="text-xl text-white font-medium mb-8">
                    You're authenticated, you can close this window now
                </p>

                <div className="flex items-center justify-center gap-2 text-zinc-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>

                <p className="text-xs text-zinc-600 mt-8">
                    If you don't see the email, please check your spam or junk folder.
                </p>
            </div>
        </div>
    );
}
