
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfilePictureUpload } from "@/components/settings/ProfilePictureUpload";
import { KYCStatusCard } from "@/components/settings/KYCStatusCard";
import { updateProfile } from "@/lib/settings-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { User } from "@/types/user";

interface UserInformationTabProps {
    user: User;
    onTabChange?: (tab: string) => void;
}

export function UserInformationTab({ user, onTabChange }: UserInformationTabProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        displayName: user.displayName || "",
        krakenId: user.krakenId || "",
        socials: {
            facebook: user.facebook || "",
            tiktok: user.tiktok || "",
            instagram: user.instagram || "",
            twitter: user.twitter || "",
            youtube: user.youtube || "",
        },
    });

    const [isEditing, setIsEditing] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProfile(formData);
            toast.success("Profile updated successfully");
            setIsEditing(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update profile";
            toast.error(message);
            console.error("Profile update error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-8">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="firstName" className="text-zinc-400">First Name <span className="text-red-500">*</span></Label>
                        <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="mt-2 bg-[#0E1217] border-[#2E3A52] text-white placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                            placeholder="John"
                        />
                    </div>
                    <div>
                        <Label htmlFor="lastName" className="text-zinc-400">Last Name <span className="text-red-500">*</span></Label>
                        <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="mt-2 bg-[#0E1217] border-[#2E3A52] text-white placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                            placeholder="Doe"
                        />
                    </div>
                </div>

                {/* Email (Read-only) */}
                <div>
                    <Label htmlFor="email" className="text-zinc-400">Email Address</Label>
                    <Input
                        id="email"
                        value={formData.email}
                        disabled
                        className="mt-2 bg-[#0E1217] border-[#2E3A52] text-zinc-500 cursor-not-allowed"
                    />
                </div>

                {/* Display Name */}
                <div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="displayName" className="text-zinc-400">Display Name</Label>
                        <span className="text-xs text-zinc-500">Visible on Leaderboard</span>
                    </div>
                    <div className="relative mt-2">
                        <Input
                            id="displayName"
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            disabled={!isEditing && !!user.displayName}
                            className="bg-[#0E1217] border-[#2E3A52] text-white pr-10"
                            placeholder="TraderPro123"
                        />
                        {(!isEditing && user.displayName) && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-primary transition-colors"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Kraken ID - Hidden for now, not needed for MVP */}

                {/* Social Media Profiles */}
                <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6 space-y-4">
                    <h3 className="text-lg font-bold text-white mb-4">Social Media Profiles</h3>
                    <div className="space-y-4">
                        {[
                            { name: "Facebook", key: "facebook", color: "text-primary bg-primary/10" },
                            { name: "TikTok", key: "tiktok", color: "text-pink-500 bg-pink-500/10" },
                            { name: "Instagram", key: "instagram", color: "text-purple-500 bg-purple-500/10" },
                            { name: "X (Twitter)", key: "twitter", color: "text-zinc-200 bg-zinc-500/10" },
                            { name: "YouTube", key: "youtube", color: "text-red-500 bg-red-500/10" },
                        ].map((social) => (
                            <div key={social.key} className="grid grid-cols-[120px_1fr] gap-4 items-center">
                                <span className={cn("text-sm font-medium px-3 py-1.5 rounded text-center", social.color)}>
                                    {social.name}
                                </span>
                                <div className="relative">
                                    <Input
                                        value={formData.socials[social.key as keyof typeof formData.socials]}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                socials: { ...formData.socials, [social.key]: e.target.value },
                                            })
                                        }
                                        placeholder="Profile URL"
                                        className="bg-[#0E1217] border-[#2E3A52] text-zinc-300 focus:text-white h-9 text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 font-bold"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
                <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6">
                    <ProfilePictureUpload
                        currentImageUrl={user.image}
                        onUpload={(file) => {
                            // BACKLOG: Implement file upload logic
                            toast.info("Image upload coming soon");
                        }}
                    />
                </div>

                <KYCStatusCard
                    status={(user.kycStatus || 'not_started') as 'not_started' | 'in_progress' | 'under_review' | 'approved' | 'rejected'}
                    onStartVerification={() => onTabChange?.('kyc')}
                />
            </div>
        </div>
    );
}
