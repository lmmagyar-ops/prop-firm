"use client";

import { useState } from "react";
import { Twitter, MessageSquare, Send, Eye, EyeOff, Instagram, Facebook } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface SocialVisibilitySectionProps {
    socials?: {
        twitter?: string;
        discord?: string;
        telegram?: string;
        instagram?: string;
        facebook?: string;
    };
    visibility: {
        twitterPublic: boolean;
        discordPublic: boolean;
        telegramPublic: boolean;
        instagramPublic: boolean;
        facebookPublic: boolean;
    };
    onToggleVisibility: (platform: 'twitter' | 'discord' | 'telegram' | 'instagram' | 'facebook', isPublic: boolean) => Promise<void>;
}

export function SocialVisibilitySection({ socials, visibility, onToggleVisibility }: SocialVisibilitySectionProps) {
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const handleToggle = async (platform: 'twitter' | 'discord' | 'telegram' | 'instagram' | 'facebook', currentValue: boolean) => {
        setIsUpdating(platform);
        try {
            await onToggleVisibility(platform, !currentValue);
            toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} visibility updated`);
        } catch (error) {
            toast.error("Failed to update visibility");
        } finally {
            setIsUpdating(null);
        }
    };

    const socialItems = [
        {
            platform: 'instagram' as const,
            label: 'Instagram',
            icon: Instagram,
            value: socials?.instagram,
            isPublic: visibility.instagramPublic,
            color: '#E4405F',
        },
        {
            platform: 'facebook' as const,
            label: 'Facebook',
            icon: Facebook,
            value: socials?.facebook,
            isPublic: visibility.facebookPublic,
            color: '#1877F2',
        },
        {
            platform: 'twitter' as const,
            label: 'Twitter (X)',
            icon: Twitter,
            value: socials?.twitter,
            isPublic: visibility.twitterPublic,
            color: '#1DA1F2',
        },
        {
            platform: 'discord' as const,
            label: 'Discord',
            icon: MessageSquare,
            value: socials?.discord,
            isPublic: visibility.discordPublic,
            color: '#5865F2',
        },
        {
            platform: 'telegram' as const,
            label: 'Telegram',
            icon: Send,
            value: socials?.telegram,
            isPublic: visibility.telegramPublic,
            color: '#0088CC',
        },
    ];

    return (
        <div className="space-y-4">
            <div className="text-sm text-zinc-400 mb-4">
                Control which of your connected social accounts are visible on your public profile
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {socialItems.map(({ platform, label, icon: Icon, value, isPublic, color }) => {
                    const isConnected = !!value;

                    return (
                        <div
                            key={platform}
                            className="flex items-center justify-between p-4 rounded-xl bg-[#1A232E] border border-[#2E3A52] hover:border-zinc-600 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                                    <Icon className="w-5 h-5" style={{ color }} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">{label}</p>
                                    <p className="text-xs text-zinc-500">
                                        {isConnected ? value : "Not connected"}
                                    </p>
                                </div>
                            </div>

                            {isConnected ? (
                                <div className="flex items-center gap-3">
                                    {isPublic ? (
                                        <Eye className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <EyeOff className="w-4 h-4 text-zinc-500" />
                                    )}
                                    <Switch
                                        checked={isPublic}
                                        onCheckedChange={() => handleToggle(platform, isPublic)}
                                        disabled={isUpdating === platform}
                                    />
                                </div>
                            ) : (
                                <span className="text-xs text-zinc-500">Connect first</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

