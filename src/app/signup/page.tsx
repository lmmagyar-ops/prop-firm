"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart3, Loader2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
// Note: Toast import might be missing if not installed, using console for now or minimal error handling
// import { toast } from "sonner"; // Assuming sonner is available or we'll add it

export default function SignupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        email: "",
        displayName: "",
        country: "",
        terms: false,
        age: false,
    });

    // Intent Preservation
    useEffect(() => {
        const intent = searchParams.get("intent");
        const tier = searchParams.get("tier");
        if (intent && tier) {
            localStorage.setItem("onboarding_intent", JSON.stringify({ intent, tier }));
        }
    }, [searchParams]);

    const countries = [
        "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Japan", "Brazil", "India", "China"
    ]; // Simplified list

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!form.terms) {
            setError("You must agree to the Terms of Use and Privacy Policy.");
            return;
        }
        if (!form.age) {
            setError("You must verify that you are at least 18 years old.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email,
                    displayName: form.displayName,
                    country: form.country,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Registration failed");
            }

            // Success -> Navigate to Verify Email page
            router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Header Logo */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                            <BarChart3 className="text-white w-6 h-6" />
                        </div>
                        <span className="font-serif font-bold text-3xl tracking-tight text-white">Project X</span>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <h1 className="text-2xl font-bold text-white text-center mb-6">Create your account</h1>

                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email <span className="text-blue-500">*</span></label>
                            <Input
                                type="email"
                                placeholder="Type your email..."
                                required
                                className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-blue-500/50 h-11"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Display Name <span className="text-blue-500">*</span></label>
                            <Input
                                type="text"
                                placeholder="Type your display name..."
                                required
                                className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-blue-500/50 h-11"
                                value={form.displayName}
                                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Country <span className="text-blue-500">*</span></label>
                            <Select onValueChange={(val) => setForm({ ...form, country: val })} required>
                                <SelectTrigger className="bg-black/40 border-white/10 text-white h-11">
                                    <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                    {countries.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="pt-2 space-y-3">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="terms"
                                    checked={form.terms}
                                    onCheckedChange={(c) => setForm({ ...form, terms: c as boolean })}
                                    className="border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 mt-0.5"
                                />
                                <label htmlFor="terms" className="text-xs text-zinc-400 leading-snug cursor-pointer select-none">
                                    I agree to the <span className="text-zinc-300 hover:text-white underline decoration-white/30">Terms of Use</span> and <span className="text-zinc-300 hover:text-white underline decoration-white/30">Privacy Policy</span> <span className="text-blue-500">*</span>
                                </label>
                            </div>

                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="age"
                                    checked={form.age}
                                    onCheckedChange={(c) => setForm({ ...form, age: c as boolean })}
                                    className="border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 mt-0.5"
                                />
                                <label htmlFor="age" className="text-xs text-zinc-400 leading-snug cursor-pointer select-none">
                                    I verify I am at least 18 years old <span className="text-blue-500">*</span>
                                </label>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-blue-500 hover:bg-blue-400 text-white font-bold text-base rounded-lg transition-all shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] mt-4"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Register"}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-zinc-500">
                            Already have an account? <Link href="/api/auth/signin" className="text-white font-medium hover:underline">Log in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
