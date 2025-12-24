"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";

function LoginContent() {
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/dashboard";
    const error = searchParams.get("error");

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        await signIn("google", { callbackUrl: redirect });
    };

    const handleCredentialsSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Let NextAuth handle CSRF and redirect automatically
            await signIn("credentials", {
                email: formData.email,
                password: formData.password,
                callbackUrl: redirect,
            });
            // Note: signIn does not return here if redirecting
        } catch (err) {
            console.error("Login Error:", err);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md space-y-8">
                {/* Header */}
                <div className="text-center">
                    <Link href="/" className="font-serif font-bold text-4xl tracking-tight text-white">
                        Project X
                    </Link>
                    <p className="mt-4 text-zinc-400 text-sm">
                        Sign in to your account to continue
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-500 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error === "CredentialsSignin" ? "Invalid details" : "Login failed"}
                        </div>
                    )}

                    {/* Google Sign In */}
                    <Button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full h-12 bg-white hover:bg-gray-100 text-black font-semibold flex items-center justify-center gap-3"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </Button>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-900/50 px-2 text-zinc-500">Or continue with email</span>
                        </div>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleCredentialsSignIn} className="space-y-4">
                        <div>
                            <Label htmlFor="email" className="text-zinc-400">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="you@example.com"
                                className="mt-2 bg-black/40 border-white/10 text-white placeholder:text-zinc-600"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="password" className="text-zinc-400">
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                className="mt-2 bg-black/40 border-white/10 text-white placeholder:text-zinc-600"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                        </Button>
                    </form>
                </div>

                {/* Sign Up Link */}
                <p className="text-center text-sm text-zinc-500">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-semibold">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
            <LoginContent />
        </Suspense>
    );
}
