"use client";

import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ProfileCustomizationSectionProps {
    tradingBio?: string | null;
    tradingStyle?: string | null;
    favoriteMarkets?: string | null;
    onSave: (data: { tradingBio: string; tradingStyle: string; favoriteMarkets: string }) => Promise<void>;
}

export function ProfileCustomizationSection({
    tradingBio,
    tradingStyle,
    favoriteMarkets,
    onSave
}: ProfileCustomizationSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        tradingBio: tradingBio || "",
        tradingStyle: tradingStyle || "",
        favoriteMarkets: favoriteMarkets || "",
    });

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(formData);
            setIsEditing(false);
            toast.success("Profile updated successfully!");
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            tradingBio: tradingBio || "",
            tradingStyle: tradingStyle || "",
            favoriteMarkets: favoriteMarkets || "",
        });
        setIsEditing(false);
    };

    if (!isEditing) {
        return (
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-sm text-zinc-400 mb-2">About Me</p>
                        <p className="text-white">
                            {tradingBio || "No bio yet. Click edit to add one."}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2"
                    >
                        <Pencil className="w-4 h-4" />
                        Edit
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-zinc-400 mb-2">Trading Style</p>
                        {tradingStyle ? (
                            <Badge variant="secondary">{tradingStyle}</Badge>
                        ) : (
                            <p className="text-sm text-zinc-600">Not set</p>
                        )}
                    </div>
                    <div>
                        <p className="text-sm text-zinc-400 mb-2">Favorite Markets</p>
                        {favoriteMarkets ? (
                            <Badge variant="secondary">{favoriteMarkets}</Badge>
                        ) : (
                            <p className="text-sm text-zinc-600">Not set</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="text-sm text-zinc-400 block mb-2">Trading Bio</label>
                <Textarea
                    value={formData.tradingBio}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, tradingBio: e.target.value })}
                    placeholder="Tell others about your trading journey..."
                    className="h-24"
                    maxLength={200}
                />
                <p className="text-xs text-zinc-500 mt-1">{formData.tradingBio.length}/200</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-zinc-400 block mb-2">Trading Style</label>
                    <select
                        value={formData.tradingStyle}
                        onChange={(e) => setFormData({ ...formData, tradingStyle: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1A232E] border border-[#2E3A52] rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                        <option value="">Select style</option>
                        <option value="Scalper">Scalper</option>
                        <option value="Day Trader">Day Trader</option>
                        <option value="Swing Trader">Swing Trader</option>
                        <option value="Position Trader">Position Trader</option>
                    </select>
                </div>

                <div>
                    <label className="text-sm text-zinc-400 block mb-2">Favorite Markets</label>
                    <input
                        type="text"
                        value={formData.favoriteMarkets}
                        onChange={(e) => setFormData({ ...formData, favoriteMarkets: e.target.value })}
                        placeholder="e.g., Crypto, Forex, Politics"
                        className="w-full px-3 py-2 bg-[#1A232E] border border-[#2E3A52] rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                </div>
            </div>

            <div className="flex gap-2">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                >
                    <X className="w-4 h-4" />
                    Cancel
                </Button>
            </div>
        </div>
    );
}
