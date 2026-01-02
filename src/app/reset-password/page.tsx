"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Lock } from "lucide-react";

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password, confirmPassword }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push("/login?reset=true");
                }, 3000);
            } else {
                setError(data.error || "Failed to reset password");
            }
        } catch (err) {
            setError("Failed to reset password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // No token provided
    if (!token) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <Link href="/" className="font-serif font-bold text-4xl tracking-tight text-white">
                            Project X
                        </Link>
                    </div>
                    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Invalid Reset Link</h2>
                        <p className="text-zinc-400 text-sm">
                            This password reset link is invalid or has expired.
                        </p>
                        <Link href="/forgot-password">
                            <Button className="mt-4 bg-blue-600 hover:bg-blue-500">
                                Request New Link
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md space-y-8">
                {/* Header */}
                <div className="text-center">
                    <Link href="/" className="font-serif font-bold text-4xl tracking-tight text-white">
                        Project X
                    </Link>
                    <p className="mt-4 text-zinc-400 text-sm">
                        {success ? "Password reset successful" : "Create a new password"}
                    </p>
                </div>

                {/* Card */}
                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 space-y-6">
                    {success ? (
                        // Success State
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-white">Password Updated!</h2>
                            <p className="text-zinc-400 text-sm">
                                Your password has been reset successfully. Redirecting to login...
                            </p>
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-500" />
                        </div>
                    ) : (
                        // Form State
                        <>
                            <div className="text-center mb-6">
                                <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                                    <Lock className="w-6 h-6 text-blue-400" />
                                </div>
                                <p className="text-zinc-400 text-sm">
                                    Enter your new password below.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-500 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="password" className="text-zinc-400">
                                        New Password
                                    </Label>
                                    <div className="relative mt-2">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min 8 chars, 1 upper, 1 number"
                                            className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 pr-10"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="confirmPassword" className="text-zinc-400">
                                        Confirm Password
                                    </Label>
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your new password"
                                        className="mt-2 bg-black/40 border-white/10 text-white placeholder:text-zinc-600"
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading || !password || !confirmPassword}
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        "Reset Password"
                                    )}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
