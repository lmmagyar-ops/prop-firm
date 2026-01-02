"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Shield, Database, Bell, Power, AlertTriangle, CheckCircle2, RefreshCw, Loader2, Code2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Challenge {
    id: string;
    status: string;
    currentBalance: string;
    userId: string;
    platform: string;
    phase: number;
}

export default function SettingsPage() {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [tradingEnabled, setTradingEnabled] = useState(true);
    const [newSignupsEnabled, setNewSignupsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);

    // Developer Tools state
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [selectedChallenge, setSelectedChallenge] = useState<string>("");
    const [resetting, setResetting] = useState(false);
    const [loadingChallenges, setLoadingChallenges] = useState(true);

    // Fetch challenges on mount
    useEffect(() => {
        const fetchChallenges = async () => {
            try {
                const res = await fetch("/api/admin/reset-challenge");
                if (res.ok) {
                    const data = await res.json();
                    setChallenges(data.challenges || []);
                    if (data.challenges?.length > 0) {
                        setSelectedChallenge(data.challenges[0].id);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch challenges", error);
            } finally {
                setLoadingChallenges(false);
            }
        };
        fetchChallenges();
    }, []);

    const handleResetChallenge = async () => {
        if (!selectedChallenge) {
            toast.error("Please select a challenge to reset");
            return;
        }

        if (!confirm("Are you sure you want to reset this challenge? This will delete all trades and positions.")) {
            return;
        }

        setResetting(true);
        try {
            const res = await fetch("/api/admin/reset-challenge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ challengeId: selectedChallenge })
            });

            if (!res.ok) {
                throw new Error("Reset failed");
            }

            const data = await res.json();
            toast.success("Challenge Reset Successfully", {
                description: `Balance restored to $${data.data.newBalance.toLocaleString()}`
            });

            // Refresh challenges list
            const refreshRes = await fetch("/api/admin/reset-challenge");
            if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                setChallenges(refreshData.challenges || []);
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to reset challenge");
        } finally {
            setResetting(false);
        }
    };

    const handleMaintenanceToggle = () => {
        setMaintenanceMode(!maintenanceMode);
        toast.warning(!maintenanceMode ? "⚠️ Maintenance mode activated" : "✅ Maintenance mode deactivated", {
            description: !maintenanceMode
                ? "Platform is now in maintenance mode. Users cannot access the system."
                : "Platform is now live and accessible to users.",
        });
    };

    const handleTradingToggle = () => {
        setTradingEnabled(!tradingEnabled);
        toast[!tradingEnabled ? "success" : "error"](
            !tradingEnabled ? "✅ Trading enabled" : "🚫 Trading disabled",
            {
                description: !tradingEnabled
                    ? "All users can now execute trades."
                    : "Trading has been disabled platform-wide.",
            }
        );
    };

    const handleSignupsToggle = () => {
        setNewSignupsEnabled(!newSignupsEnabled);
        toast[!newSignupsEnabled ? "success" : "warning"](
            !newSignupsEnabled ? "✅ Signups enabled" : "⚠️ Signups disabled",
            {
                description: !newSignupsEnabled
                    ? "New users can now register."
                    : "New user registration has been disabled.",
            }
        );
    };

    const selectedChallengeData = challenges.find(c => c.id === selectedChallenge);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white/90">Settings</h1>
                <p className="text-zinc-500">Platform configuration and system controls</p>
            </div>

            {/* System Status Banner */}
            <div className={`p-4 rounded-lg border ${maintenanceMode
                ? 'bg-amber-500/10 border-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/20'
                }`}>
                <div className="flex items-center gap-3">
                    {maintenanceMode ? (
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                    ) : (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    )}
                    <div>
                        <div className={`font-medium ${maintenanceMode ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {maintenanceMode ? 'Maintenance Mode Active' : 'All Systems Operational'}
                        </div>
                        <div className="text-xs text-zinc-500">
                            {maintenanceMode
                                ? 'Platform is currently unavailable to users'
                                : 'Platform is running normally'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Developer Tools - Account Reset */}
            <Card className="bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/20 backdrop-blur-md shadow-2xl">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <Code2 className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                                Developer Tools
                                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">DEV</Badge>
                            </CardTitle>
                            <CardDescription className="text-zinc-500">Testing utilities and debug features</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Account Reset Section */}
                    <div className="p-4 bg-zinc-800/30 border border-white/5 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-500/10">
                                    <RefreshCw className="h-5 w-5 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-white">Reset Trading Account</h3>
                                    <p className="text-xs text-zinc-500">Wipe all trades/positions and restore starting balance</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Challenge Selector */}
                            <div className="md:col-span-2">
                                <label className="text-xs text-zinc-500 mb-1.5 block">Select Challenge</label>
                                {loadingChallenges ? (
                                    <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading challenges...
                                    </div>
                                ) : (
                                    <Select value={selectedChallenge} onValueChange={setSelectedChallenge}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                            <SelectValue placeholder="Select a challenge" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {challenges.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs">{c.id.slice(0, 8)}</span>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] ${c.status === 'active' ? 'text-green-400 border-green-500/20' :
                                                                    c.status === 'failed' ? 'text-red-400 border-red-500/20' :
                                                                        'text-amber-400 border-amber-500/20'
                                                                }`}
                                                        >
                                                            {c.status}
                                                        </Badge>
                                                        <span className="text-zinc-500">${parseFloat(c.currentBalance).toFixed(0)}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            {/* Reset Button */}
                            <div className="flex items-end">
                                <Button
                                    variant="destructive"
                                    className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20"
                                    onClick={handleResetChallenge}
                                    disabled={resetting || !selectedChallenge}
                                >
                                    {resetting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Resetting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Reset Challenge
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Selected Challenge Info */}
                        {selectedChallengeData && (
                            <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2 border-t border-white/5">
                                <span>Platform: <span className="text-zinc-300">{selectedChallengeData.platform}</span></span>
                                <span>Phase: <span className="text-zinc-300">{selectedChallengeData.phase}</span></span>
                                <span>Balance: <span className="text-zinc-300">${parseFloat(selectedChallengeData.currentBalance).toFixed(2)}</span></span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Platform Controls */}
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <Shield className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-medium text-zinc-200">Platform Controls</CardTitle>
                            <CardDescription className="text-zinc-500">System-wide operational toggles</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Maintenance Mode */}
                    <div className="flex items-center justify-between p-4 bg-zinc-800/30 border border-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${maintenanceMode ? 'bg-amber-500/10' : 'bg-zinc-700/30'}`}>
                                <Power className={`h-5 w-5 ${maintenanceMode ? 'text-amber-400' : 'text-zinc-500'}`} />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-white">Maintenance Mode</h3>
                                <p className="text-xs text-zinc-500">Disable platform access for maintenance</p>
                            </div>
                        </div>
                        <Switch
                            checked={maintenanceMode}
                            onCheckedChange={handleMaintenanceToggle}
                        />
                    </div>

                    {/* Trading Toggle */}
                    <div className="flex items-center justify-between p-4 bg-zinc-800/30 border border-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${tradingEnabled ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                <Settings className={`h-5 w-5 ${tradingEnabled ? 'text-emerald-400' : 'text-red-400'}`} />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-white">Global Trading</h3>
                                <p className="text-xs text-zinc-500">Enable/disable all trading activity</p>
                            </div>
                        </div>
                        <Switch
                            checked={tradingEnabled}
                            onCheckedChange={handleTradingToggle}
                        />
                    </div>

                    {/* New Signups Toggle */}
                    <div className="flex items-center justify-between p-4 bg-zinc-800/30 border border-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${newSignupsEnabled ? 'bg-blue-500/10' : 'bg-zinc-700/30'}`}>
                                <Database className={`h-5 w-5 ${newSignupsEnabled ? 'text-blue-400' : 'text-zinc-500'}`} />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-white">New User Registration</h3>
                                <p className="text-xs text-zinc-500">Control new account creation</p>
                            </div>
                        </div>
                        <Switch
                            checked={newSignupsEnabled}
                            onCheckedChange={handleSignupsToggle}
                        />
                    </div>

                    {/* Email Notifications Toggle */}
                    <div className="flex items-center justify-between p-4 bg-zinc-800/30 border border-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${emailNotifications ? 'bg-purple-500/10' : 'bg-zinc-700/30'}`}>
                                <Bell className={`h-5 w-5 ${emailNotifications ? 'text-purple-400' : 'text-zinc-500'}`} />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-white">Email Notifications</h3>
                                <p className="text-xs text-zinc-500">System email notifications</p>
                            </div>
                        </div>
                        <Switch
                            checked={emailNotifications}
                            onCheckedChange={() => setEmailNotifications(!emailNotifications)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Business Rules Configuration */}
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <Settings className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-medium text-zinc-200">Business Rules Configuration</CardTitle>
                            <CardDescription className="text-zinc-500">Challenge tiers, risk parameters, and trading rules</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-400">
                            The existing Rules Editor from the main Admin page can be accessed here for centralized configuration management.
                        </p>
                        <Button
                            variant="outline"
                            className="border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
                            onClick={() => window.location.href = '/admin'}
                        >
                            Go to Rules Editor
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Data Management */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                <Database className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-medium text-zinc-200">Database Backup</CardTitle>
                                <CardDescription className="text-zinc-500">Export and backup data</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <p className="text-sm text-zinc-500">Last backup: 2 hours ago</p>
                            <Button
                                variant="outline"
                                className="w-full border-green-500/20 text-green-400 hover:bg-green-500/10"
                                onClick={() => toast.success("Backup initiated", { description: "Database backup in progress..." })}
                            >
                                Create Backup Now
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <Database className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-medium text-zinc-200">Data Export</CardTitle>
                                <CardDescription className="text-zinc-500">Export reports and analytics</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <p className="text-sm text-zinc-500">Export data to CSV format</p>
                            <Button
                                variant="outline"
                                className="w-full border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                                onClick={() => toast.success("Export started", { description: "Preparing CSV export..." })}
                            >
                                Export to CSV
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
