"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Power, Shield, Lock } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function KillSwitchControls() {
    const [tradingEnabled, setTradingEnabled] = useState(true);
    const [newAccountsEnabled, setNewAccountsEnabled] = useState(true);
    const [payoutsEnabled, setPayoutsEnabled] = useState(true);

    const handleKillSwitch = (type: string, currentState: boolean) => {
        const action = currentState ? "disabled" : "enabled";

        switch (type) {
            case "trading":
                setTradingEnabled(!currentState);
                toast.error(`🚨 Trading ${action} globally`, {
                    description: `All trading activity has been ${action}.`,
                });
                break;
            case "accounts":
                setNewAccountsEnabled(!currentState);
                toast.warning(`⚠️ New account creation ${action}`, {
                    description: `New challenge purchases have been ${action}.`,
                });
                break;
            case "payouts":
                setPayoutsEnabled(!currentState);
                toast.warning(`💰 Payouts ${action}`, {
                    description: `All payout processing has been ${action}.`,
                });
                break;
        }
    };

    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-400" />
                    Kill Switch Controls
                </CardTitle>
                <CardDescription className="text-zinc-500">Emergency operational controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Trading Kill Switch */}
                <div className="p-4 bg-zinc-800/30 border border-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${tradingEnabled ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                <Power className={`h-5 w-5 ${tradingEnabled ? 'text-emerald-400' : 'text-red-400'}`} />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-white">Global Trading</h3>
                                <p className="text-xs text-zinc-500">Enable/disable all trading activity</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge
                                status={tradingEnabled ? 'ENABLED' : 'DISABLED'}
                                variant={tradingEnabled ? 'success' : 'error'}
                                pulse={tradingEnabled}
                            />
                            <Button
                                size="sm"
                                variant={tradingEnabled ? "destructive" : "default"}
                                onClick={() => handleKillSwitch("trading", tradingEnabled)}
                                className={tradingEnabled ? '' : 'bg-emerald-600 hover:bg-emerald-700'}
                            >
                                {tradingEnabled ? 'Disable' : 'Enable'}
                            </Button>
                        </div>
                    </div>
                    {!tradingEnabled && (
                        <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            <span>All trading is currently disabled system-wide</span>
                        </div>
                    )}
                </div>

                {/* New Accounts Kill Switch */}
                <div className="p-4 bg-zinc-800/30 border border-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${newAccountsEnabled ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                <Lock className={`h-5 w-5 ${newAccountsEnabled ? 'text-emerald-400' : 'text-amber-400'}`} />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-white">New Accounts</h3>
                                <p className="text-xs text-zinc-500">Control new challenge purchases</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge
                                status={newAccountsEnabled ? 'ENABLED' : 'DISABLED'}
                                variant={newAccountsEnabled ? 'success' : 'warning'}
                                pulse={newAccountsEnabled}
                            />
                            <Button
                                size="sm"
                                variant={newAccountsEnabled ? "outline" : "default"}
                                onClick={() => handleKillSwitch("accounts", newAccountsEnabled)}
                                className={newAccountsEnabled ? 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10' : 'bg-emerald-600 hover:bg-emerald-700'}
                            >
                                {newAccountsEnabled ? 'Disable' : 'Enable'}
                            </Button>
                        </div>
                    </div>
                    {!newAccountsEnabled && (
                        <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            <span>New challenge purchases are currently disabled</span>
                        </div>
                    )}
                </div>

                {/* Payouts Kill Switch */}
                <div className="p-4 bg-zinc-800/30 border border-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${payoutsEnabled ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                <AlertTriangle className={`h-5 w-5 ${payoutsEnabled ? 'text-emerald-400' : 'text-amber-400'}`} />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-white">Payout Processing</h3>
                                <p className="text-xs text-zinc-500">Control payout disbursements</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge
                                status={payoutsEnabled ? 'ENABLED' : 'DISABLED'}
                                variant={payoutsEnabled ? 'success' : 'warning'}
                                pulse={payoutsEnabled}
                            />
                            <Button
                                size="sm"
                                variant={payoutsEnabled ? "outline" : "default"}
                                onClick={() => handleKillSwitch("payouts", payoutsEnabled)}
                                className={payoutsEnabled ? 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10' : 'bg-emerald-600 hover:bg-emerald-700'}
                            >
                                {payoutsEnabled ? 'Disable' : 'Enable'}
                            </Button>
                        </div>
                    </div>
                    {!payoutsEnabled && (
                        <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Payout processing is currently paused</span>
                        </div>
                    )}
                </div>

                {/* System Status Summary */}
                <div className="mt-4 p-3 bg-zinc-800/50 border border-white/5 rounded-lg">
                    <div className="text-xs text-zinc-400 mb-2">System Status</div>
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${tradingEnabled && newAccountsEnabled && payoutsEnabled ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                        <span className="text-sm font-medium text-white">
                            {tradingEnabled && newAccountsEnabled && payoutsEnabled
                                ? 'All Systems Operational'
                                : 'Some Systems Disabled'}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
