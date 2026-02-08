"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Wallet, CreditCard, Coins, Plus, Trash2, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface PayoutMethod {
    id: string;
    type: "crypto" | "paypal";
    provider: "confirmo" | "paypal" | "moonpay";
    label: string;
    details: {
        walletAddress?: string;
        network?: string;
        email?: string;
    };
    isDefault: boolean;
}

interface PayoutsTabProps {
    existingMethods?: PayoutMethod[];
}

export function PayoutsTab({ existingMethods = [] }: PayoutsTabProps) {
    const [methods, setMethods] = useState<PayoutMethod[]>(existingMethods);
    const [showAdd, setShowAdd] = useState(false);
    const [newMethod, setNewMethod] = useState({
        type: "crypto" as "crypto" | "paypal",
        provider: "confirmo" as "confirmo" | "paypal" | "moonpay",
        label: "",
        walletAddress: "",
        network: "ERC20",
        email: "",
    });

    const handleAddMethod = () => {
        // For now, just show "Coming Soon" message
        toast.info("Payout integration coming soon! Your preferences will be saved once we've registered the business.");
        setShowAdd(false);
    };

    return (
        <div className="space-y-6">
            {/* Integration Notice */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-primary">Payout Integration Pending</h3>
                        <p className="text-zinc-400 text-sm">
                            We're currently finalizing business registration. Once complete, you'll be able to configure payout methods via:
                        </p>
                        <ul className="text-zinc-400 text-sm space-y-1 ml-4">
                            <li>• <strong className="text-primary">Confirmo</strong> - Crypto payments (BTC, ETH, USDC)</li>
                            <li>• <strong className="text-primary">PayPal</strong> - Traditional payments</li>
                            <li>• <strong className="text-primary">Moonpay</strong> - Alternative crypto processor</li>
                        </ul>
                        <p className="text-xs text-zinc-500 mt-3">
                            Expected integration: ~2 weeks
                        </p>
                    </div>
                </div>
            </div>

            {/* Payout Methods List (Placeholder) */}
            <Card className="bg-[#0D1117] border-[#2E3A52]">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <Wallet className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Payout Methods</CardTitle>
                                <CardDescription className="text-zinc-500">
                                    Manage how you receive your trading profits
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowAdd(!showAdd)}
                            disabled
                            className="bg-primary hover:bg-primary/80 opacity-50 cursor-not-allowed"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Method
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {methods.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <DollarSign className="w-8 h-8 text-zinc-600" />
                            </div>
                            <p className="text-zinc-400 mb-2">No payout methods configured</p>
                            <p className="text-sm text-zinc-600">
                                Add a payout method once integration is complete
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {methods.map((method) => (
                                <div
                                    key={method.id}
                                    className="flex items-center justify-between p-4 bg-[#1A232E] border border-[#2E3A52] rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-zinc-800">
                                            {method.type === "crypto" ? (
                                                <Coins className="w-5 h-5 text-orange-400" />
                                            ) : (
                                                <CreditCard className="w-5 h-5 text-primary" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-white font-medium">{method.label}</p>
                                                {method.isDefault && (
                                                    <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-zinc-500">
                                                {method.type === "crypto"
                                                    ? `${method.details.network} • ${method.details.walletAddress?.slice(0, 12)}...`
                                                    : method.details.email}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Minimum Payout */}
            <Card className="bg-[#0D1117] border-[#2E3A52]">
                <CardHeader>
                    <CardTitle className="text-white">Payout Settings</CardTitle>
                    <CardDescription className="text-zinc-500">
                        Configure your payout preferences
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#1A232E] border border-[#2E3A52] rounded-lg">
                        <div>
                            <p className="text-white font-medium">Minimum Payout Amount</p>
                            <p className="text-sm text-zinc-500">Payouts are processed when your balance exceeds this amount</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-white">$100</p>
                            <p className="text-xs text-zinc-600">USD</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#1A232E] border border-[#2E3A52] rounded-lg">
                        <div>
                            <p className="text-white font-medium">Processing Time</p>
                            <p className="text-sm text-zinc-500">Average time from request to wallet</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-semibold text-green-400">1-3 days</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
