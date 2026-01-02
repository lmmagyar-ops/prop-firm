"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, Check, ShieldCheck, Lock, CreditCard, Bitcoin, Copy, ExternalLink, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function CheckoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // params
    const size = searchParams.get("size") || "5000";
    const tierId = size === "5000" ? "5k" : size === "25000" ? "25k" : "10k";
    const basePrice = parseFloat(searchParams.get("price") || "60");

    const [loading, setLoading] = useState(false);
    const [profitSplit, setProfitSplit] = useState(false);
    const [agreedRules, setAgreedRules] = useState(false);
    const [agreedRefund, setAgreedRefund] = useState(false);

    // Payment Method State
    const [paymentMethod, setPaymentMethod] = useState<"card" | "crypto">("card");
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

    // Platform Selection State
    const [platform, setPlatform] = useState<"polymarket" | "kalshi" | null>(null);

    // Mock addon price
    const splitAddonPrice = basePrice * 0.2; // 20% addon
    const total = basePrice + (profitSplit ? splitAddonPrice : 0);

    // Soft Lock: Ensure user came from a valid internal flow
    useEffect(() => {
        const fromDashboard = searchParams.get("from_dashboard");
        if (!fromDashboard) {
            router.push(`/signup?intent=buy_evaluation&tier=${tierId}&price=${basePrice}`);
        }
    }, [searchParams, router, tierId, basePrice]);

    const handlePurchase = async () => {
        if (!agreedRules || !agreedRefund || !platform) return;
        setLoading(true);

        try {
            // 1. Create Invoice via Confirmo
            const res = await fetch("/api/checkout/create-confirmo-invoice", {
                method: "POST",
                body: JSON.stringify({
                    tier: tierId,
                    price: total,
                    platform: platform,
                }),
                headers: { "Content-Type": "application/json" }
            });

            if (!res.ok) throw new Error("Failed to create invoice");

            const data = await res.json();

            // 2. Handle Logic based on Method
            if (paymentMethod === "card") {
                // If MoonPay, we might redirect to a MoonPay flow or 
                // for this MVP, just show the Confirmo invoice which HAS "Buy with Card" options often,
                // OR simpler: Redirect to the Invoice URL which is the payment gateway.
                // Polymarket flow: "Deposit" -> MoonPay.

                // For MVP: Both flows lead to the Payment Gateway (Confirmo Invoice)
                // In production, "Card" might specificy a MoonPay-specific link.
                window.location.href = data.invoiceUrl;
            } else {
                // Crypto: Redirect to invoice or show QR
                window.location.href = data.invoiceUrl;
            }

            // For checking flow without leaving page (Dev Mode)
            // setInvoiceUrl(data.invoiceUrl);
            // setLoading(false);

        } catch (error) {
            console.error(error);
            setLoading(false);
            alert("Error creating payment. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-[#05101a] text-white flex justify-center p-4 lg:p-8 font-sans">
            <div className="w-full max-w-5xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <Link href="/buy-evaluation">
                        <Button variant="ghost" className="text-white hover:text-blue-400 pl-0 hover:bg-transparent">
                            &lt; Back
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold flex-1">Secure Checkout</h1>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Left: Account & Payment Method */}
                    <div className="space-y-6">

                        {/* 1. Identity */}
                        <div className="bg-[#0f1926] border border-blue-900/30 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4 border-l-4 border-blue-500 pl-3">
                                <h2 className="text-lg font-bold">Trader Identity</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-blue-400">First Name</label>
                                    <Input placeholder="John" className="bg-[#162231] border-0 h-10" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-blue-400">Last Name</label>
                                    <Input placeholder="Doe" className="bg-[#162231] border-0 h-10" />
                                </div>
                            </div>
                            <div className="space-y-1 mt-4">
                                <label className="text-xs font-bold text-blue-400">Email Address</label>
                                <Input value="sliponchain@gmail.com" readOnly className="bg-[#162231] border-0 h-10 font-mono text-zinc-400 cursor-not-allowed" />
                            </div>
                        </div>

                        {/* 2. Trading Platform Selector */}
                        <div className="bg-[#0f1926] border border-blue-900/30 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4 border-l-4 border-purple-500 pl-3">
                                <h2 className="text-lg font-bold">Trading Platform</h2>
                            </div>
                            <p className="text-sm text-zinc-400 mb-4">
                                Choose which prediction market you want to trade on. You'll stay on this platform if funded.
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setPlatform("polymarket")}
                                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${platform === "polymarket"
                                        ? "bg-purple-600/10 border-purple-500 text-purple-400 shadow-[0_0_20px_-5px_rgba(147,51,234,0.3)]"
                                        : "bg-[#162231] border-white/5 text-zinc-500 hover:bg-[#1e2d40] hover:text-white"
                                        }`}
                                >
                                    <div className="text-2xl">🌐</div>
                                    <span className="text-sm font-bold">Polymarket</span>
                                    <span className="text-xs text-zinc-500">Global • Crypto</span>
                                </button>

                                <button
                                    onClick={() => setPlatform("kalshi")}
                                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${platform === "kalshi"
                                        ? "bg-purple-600/10 border-purple-500 text-purple-400 shadow-[0_0_20px_-5px_rgba(147,51,234,0.3)]"
                                        : "bg-[#162231] border-white/5 text-zinc-500 hover:bg-[#1e2d40] hover:text-white"
                                        }`}
                                >
                                    <div className="text-2xl">🇺🇸</div>
                                    <span className="text-sm font-bold">Kalshi</span>
                                    <span className="text-xs text-zinc-500">US Regulated • USD</span>
                                </button>
                            </div>

                            {platform && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="mt-4 bg-purple-500/5 border border-purple-500/20 rounded-lg p-4"
                                >
                                    <div className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-purple-400" />
                                        <span className="text-purple-400 font-medium">
                                            {platform === "polymarket" ? "Polymarket" : "Kalshi"} selected
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        {platform === "polymarket"
                                            ? "Access global prediction markets using USDC on Polygon."
                                            : "Trade on CFTC-regulated markets using USD."}
                                    </p>
                                </motion.div>
                            )}
                        </div>

                        {/* 3. Payment Selector */}
                        <div className="bg-[#0f1926] border border-blue-900/30 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4 border-l-4 border-green-500 pl-3">
                                <h2 className="text-lg font-bold">Payment Method</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setPaymentMethod("card")}
                                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === "card"
                                        ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_20px_-5px_rgba(37,99,235,0.3)]"
                                        : "bg-[#162231] border-white/5 text-zinc-500 hover:bg-[#1e2d40] hover:text-white"
                                        }`}
                                >
                                    <CreditCard className="w-6 h-6" />
                                    <span className="text-sm font-bold">Credit Card</span>
                                </button>

                                <button
                                    onClick={() => setPaymentMethod("crypto")}
                                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === "crypto"
                                        ? "bg-orange-500/10 border-orange-500 text-orange-400 shadow-[0_0_20px_-5px_rgba(249,115,22,0.3)]"
                                        : "bg-[#162231] border-white/5 text-zinc-500 hover:bg-[#1e2d40] hover:text-white"
                                        }`}
                                >
                                    <Bitcoin className="w-6 h-6" />
                                    <span className="text-sm font-bold">Crypto (USDC)</span>
                                </button>
                            </div>

                            <AnimatePresence mode="wait">
                                {paymentMethod === "card" ? (
                                    <motion.div
                                        key="card-info"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-lg p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="bg-blue-500/20 p-2 rounded-full mt-1">
                                                <CreditCard className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-white font-medium">Powered by MoonPay</p>
                                                <p className="text-xs text-zinc-400 mt-1">
                                                    Use your Visa or Mastercard to purchase USDC directly. Fast verification, instant settlement.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="crypto-info"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 bg-orange-500/5 border border-orange-500/20 rounded-lg p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="bg-orange-500/20 p-2 rounded-full mt-1">
                                                <Bitcoin className="w-4 h-4 text-orange-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-white font-medium">Pay with Any Crypto</p>
                                                <p className="text-xs text-zinc-400 mt-1">
                                                    We accept USDC (Polygon, Eth, Base), ETH, BTC, LTC, and more.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right: Order Summary */}
                    <div className="bg-[#0f1926] border border-blue-500/30 rounded-xl p-6 lg:p-8 flex flex-col shadow-[0_0_50px_-15px_rgba(37,99,235,0.15)] relative overflow-hidden h-fit">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <h2 className="text-lg font-bold">Order Summary</h2>
                                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-mono font-bold uppercase">
                                    LEVEL: {tierId.toUpperCase()}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-300">Evaluation Account (${parseInt(size).toLocaleString()})</span>
                                    <span className="text-white font-bold font-mono">${basePrice.toFixed(2)}</span>
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <Checkbox
                                            checked={profitSplit}
                                            onCheckedChange={(c) => setProfitSplit(!!c)}
                                            className="border-white/30 data-[state=checked]:bg-blue-500"
                                        />
                                        <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">Add: 90/10 Profit Split</span>
                                    </label>
                                    {profitSplit && (
                                        <div className="flex justify-between items-center text-sm pl-6 animate-in fade-in slide-in-from-top-1">
                                            <span className="text-zinc-500">+ Boost Profit Share</span>
                                            <span className="text-blue-400 font-bold font-mono">${splitAddonPrice.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4 flex justify-between items-end">
                                <div>
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Due</span>
                                    <div className="text-3xl font-bold text-white mt-1">${total.toFixed(2)}</div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-zinc-500">Payable in</span>
                                    <div className="font-bold text-blue-400">USD via {paymentMethod === "card" ? "MoonPay" : "Confirmo"}</div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="rules"
                                        checked={agreedRules}
                                        onCheckedChange={(c) => setAgreedRules(!!c)}
                                        className="border-white/30 mt-1 data-[state=checked]:bg-blue-500"
                                    />
                                    <label htmlFor="rules" className="text-xs text-zinc-400">
                                        I agree to the <span className="text-blue-400 underline">Trading Rules</span> and <span className="text-blue-400 underline">Terms</span>.*
                                    </label>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="refund"
                                        checked={agreedRefund}
                                        onCheckedChange={(c) => setAgreedRefund(!!c)}
                                        className="border-white/30 mt-1 data-[state=checked]:bg-blue-500"
                                    />
                                    <label htmlFor="refund" className="text-xs text-zinc-400">
                                        I understand the <span className="text-blue-400 underline">No Refund Policy</span>.*
                                    </label>
                                </div>
                            </div>

                            <Button
                                onClick={handlePurchase}
                                disabled={loading || !agreedRules || !agreedRefund || !platform}
                                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.02] active:scale-95"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin w-6 h-6" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Proceed to Payment <ArrowRight className="w-5 h-5" />
                                    </span>
                                )}
                            </Button>

                            <div className="flex justify-center gap-4 text-zinc-500 opacity-60">
                                <ShieldCheck className="w-5 h-5" />
                                <Lock className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#05101a] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
            <CheckoutContent />
        </Suspense>
    );
}
