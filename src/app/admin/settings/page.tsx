"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Shield, Database, Bell, Power, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [tradingEnabled, setTradingEnabled] = useState(true);
    const [newSignupsEnabled, setNewSignupsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);

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
