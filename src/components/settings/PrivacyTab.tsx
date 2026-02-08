"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Shield, Eye, EyeOff, Globe, User, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PrivacyTabProps {
    initialLeaderboardPrivacy: "public" | "semi_private" | "fully_private";
    initialShowCountry: boolean;
    initialShowStatsPublicly: boolean;
}

export default function PrivacyTab({
    initialLeaderboardPrivacy,
    initialShowCountry,
    initialShowStatsPublicly,
}: PrivacyTabProps) {
    const [leaderboardPrivacy, setLeaderboardPrivacy] = useState(initialLeaderboardPrivacy);
    const [showCountry, setShowCountry] = useState(initialShowCountry);
    const [showStatsPublicly, setShowStatsPublicly] = useState(initialShowStatsPublicly);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch("/api/settings/privacy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    leaderboardPrivacy,
                    showCountry,
                    showStatsPublicly,
                }),
            });

            if (!response.ok) throw new Error("Failed to update privacy settings");

            toast.success("Privacy settings updated successfully");
        } catch (error) {
            console.error("Error updating privacy settings:", error);
            toast.error("Failed to update privacy settings");
        } finally {
            setIsSaving(false);
        }
    };

    const getPrivacyDescription = () => {
        switch (leaderboardPrivacy) {
            case "public":
                return "Your name, stats, and profile are visible to everyone. Great for building your reputation!";
            case "semi_private":
                return "You appear on leaderboards as 'Trader #XXX' with stats visible, but no public profile access.";
            case "fully_private":
                return "You're completely hidden from leaderboards and public profiles. You can still see your own rank in settings.";
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Privacy & Visibility Settings
                </h2>
                <p className="text-sm text-zinc-400">
                    Control how your trading profile appears to other users
                </p>
            </div>

            {/* Leaderboard Privacy Level */}
            <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Leaderboard Privacy</h3>
                    <p className="text-sm text-zinc-400 mb-4">Choose how you appear on public leaderboards</p>
                </div>

                <RadioGroup
                    value={leaderboardPrivacy}
                    onValueChange={(val) => setLeaderboardPrivacy(val as typeof leaderboardPrivacy)}
                    className="space-y-3"
                >
                    {/* Public */}
                    <div className="flex items-start space-x-3 p-4 rounded-lg border border-[#2E3A52] hover:border-primary/30 transition-colors">
                        <RadioGroupItem value="public" id="public" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="public" className="text-white font-medium cursor-pointer flex items-center gap-2">
                                <Globe className="w-4 h-4 text-green-400" />
                                Public - Full Visibility
                            </Label>
                            <p className="text-xs text-zinc-500 mt-1">
                                Your name, country, stats, and public profile are visible to everyone
                            </p>
                        </div>
                    </div>

                    {/* Semi-Private */}
                    <div className="flex items-start space-x-3 p-4 rounded-lg border border-[#2E3A52] hover:border-primary/30 transition-colors">
                        <RadioGroupItem value="semi_private" id="semi_private" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="semi_private" className="text-white font-medium cursor-pointer flex items-center gap-2">
                                <Eye className="w-4 h-4 text-primary" />
                                Semi-Private - Anonymous Stats
                            </Label>
                            <p className="text-xs text-zinc-500 mt-1">
                                Appear as "Trader #XXX" with stats visible. No public profile access.
                            </p>
                        </div>
                    </div>

                    {/* Fully Private */}
                    <div className="flex items-start space-x-3 p-4 rounded-lg border border-[#2E3A52] hover:border-primary/30 transition-colors">
                        <RadioGroupItem value="fully_private" id="fully_private" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="fully_private" className="text-white font-medium cursor-pointer flex items-center gap-2">
                                <EyeOff className="w-4 h-4 text-red-400" />
                                Fully Private - Hidden
                            </Label>
                            <p className="text-xs text-zinc-500 mt-1">
                                Completely hidden from leaderboards. Only you can see your rank.
                            </p>
                        </div>
                    </div>
                </RadioGroup>

                {/* Current Selection Description */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-primary/80 font-medium mb-1">Current Setting</p>
                        <p className="text-sm text-zinc-400">{getPrivacyDescription()}</p>
                    </div>
                </div>
            </div>

            {/* Additional Privacy Controls */}
            <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Additional Privacy Options</h3>
                    <p className="text-sm text-zinc-400">Fine-tune what information is publicly visible</p>
                </div>

                {/* Show Country */}
                <div className="flex items-center justify-between py-3 border-b border-[#2E3A52]">
                    <div className="flex-1">
                        <Label htmlFor="show-country" className="text-white font-medium cursor-pointer flex items-center gap-2">
                            <Globe className="w-4 h-4 text-zinc-400" />
                            Show Country Flag
                        </Label>
                        <p className="text-xs text-zinc-500 mt-1">
                            Display your country flag on leaderboards and public profiles
                        </p>
                    </div>
                    <Switch
                        id="show-country"
                        checked={showCountry}
                        onCheckedChange={setShowCountry}
                        disabled={leaderboardPrivacy === "fully_private"}
                    />
                </div>

                {/* Show Stats Publicly */}
                <div className="flex items-center justify-between py-3">
                    <div className="flex-1">
                        <Label htmlFor="show-stats" className="text-white font-medium cursor-pointer flex items-center gap-2">
                            <User className="w-4 h-4 text-zinc-400" />
                            Show Performance Stats
                        </Label>
                        <p className="text-xs text-zinc-500 mt-1">
                            Allow others to view your trading volume, profit, win rate, etc.
                        </p>
                    </div>
                    <Switch
                        id="show-stats"
                        checked={showStatsPublicly}
                        onCheckedChange={setShowStatsPublicly}
                        disabled={leaderboardPrivacy === "fully_private"}
                    />
                </div>

                {leaderboardPrivacy === "fully_private" && (
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-zinc-400">
                            These options are disabled because you're in "Fully Private" mode. Only you can see your stats.
                        </p>
                    </div>
                )}
            </div>

            {/* Privacy Tips */}
            <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Privacy Tips</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Public profiles help build credibility with potential clients and employers</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Semi-private is a good balance if you want to compete anonymously</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>You can change these settings anytime without affecting your account status</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Hiding your country is recommended if you're concerned about location privacy</span>
                    </li>
                </ul>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/80 text-white"
                >
                    {isSaving ? "Saving..." : "Save Privacy Settings"}
                </Button>
            </div>
        </div>
    );
}
