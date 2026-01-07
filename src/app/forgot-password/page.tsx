"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Loader2, ArrowLeft, CheckCircle2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setSubmitted(true);
            } else {
                setError(data.error || "Something went wrong");
            }
        } catch (err) {
            setError("Failed to send request. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md space-y-8">
                {/* Header */}
                <div className="text-center">
                    <Link href="/" className="font-serif font-bold text-4xl tracking-tight text-white">
                        Propshot
                    </Link>
                    <p className="mt-4 text-zinc-400 text-sm">
                        {submitted ? "Check your email" : "Reset your password"}
                    </p>
                </div>

                {/* Card */}
                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 space-y-6">
                    {submitted ? (
                        // Success State
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-white">Check your inbox</h2>
                            <p className="text-zinc-400 text-sm">
                                If an account exists for <span className="text-white font-medium">{email}</span>,
                                you'll receive a password reset link shortly.
                            </p>
                            <div className="pt-4">
                                <Link href="/login">
                                    <Button variant="outline" className="w-full border-white/10 text-zinc-300">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to Sign In
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        // Form State
                        <>
                            <div className="text-center mb-6">
                                <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                                    <Mail className="w-6 h-6 text-blue-400" />
                                </div>
                                <p className="text-zinc-400 text-sm">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-500">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="email" className="text-zinc-400">
                                        Email Address
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="mt-2 bg-black/40 border-white/10 text-white placeholder:text-zinc-600"
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading || !email}
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        "Send Reset Link"
                                    )}
                                </Button>
                            </form>

                            <div className="text-center pt-2">
                                <Link
                                    href="/login"
                                    className="text-sm text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-3 h-3" />
                                    Back to Sign In
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
