"use client";

import { useState } from "react";
import { Instagram, Facebook, Twitter, MessageSquare, Send, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SocialMediaSectionProps {
    socials: {
        instagram?: string | null;
        facebook?: string | null;
        twitter?: string | null;
        discord?: string | null;
        telegram?: string | null;
    };
    onSave: (socials: {
        instagram: string;
        facebook: string;
        twitter: string;
        discord: string;
        telegram: string;
    }) => Promise<void>;
}

export function SocialMediaSection({ socials, onSave }: SocialMediaSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        instagram: socials.instagram || "",
        facebook: socials.facebook || "",
        twitter: socials.twitter || "",
        discord: socials.discord || "",
        telegram: socials.telegram || "",
    });

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(formData);
            setIsEditing(false);
            toast.success("Social media accounts updated!");
        } catch (error) {
            toast.error("Failed to update social accounts");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            instagram: socials.instagram || "",
            facebook: socials.facebook || "",
            twitter: socials.twitter || "",
            discord: socials.discord || "",
            telegram: socials.telegram || "",
        });
        setIsEditing(false);
    };

    const socialPlatforms = [
        { key: 'instagram' as const, label: 'Instagram', icon: Instagram, placeholder: '@yourhandle', color: '#E4405F' },
        { key: 'facebook' as const, label: 'Facebook', icon: Facebook, placeholder: 'YourPageName', color: '#1877F2' },
        { key: 'twitter' as const, label: 'Twitter (X)', icon: Twitter, placeholder: '@handle', color: '#1DA1F2' },
        { key: 'discord' as const, label: 'Discord', icon: MessageSquare, placeholder: 'username#1234', color: '#5865F2' },
        { key: 'telegram' as const, label: 'Telegram', icon: Send, placeholder: '@username', color: '#0088CC' },
    ];

    if (!isEditing) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-zinc-400">
                        Your social media handles will be displayed on your public profile
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                    >
                        Edit Social Media
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {socialPlatforms.map(({ key, label, icon: Icon, color }) => {
                        const value = formData[key];
                        return (
                            <div
                                key={key}
                                className="flex items-center gap-3 p-3 rounded-lg bg-[#1A232E] border border-[#2E3A52]"
                            >
                                <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                                    <Icon className="w-4 h-4" style={{ color }} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-zinc-500">{label}</p>
                                    <p className="text-sm text-white">
                                        {value || <span className="text-zinc-600">Not connected</span>}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-zinc-400 mb-4">
                Enter your social media handles (optional). These will appear on your public profile.
            </p>

            <div className="space-y-4">
                {socialPlatforms.map(({ key, label, icon: Icon, placeholder, color }) => (
                    <div key={key}>
                        <label className="text-sm text-zinc-400 block mb-2 flex items-center gap-2">
                            <Icon className="w-4 h-4" style={{ color }} />
                            {label}
                        </label>
                        <input
                            type="text"
                            value={formData[key]}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                            placeholder={placeholder}
                            className="w-full px-3 py-2 bg-[#1A232E] border border-[#2E3A52] rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                        />
                    </div>
                ))}
            </div>

            <div className="flex gap-2 pt-4">
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
