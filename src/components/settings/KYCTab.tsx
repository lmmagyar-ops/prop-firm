
"use client";

import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function KYCTab() {
    const [status, setStatus] = useState<'not_started' | 'in_progress'>('not_started');

    const startVerification = () => {
        setStatus('in_progress');
        // Simulate SumSub initialization
        toast.info("Initializing identity verification...");

        // In a real app, we would load the SumSub SDK here
    };

    if (status === 'in_progress') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-white/20 rounded-xl bg-zinc-900/20">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Identity Verification</h3>
                <p className="text-zinc-500 mb-8 max-w-md text-center">
                    Pleaase follow the instructions in the verification window.
                    Do not close this tab until the process is complete.
                </p>
                <div className="bg-black border border-white/10 rounded-lg p-8 w-full max-w-md text-center">
                    <p className="text-zinc-600 font-mono text-sm">[SumSub SDK Placeholder]</p>
                </div>
                <Button
                    variant="ghost"
                    className="mt-8 text-zinc-500 hover:text-white"
                    onClick={() => setStatus('not_started')}
                >
                    Cancel Verification
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8 text-primary" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-4">Identity Verification Required</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed max-w-lg mx-auto">
                To withdraw funds or trade with larger accounts, you must complete KYC verification.
                This process takes 5-10 minutes and requires a government-issued ID and a live selfie.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left max-w-lg mx-auto">
                {[
                    { title: "Government ID", desc: "Passport, Driver's License" },
                    { title: "Liveness Check", desc: "Selfie verification" },
                    { title: "Proof of Address", desc: "Utility bill or bank statement" }
                ].map((item, i) => (
                    <div key={i} className="bg-zinc-900/50 border border-white/10 rounded-lg p-4">
                        <p className="text-white font-medium text-sm mb-1">{item.title}</p>
                        <p className="text-zinc-500 text-xs">{item.desc}</p>
                    </div>
                ))}
            </div>

            <Button
                size="lg"
                onClick={startVerification}
                className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 shadow-lg shadow-primary/20"
            >
                Start Verification
            </Button>
        </div>
    );
}
