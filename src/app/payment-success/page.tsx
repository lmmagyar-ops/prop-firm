"use client";

import { CheckCircle2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createChallengeAction } from "@/app/actions/challenges";
import { useEffect, useState, useRef } from "react";

export default function PaymentSuccessPage() {
    const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const provisionAccount = async () => {
            // Simulate a slight "Systems" delay for realism
            await new Promise(r => setTimeout(r, 1500));

            const result = await createChallengeAction("10k_challenge");
            if (result.success) {
                setStatus("success");
            } else {
                setStatus("error");
            }
        };

        provisionAccount();
    }, []);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

            {status === "processing" && (
                <div className="text-center z-10">
                    <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-2">Provisioning Terminal</h2>
                    <p className="text-zinc-500 animate-pulse">Allocating capital and risk controls...</p>
                </div>
            )}

            {status === "error" && (
                <div className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-red-500/20 rounded-2xl p-12 shadow-2xl relative z-10 text-center">
                    <div className="flex justify-center mb-6">
                        <AlertCircle className="w-16 h-16 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-4">Provisioning Failed</h1>
                    <p className="text-zinc-400 mb-8">
                        We could not create your account automatically. Please contact support.
                    </p>
                    <Link href="/dashboard">
                        <Button variant="outline" className="w-full">Return to Dashboard</Button>
                    </Link>
                </div>
            )}

            {status === "success" && (
                <div className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-12 shadow-2xl relative z-10 text-center animate-in fade-in zoom-in duration-300">

                    <div className="flex justify-center mb-8">
                        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.4)] animate-in zoom-in duration-500">
                            <CheckCircle2 className="w-12 h-12 text-black" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-4">You Are Live!</h1>

                    <p className="text-zinc-400 mb-8 leading-relaxed">
                        Your $10,000 evaluation account is ready. <br />
                        Prove your edge. Good luck.
                    </p>

                    <div className="bg-zinc-800/50 rounded-xl p-6 mb-8 border border-white/5 text-left space-y-3">
                        <div className="flex justify-between">
                            <span className="text-zinc-500 text-sm">Status</span>
                            <span className="text-green-400 font-mono font-bold uppercase">Active</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500 text-sm">Account Balance</span>
                            <span className="text-white font-mono font-bold">$10,000.00</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500 text-sm">Transaction ID</span>
                            <span className="text-zinc-500 font-mono text-xs">tx_{Math.random().toString(36).substring(7)}</span>
                        </div>
                    </div>

                    <Link href="/dashboard">
                        <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-xl shadow-[0_0_20px_-5px_rgba(41,175,115,0.5)] transition-all">
                            Enter Terminal <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>

                </div>
            )}
        </div>
    );
}
