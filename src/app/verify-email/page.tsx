"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Mail, RefreshCw } from "lucide-react";

export default function VerifyEmailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email");

    const [code, setCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isResending, setIsResending] = useState(false); // ADD
    const [resendMessage, setResendMessage] = useState(""); // ADD
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null); // ADD

    useEffect(() => {
        if (!email) return;

        // Poll for status and get code
        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/auth/pending-user?email=${encodeURIComponent(email)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.isVerified) {
                        router.push("/dashboard"); // Redirect if verified
                    }
                    if (data.verificationCode) {
                        setCode(data.verificationCode);
                    }
                    // ADD: Calculate time remaining
                    if (data.expiresAt) {
                        const expiryTime = new Date(data.expiresAt).getTime();
                        const now = Date.now();
                        const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
                        setTimeRemaining(remaining);
                    }
                }
            } catch (error) {
                console.error("Polling error", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkStatus(); // Initial check
        const interval = setInterval(checkStatus, 3000); // Poll every 3s

        return () => clearInterval(interval);
    }, [email, router]);

    // ADD: Resend handler
    const handleResend = async () => {
        if (!email) return;

        setIsResending(true);
        setResendMessage("");

        try {
            const res = await fetch("/api/auth/resend-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to resend");
            }

            setResendMessage("✅ New code sent! Check your email.");

            // Refresh the code display
            const statusRes = await fetch(`/api/auth/pending-user?email=${encodeURIComponent(email)}`);
            if (statusRes.ok) {
                const data = await statusRes.json();
                setCode(data.verificationCode);
            }

        } catch (err: any) {
            setResendMessage(`❌ ${err.message}`);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-lg bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 text-center">

                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <Mail className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Welcome to Project X</h1>
                <p className="text-zinc-400 mb-6">Your account has been created.</p>

                <div className="bg-zinc-800/50 rounded-xl p-6 mb-8 border border-white/5">
                    <p className="text-sm text-zinc-400 mb-4">
                        Check <span className="text-blue-400 font-semibold">{email}</span> to activate your account.
                    </p>

                    <p className="text-sm text-zinc-300 mb-4">
                        In the email, click the following number to authenticate
                    </p>

                    <div className="text-6xl font-black text-white mb-6 tracking-wider font-mono">
                        {isLoading ? "..." : code}
                    </div>

                    {/* Fake Progress Bar */}
                    <div className="h-1.5 w-full bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-2/3 animate-pulse" />
                    </div>

                    {/* ADD: Display time remaining */}
                    {timeRemaining !== null && timeRemaining > 0 && (
                        <p className="text-xs text-zinc-500 mt-2">
                            Code expires in {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                        </p>
                    )}
                    {timeRemaining === 0 && (
                        <p className="text-xs text-red-500 mt-2">
                            ⚠️ Code expired. Click "Send again" to get a new one.
                        </p>
                    )}
                </div>

                {/* UPDATE: Add onClick and loading state */}
                <button
                    onClick={handleResend}
                    disabled={isResending}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isResending ? "Sending..." : "Send again"}
                </button>

                {/* ADD: Show resend message */}
                {resendMessage && (
                    <p className="text-xs text-center mb-4 text-zinc-300">
                        {resendMessage}
                    </p>
                )}

                <p className="text-xs text-zinc-500">
                    If you don't see the email, please check your spam or junk folder.
                </p>
            </div>
        </div>
    );
}
