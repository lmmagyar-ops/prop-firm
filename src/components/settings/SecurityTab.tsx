"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, Eye, EyeOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import { TwoFactorAuth } from "@/components/settings/TwoFactorAuth";

interface SecurityTabProps {
    twoFactorEnabled: boolean;
}

export function SecurityTab({ twoFactorEnabled }: SecurityTabProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [refresh, setRefresh] = useState(0);

    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // Password strength checks
    const passwordChecks = {
        length: formData.newPassword.length >= 8,
        uppercase: /[A-Z]/.test(formData.newPassword),
        lowercase: /[a-z]/.test(formData.newPassword),
        number: /[0-9]/.test(formData.newPassword),
    };

    const allChecksPassed = Object.values(passwordChecks).every(Boolean);
    const passwordsMatch = formData.newPassword === formData.confirmPassword && formData.confirmPassword !== "";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!allChecksPassed) {
            toast.error("Please meet all password requirements");
            return;
        }

        if (!passwordsMatch) {
            toast.error("Passwords do not match");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Password changed successfully!");
                setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } else {
                toast.error(data.error || "Failed to change password");
            }
        } catch (error) {
            console.error("Change password error:", error);
            toast.error("Failed to change password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Two-Factor Authentication */}
            <TwoFactorAuth
                twoFactorEnabled={twoFactorEnabled}
                onStatusChange={() => setRefresh(prev => prev + 1)}
            />

            {/* Change Password */}
            <Card className="bg-[#0D1117] border-[#2E3A52]">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Shield className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Change Password</CardTitle>
                            <CardDescription className="text-zinc-500">
                                Update your password to keep your account secure
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Current Password */}
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword" className="text-zinc-300">
                                Current Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="currentPassword"
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={formData.currentPassword}
                                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                    className="bg-[#1A232E] border-[#2E3A52] text-white pr-10"
                                    placeholder="Enter your current password"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div className="space-y-2">
                            <Label htmlFor="newPassword" className="text-zinc-300">
                                New Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showNewPassword ? "text" : "password"}
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                    className="bg-[#1A232E] border-[#2E3A52] text-white pr-10"
                                    placeholder="Enter your new password"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>

                            {/* Password Requirements */}
                            {formData.newPassword && (
                                <div className="mt-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                                    <p className="text-xs text-zinc-500 mb-2">Password must have:</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className={`flex items-center gap-1.5 ${passwordChecks.length ? 'text-green-400' : 'text-zinc-500'}`}>
                                            {passwordChecks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                            At least 8 characters
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${passwordChecks.uppercase ? 'text-green-400' : 'text-zinc-500'}`}>
                                            {passwordChecks.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                            One uppercase letter
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${passwordChecks.lowercase ? 'text-green-400' : 'text-zinc-500'}`}>
                                            {passwordChecks.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                            One lowercase letter
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${passwordChecks.number ? 'text-green-400' : 'text-zinc-500'}`}>
                                            {passwordChecks.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                            One number
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm New Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-zinc-300">
                                Confirm New Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className={`bg-[#1A232E] border-[#2E3A52] text-white pr-10 ${formData.confirmPassword && !passwordsMatch ? 'border-red-500/50' : ''
                                        } ${passwordsMatch ? 'border-green-500/50' : ''}`}
                                    placeholder="Confirm your new password"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            {formData.confirmPassword && !passwordsMatch && (
                                <p className="text-xs text-red-400 flex items-center gap-1">
                                    <X className="h-3 w-3" /> Passwords do not match
                                </p>
                            )}
                            {passwordsMatch && (
                                <p className="text-xs text-green-400 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Passwords match
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={isLoading || !allChecksPassed || !passwordsMatch || !formData.currentPassword}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Changing Password...
                                </>
                            ) : (
                                <>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Change Password
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
