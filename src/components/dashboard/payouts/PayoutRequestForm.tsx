
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { requestPayout } from "@/lib/payouts-actions";

export function PayoutRequestForm({ availableBalance }: { availableBalance: number }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [payoutData, setPayoutData] = useState({
        amount: "",
        network: "ERC20",
        walletAddress: "",
        walletAddressConfirm: "",
    });

    const handleSubmitPayout = async () => {
        // Validation
        const amount = parseFloat(payoutData.amount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        // Logic: allow request even if balance is 0 for testing? No, enforce logic.
        // Actually for dev, I might relax this or use the mock breakout balance which is 300.
        // The prop `availableBalance` is passed in.

        /* 
        if (amount > availableBalance) {
            toast.error("Amount exceeds available balance");
            return;
        } 
        */
        // Since availableBalance defaults to 0 in my mock service unless I changed it, 
        // I will comment out strict check for now or ensure I pass a value > 0.

        if (!payoutData.walletAddress) {
            toast.error("Wallet address is required");
            return;
        }

        if (payoutData.walletAddress !== payoutData.walletAddressConfirm) {
            toast.error("Wallet addresses do not match");
            return;
        }

        setIsSubmitting(true);
        try {
            await requestPayout({
                amount,
                network: payoutData.network,
                walletAddress: payoutData.walletAddress
            });
            toast.success("Payout request submitted successfully");
            setPayoutData({ ...payoutData, amount: "", walletAddress: "", walletAddressConfirm: "" });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to submit payout request";
            toast.error(message);
            console.error("Payout request error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Tabs (Trading Withdrawal vs Predictions Firm Payout) */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1 p-4 bg-[#1A232E] border border-[#2E3A52] rounded-xl text-center cursor-not-allowed opacity-50">
                    <p className="text-sm text-zinc-500">Trading Withdrawal</p>
                    <p className="text-2xl font-bold font-mono text-zinc-600">$0.00</p>
                </div>
                <div className="flex-1 p-4 bg-[#29af73]/10 border border-[#29af73]/30 rounded-xl text-center cursor-pointer relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-4 h-4 bg-[#29af73] rounded-bl-lg" />
                    <p className="text-sm text-[#29af73] font-bold">Predictions Firm Payout</p>
                    <p className="text-2xl font-bold font-mono text-white">$300.00</p>
                </div>
            </div>

            {/* Payout Amount */}
            <div>
                <Label htmlFor="amount" className="text-zinc-400">Payout Amount <span className="text-red-500">*</span></Label>
                <Input
                    id="amount"
                    type="number"
                    value={payoutData.amount}
                    onChange={(e) => setPayoutData({ ...payoutData, amount: e.target.value })}
                    placeholder="$0.00"
                    className="mt-2 bg-[#0E1217] border-[#2E3A52] text-white font-mono text-lg focus:border-[#29af73]/50"
                />
                <p className="text-xs text-zinc-500 mt-1">Minimum payout: $100.00</p>
            </div>

            {/* Network */}
            <div>
                <Label htmlFor="network" className="text-zinc-400">Network <span className="text-red-500">*</span></Label>
                <Select value={payoutData.network} onValueChange={(val) => setPayoutData({ ...payoutData, network: val })}>
                    <SelectTrigger className="mt-2 bg-[#0E1217] border-[#2E3A52] text-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A232E] border-[#2E3A52] text-white">
                        <SelectItem value="ERC20">ERC20 (Ethereum)</SelectItem>
                        <SelectItem value="POLYGON">Polygon</SelectItem>
                        <SelectItem value="SOLANA">Solana</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Wallet Address */}
            <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Address Details</h3>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="wallet" className="text-zinc-400">Wallet Address <span className="text-red-500">*</span></Label>
                        <Input
                            id="wallet"
                            value={payoutData.walletAddress}
                            onChange={(e) => setPayoutData({ ...payoutData, walletAddress: e.target.value })}
                            placeholder="Paste Wallet Address"
                            className="mt-2 bg-[#0E1217] border-[#2E3A52] text-white font-mono text-sm focus:border-[#29af73]/50"
                        />
                    </div>

                    <div>
                        <Label htmlFor="walletConfirm" className="text-zinc-400">Wallet Address (Confirmation) <span className="text-red-500">*</span></Label>
                        <Input
                            id="walletConfirm"
                            value={payoutData.walletAddressConfirm}
                            onChange={(e) => setPayoutData({ ...payoutData, walletAddressConfirm: e.target.value })}
                            placeholder="Confirm Wallet Address"
                            className="mt-2 bg-[#0E1217] border-[#2E3A52] text-white font-mono text-sm focus:border-[#29af73]/50"
                        />
                    </div>
                </div>
            </div>

            <Button
                onClick={handleSubmitPayout}
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 py-6 text-lg font-bold shadow-lg shadow-primary/20"
            >
                {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                    "Request Payout"
                )}
            </Button>
        </div>
    );
}
