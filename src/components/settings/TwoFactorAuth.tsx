"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, Key, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface TwoFactorAuthProps {
    twoFactorEnabled: boolean;
    onStatusChange?: () => void;
}

export function TwoFactorAuth({ twoFactorEnabled, onStatusChange }: TwoFactorAuthProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showSetup, setShowSetup] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState("");
    const [secret, setSecret] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [verificationCode, setVerificationCode] = useState("");
    const [copiedCode, setCopiedCode] = useState(false);

    // Generate 2FA setup
    const handleSetup2FA = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/2fa/setup", {
                method: "POST",
            });

            const data = await response.json();

            if (response.ok) {
                setQrCodeUrl(data.qrCode);
                setSecret(data.secret);
                setShowSetup(true);
                toast.success("Scan the QR code with your authenticator app");
            } else {
                toast.error(data.error || "Failed to generate 2FA setup");
            }
        } catch (error) {
            console.error("2FA setup error:", error);
            toast.error("Failed to setup 2FA");
        } finally {
            setIsLoading(false);
        }
    };

    // Verify and enable 2FA
    const handleVerifyAndEnable = async (e: React.FormEvent) => {
        e.preventDefault();

        if (verificationCode.length !== 6) {
            toast.error("Please enter a 6-digit code");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/2fa/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: verificationCode }),
            });

            const data = await response.json();

            if (response.ok) {
                setBackupCodes(data.backupCodes);
                toast.success("2FA enabled successfully!");
                onStatusChange?.();
            } else {
                toast.error(data.error || "Invalid verification code");
            }
        } catch (error) {
            console.error("2FA verification error:", error);
            toast.error("Failed to verify code");
        } finally {
            setIsLoading(false);
        }
    };

    // Disable 2FA
    const handleDisable2FA = async () => {
        if (!confirm("Are you sure you want to disable two-factor authentication?")) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/2fa/disable", {
                method: "POST",
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("2FA disabled successfully");
                setShowSetup(false);
                setQrCodeUrl("");
                setSecret("");
                setBackupCodes([]);
                setVerificationCode("");
                onStatusChange?.();
            } else {
                toast.error(data.error || "Failed to disable 2FA");
            }
        } catch (error) {
            console.error("2FA disable error:", error);
            toast.error("Failed to disable 2FA");
        } finally {
            setIsLoading(false);
        }
    };

    const copyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join("\\n"));
        setCopiedCode(true);
        toast.success("Backup codes copied to clipboard");
        setTimeout(() => setCopiedCode(false), 2000);
    };

    // If showing backup codes
    if (backupCodes.length > 0) {
        return (
            <Card className="bg-[#0D1117] border-[#2E3A52]">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <Key className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">2FA Enabled Successfully!</CardTitle>
                            <CardDescription className="text-zinc-500">
                                Save these backup codes in a secure location
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <div className="flex items-start gap-2 mb-3">
                            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                            <p className="text-sm text-amber-400">
                                <strong>Important:</strong> Each backup code can only be used once. Store them safely!
                            </p>
                        </div>
                    </div>

                    <div className="relative bg-[#1A232E] border border-[#2E3A52] rounded-lg p-4">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={copyBackupCodes}
                            className="absolute top-2 right-2"
                        >
                            {copiedCode ? (
                                <Check className="h-4 w-4 text-green-400" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </Button>

                        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                            {backupCodes.map((code, index) => (
                                <div key={index} className="text-zinc-300">
                                    {code}
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button
                        onClick={() => {
                            setBackupCodes([]);
                            setShowSetup(false);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700"
                    >
                        I've Saved My Backup Codes
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // If showing QR code setup
    if (showSetup && qrCodeUrl) {
        return (
            <Card className="bg-[#0D1117] border-[#2E3A52]">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Key className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Setup Two-Factor Authentication</CardTitle>
                            <CardDescription className="text-zinc-500">
                                Scan the QR code with your authenticator app
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex flex-col items-center gap-4 py-4">
                            {qrCodeUrl && (
                                <div className="bg-white p-4 rounded-lg">
                                    <Image
                                        src={qrCodeUrl}
                                        alt="2FA QR Code"
                                        width={200}
                                        height={200}
                                        className="rounded"
                                    />
                                </div>
                            )}

                            <div className="text-center space-y-2">
                                <p className="text-sm text-zinc-400">Or enter this code manually:</p>
                                <div className="bg-[#1A232E] border border-[#2E3A52] rounded-lg px-4 py-2">
                                    <code className="text-sm font-mono text-zinc-300">{secret}</code>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/5 pt-4">
                            <p className="text-sm text-zinc-400 mb-4">
                                Recommended authenticator apps:
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                                <div>• Google Authenticator</div>
                                <div>• Microsoft Authenticator</div>
                                <div>• Authy</div>
                                <div>• 1Password</div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleVerifyAndEnable} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="verificationCode" className="text-zinc-300">
                                Enter the 6-digit code from your app
                            </Label>
                            <Input
                                id="verificationCode"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\\D/g, ""))}
                                className="bg-[#1A232E] border-[#2E3A52] text-white text-center text-2xl tracking-widest"
                                placeholder="000000"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowSetup(false);
                                    setQrCodeUrl("");
                                    setSecret("");
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading || verificationCode.length !== 6}
                                className="flex-1 bg-primary hover:bg-primary/80 text-white"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify & Enable"
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        );
    }

    // Default view - Enable/Disable 2FA
    return (
        <Card className="bg-[#0D1117] border-[#2E3A52]">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${twoFactorEnabled ? 'bg-green-500/10' : 'bg-zinc-500/10'}`}>
                        <Shield className={`h-5 w-5 ${twoFactorEnabled ? 'text-green-400' : 'text-zinc-400'}`} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-white">Two-Factor Authentication</CardTitle>
                            {twoFactorEnabled && (
                                <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                                    Enabled
                                </span>
                            )}
                        </div>
                        <CardDescription className="text-zinc-500">
                            {twoFactorEnabled
                                ? "Your account is protected with 2FA"
                                : "Add an extra layer of security to your account"}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {twoFactorEnabled ? (
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-400">
                            Two-factor authentication is currently enabled. You'll need to enter a code from your
                            authenticator app each time you log in.
                        </p>
                        <Button
                            onClick={handleDisable2FA}
                            disabled={isLoading}
                            variant="destructive"
                            className="w-full"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Disabling...
                                </>
                            ) : (
                                "Disable 2FA"
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-400">
                            Protect your account by requiring a verification code from your phone in addition to your
                            password when signing in.
                        </p>
                        <Button
                            onClick={handleSetup2FA}
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary/80 text-white"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Key className="h-4 w-4 mr-2" />
                                    Enable 2FA
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
