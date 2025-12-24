"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, Check, ShieldCheck, Lock } from "lucide-react";

export default function CheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // params
    const size = searchParams.get("size") || "5000";
    const plan = searchParams.get("plan") || "classic";
    const step = searchParams.get("step") || "1";
    const basePrice = parseFloat(searchParams.get("price") || "60");

    const [loading, setLoading] = useState(false);
    const [profitSplit, setProfitSplit] = useState(false);
    const [agreedRules, setAgreedRules] = useState(false);
    const [agreedRefund, setAgreedRefund] = useState(false);

    // Mock addon price
    const splitAddonPrice = basePrice * 0.2; // 20% addon
    const total = basePrice + (profitSplit ? splitAddonPrice : 0);

    const handlePayment = async () => {
        if (!agreedRules || !agreedRefund) return;

        setLoading(true);
        // Simulate network
        await new Promise(r => setTimeout(r, 1500));
        router.push("/payment-success");
    };

    // Soft Lock: Ensure user came from a valid internal flow
    useEffect(() => {
        const fromDashboard = searchParams.get("from_dashboard");
        // Optional: Allow if user has a session cookie (but we can't check easily clientside without context)
        // For now, strict enforcement of the flow param.
        if (!fromDashboard) {
            // Redirect to signup, preserving intent
            const currentSize = searchParams.get("size") || "10000";
            const currentPrice = searchParams.get("price") || "99";
            // Map size to ID (simplified)
            const tierId = currentSize === "5000" ? "5k" : currentSize === "25000" ? "25k" : "10k";

            router.push(`/signup?intent=buy_evaluation&tier=${tierId}&price=${currentPrice}`);
        }
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-[#05101a] text-white flex justify-center p-4 lg:p-8 font-sans">
            <div className="w-full max-w-6xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <Link href="/buy-evaluation">
                        <Button variant="ghost" className="text-white hover:text-blue-400 pl-0 hover:bg-transparent">
                            &lt; Back
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold flex-1">Purchase Evaluation</h1>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Left: Billing Info */}
                    <div className="bg-[#0f1926] border border-blue-900/30 rounded-xl p-6 lg:p-8">
                        <div className="flex items-center gap-2 mb-6 border-l-4 border-blue-500 pl-3">
                            <h2 className="text-lg font-bold">Billing Info</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-[#162231] rounded-lg p-6 space-y-4">
                                <h3 className="font-bold text-sm text-zinc-300">Customer Info</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-blue-400">First Name *</label>
                                        <Input placeholder="Type your first name here" className="bg-white text-black border-0 h-10 placeholder:text-zinc-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-blue-400">Last Name *</label>
                                        <Input placeholder="Type your last name here" className="bg-white text-black border-0 h-10 placeholder:text-zinc-400" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-blue-400">Email *</label>
                                    <Input value="sliponchain@gmail.com" readOnly className="bg-white text-black border-0 h-10 font-bold" />
                                </div>
                            </div>

                            <div className="bg-[#162231] rounded-lg p-6 space-y-4">
                                <h3 className="font-bold text-sm text-zinc-300">Billing Address</h3>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-blue-400">Street Address *</label>
                                    <Input placeholder="Type your Street Address here" className="bg-white text-black border-0 h-10 placeholder:text-zinc-400" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-blue-400">City *</label>
                                        <Input placeholder="Type your city here" className="bg-white text-black border-0 h-10 placeholder:text-zinc-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-blue-400">State *</label>
                                        <Input placeholder="Type your state here" className="bg-white text-black border-0 h-10 placeholder:text-zinc-400" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-blue-400">Country *</label>
                                        <Select>
                                            <SelectTrigger className="bg-white text-black border-0 h-10 font-bold">
                                                <SelectValue placeholder="Select country" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="gt">Guatemala</SelectItem>
                                                <SelectItem value="us">United States</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-blue-400">Postal ZIP Code *</label>
                                        <Input placeholder="Type your Zip Code here" className="bg-white text-black border-0 h-10 placeholder:text-zinc-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Order Info */}
                    <div className="bg-[#0f1926] border border-blue-500/30 rounded-xl p-6 lg:p-8 flex flex-col shadow-[0_0_50px_-15px_rgba(37,99,235,0.15)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                        <div className="relative z-10 flex flex-col flex-1">
                            <div className="flex items-center gap-2 mb-6 border-l-4 border-blue-500 pl-3">
                                <h2 className="text-lg font-bold">Order Info</h2>
                            </div>

                            <div className="space-y-6 flex-1">


                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-blue-400">Account Balance *</label>
                                    <Select defaultValue={size}>
                                        <SelectTrigger className="bg-[#1f2d3d] text-white border-white/10 h-10 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5000">$5,000</SelectItem>
                                            <SelectItem value="10000">$10,000</SelectItem>
                                            <SelectItem value="25000">$25,000</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-white">Add-Ons</label>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="profitSplit"
                                            checked={profitSplit}
                                            onCheckedChange={(c) => setProfitSplit(!!c)}
                                            className="border-white/30 data-[state=checked]:bg-blue-500"
                                        />
                                        <label htmlFor="profitSplit" className="text-sm text-zinc-300">90/10 Profit Split</label>
                                    </div>
                                </div>
                                <div className="bg-[#1f2d3d]/50 rounded-lg p-4 border border-white/5 space-y-3">
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">What's Included</h4>
                                    <ul className="space-y-2">
                                        <li className="flex items-center gap-2 text-sm text-zinc-300">
                                            <Check className="w-4 h-4 text-green-400" /> Instant Credentials
                                        </li>
                                        <li className="flex items-center gap-2 text-sm text-zinc-300">
                                            <Check className="w-4 h-4 text-green-400" /> No Time Limits
                                        </li>
                                        <li className="flex items-center gap-2 text-sm text-zinc-300">
                                            <Check className="w-4 h-4 text-green-400" /> Access to Professional Dashboard
                                        </li>
                                    </ul>
                                </div>
                                <div className="bg-[#1f2d3d] rounded-lg p-4 mt-4">
                                    <div className="flex justify-between items-center text-sm text-zinc-300 border-b border-white/10 pb-4 mb-4">
                                        <span>Product</span>
                                        <span>Amount</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white font-medium">${parseInt(size).toLocaleString()} Account - 1 Step Evaluation</span>
                                        <span className="text-blue-400 font-bold">${basePrice.toFixed(2)}</span>
                                    </div>
                                    {profitSplit && (
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-white font-medium">90/10 Split Addon</span>
                                            <span className="text-blue-400 font-bold">${splitAddonPrice.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-4">
                                    <span className="font-bold text-white">Purchase Price</span>
                                    <span className="text-3xl font-bold text-blue-500">${total.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="rules"
                                        checked={agreedRules}
                                        onCheckedChange={(c) => setAgreedRules(!!c)}
                                        className="border-white/30 mt-1 data-[state=checked]:bg-blue-500"
                                    />
                                    <label htmlFor="rules" className="text-xs text-zinc-400 leading-tight">
                                        I have read, understood, and agree to the Program Rules (<span className="text-blue-400 hover:underline">See Here</span>) and the Evaluation Agreement (<span className="text-blue-400 hover:underline">See Here</span>)*
                                    </label>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="refund"
                                        checked={agreedRefund}
                                        onCheckedChange={(c) => setAgreedRefund(!!c)}
                                        className="border-white/30 mt-1 data-[state=checked]:bg-blue-500"
                                    />
                                    <label htmlFor="refund" className="text-xs text-zinc-400 leading-tight">
                                        I agree to the Refund Policy (<span className="text-blue-400 hover:underline">See Here</span>) and Chargeback Policy (<span className="text-blue-400 hover:underline">See Here</span>)*
                                    </label>
                                </div>
                            </div>

                            <Button
                                onClick={handlePayment}
                                disabled={loading || !agreedRules || !agreedRefund}
                                className="w-full bg-[#0a1520] hover:bg-[#111f2e] text-white/50 hover:text-white font-bold text-lg py-6 border-2 border-transparent hover:border-blue-500/50 transition-all uppercase tracking-wider disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "Purchase"}
                            </Button>

                            <div className="mt-6 flex justify-center items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                    <ShieldCheck className="w-4 h-4 text-blue-400" /> Secure Payment
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                    <Lock className="w-4 h-4 text-blue-400" /> 256-bit SSL
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-8 right-8">
                <button className="bg-blue-500 hover:bg-blue-400 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110">
                    <MessageSquare className="w-6 h-6" />
                </button>
            </div>
        </div>

    );
}
