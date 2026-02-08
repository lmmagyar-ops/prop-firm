"use client";

import { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { TraderBotGuard } from "@/components/TraderBotGuard";

// Country list with codes
const COUNTRIES = [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "GB", name: "United Kingdom" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "AU", name: "Australia" },
    { code: "NZ", name: "New Zealand" },
    { code: "NL", name: "Netherlands" },
    { code: "BE", name: "Belgium" },
    { code: "AT", name: "Austria" },
    { code: "CH", name: "Switzerland" },
    { code: "IE", name: "Ireland" },
    { code: "SE", name: "Sweden" },
    { code: "NO", name: "Norway" },
    { code: "DK", name: "Denmark" },
    { code: "FI", name: "Finland" },
    { code: "ES", name: "Spain" },
    { code: "IT", name: "Italy" },
    { code: "PT", name: "Portugal" },
    { code: "PL", name: "Poland" },
    { code: "CZ", name: "Czech Republic" },
    { code: "JP", name: "Japan" },
    { code: "KR", name: "South Korea" },
    { code: "SG", name: "Singapore" },
    { code: "HK", name: "Hong Kong" },
    { code: "TW", name: "Taiwan" },
    { code: "MY", name: "Malaysia" },
    { code: "TH", name: "Thailand" },
    { code: "PH", name: "Philippines" },
    { code: "IN", name: "India" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "SA", name: "Saudi Arabia" },
    { code: "IL", name: "Israel" },
    { code: "TR", name: "Turkey" },
    { code: "ZA", name: "South Africa" },
    { code: "NG", name: "Nigeria" },
    { code: "KE", name: "Kenya" },
    { code: "MX", name: "Mexico" },
    { code: "BR", name: "Brazil" },
    { code: "AR", name: "Argentina" },
    { code: "CL", name: "Chile" },
    { code: "CO", name: "Colombia" },
].sort((a, b) => a.name.localeCompare(b.name));

interface FormData {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    confirmPassword: string;
    country: string;
    agreedToTerms: boolean;
}

function SignupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/dashboard";

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [botVerified, setBotVerified] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        confirmPassword: "",
        country: "",
        agreedToTerms: false,
    });

    // Password strength indicators
    const passwordChecks = {
        length: formData.password.length >= 8,
        uppercase: /[A-Z]/.test(formData.password),
        lowercase: /[a-z]/.test(formData.password),
        number: /[0-9]/.test(formData.password),
    };

    const allPasswordChecksPassed = Object.values(passwordChecks).every(Boolean);
    const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Client-side validation
        if (!formData.email || !formData.firstName || !formData.lastName || !formData.password || !formData.confirmPassword || !formData.country) {
            setError("All fields are required");
            return;
        }

        if (!allPasswordChecksPassed) {
            setError("Password does not meet requirements");
            return;
        }

        if (!passwordsMatch) {
            setError("Passwords do not match");
            return;
        }

        if (!formData.agreedToTerms) {
            setError("You must agree to the Terms and Conditions");
            return;
        }

        if (!botVerified) {
            setError("Please complete the trader verification");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    botVerified: true,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                toast.success("Account created! Check your email to verify.");
            } else {
                setError(data.error || "Failed to create account");
            }
        } catch (err) {
            console.error("Signup Error:", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Check Your Email!</h2>
                    <p className="text-zinc-400">
                        We've sent a verification link to <span className="text-white font-medium">{formData.email}</span>.
                        Please click the link to verify your account before signing in.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block mt-4 text-primary hover:text-primary/80 font-semibold"
                    >
                        Go to Login →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md space-y-6">
                {/* Header */}
                <div className="text-center">
                    <Link href="/" className="inline-block">
                        <img src="/logo-wordmark-white.png" alt="Predictions Firm" className="h-10 w-auto mx-auto" />
                    </Link>
                    <p className="mt-4 text-zinc-400 text-sm">
                        Create your trading account
                    </p>
                </div>

                {/* Signup Card */}
                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-500 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <Label htmlFor="email" className="text-zinc-400">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="you@example.com"
                                className="mt-1.5 bg-black/40 border-white/10 text-white placeholder:text-zinc-600"
                                required
                            />
                        </div>

                        {/* Name Fields - Side by Side */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="firstName" className="text-zinc-400">First Name</Label>
                                <Input
                                    id="firstName"
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    placeholder="John"
                                    className="mt-1.5 bg-black/40 border-white/10 text-white placeholder:text-zinc-600"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName" className="text-zinc-400">Last Name</Label>
                                <Input
                                    id="lastName"
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    placeholder="Doe"
                                    className="mt-1.5 bg-black/40 border-white/10 text-white placeholder:text-zinc-600"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <Label htmlFor="password" className="text-zinc-400">Password</Label>
                            <div className="relative mt-1.5">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
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
                            {/* Password Requirements */}
                            {formData.password.length > 0 && (
                                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                                    <div className={`flex items-center gap-1 ${passwordChecks.length ? 'text-green-400' : 'text-zinc-500'}`}>
                                        {passwordChecks.length ? '✓' : '○'} 8+ characters
                                    </div>
                                    <div className={`flex items-center gap-1 ${passwordChecks.uppercase ? 'text-green-400' : 'text-zinc-500'}`}>
                                        {passwordChecks.uppercase ? '✓' : '○'} Uppercase
                                    </div>
                                    <div className={`flex items-center gap-1 ${passwordChecks.lowercase ? 'text-green-400' : 'text-zinc-500'}`}>
                                        {passwordChecks.lowercase ? '✓' : '○'} Lowercase
                                    </div>
                                    <div className={`flex items-center gap-1 ${passwordChecks.number ? 'text-green-400' : 'text-zinc-500'}`}>
                                        {passwordChecks.number ? '✓' : '○'} Number
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <Label htmlFor="confirmPassword" className="text-zinc-400">Confirm Password</Label>
                            <div className="relative mt-1.5">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                    className={`bg-black/40 border-white/10 text-white placeholder:text-zinc-600 pr-10 ${formData.confirmPassword.length > 0
                                        ? passwordsMatch
                                            ? 'border-green-500/50'
                                            : 'border-red-500/50'
                                        : ''
                                        }`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {formData.confirmPassword.length > 0 && !passwordsMatch && (
                                <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                            )}
                        </div>

                        {/* Country Select */}
                        <div>
                            <Label htmlFor="country" className="text-zinc-400">Country</Label>
                            <Select
                                value={formData.country}
                                onValueChange={(value) => setFormData({ ...formData, country: value })}
                            >
                                <SelectTrigger className="mt-1.5 bg-black/40 border-white/10 text-white">
                                    <SelectValue placeholder="Select your country" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
                                    {COUNTRIES.map((country) => (
                                        <SelectItem
                                            key={country.code}
                                            value={country.code}
                                            className="text-zinc-200 focus:bg-zinc-800 focus:text-white"
                                        >
                                            {country.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Terms and Conditions */}
                        <div className="flex items-start gap-2">
                            <Checkbox
                                id="terms"
                                checked={formData.agreedToTerms}
                                onCheckedChange={(checked) => setFormData({ ...formData, agreedToTerms: checked as boolean })}
                                className="mt-0.5 border-zinc-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label htmlFor="terms" className="text-sm text-zinc-400 leading-tight cursor-pointer">
                                I agree to the{" "}
                                <Link href="/terms" className="text-primary hover:text-primary/80 underline" target="_blank">
                                    Terms and Conditions
                                </Link>
                            </Label>
                        </div>

                        {/* Trader Bot Guard */}
                        <TraderBotGuard onVerified={setBotVerified} />

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={isLoading || !allPasswordChecksPassed || !passwordsMatch || !formData.agreedToTerms || !botVerified}
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign Up"}
                        </Button>
                    </form>
                </div>

                {/* Sign In Link */}
                <p className="text-center text-sm text-zinc-500">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:text-primary/80 font-semibold">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
            <SignupContent />
        </Suspense>
    );
}
