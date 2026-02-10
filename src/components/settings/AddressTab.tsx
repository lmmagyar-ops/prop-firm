
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateAddress } from "@/lib/settings-actions";
import { toast } from "sonner";
import { Loader2, Save, MapPin } from "lucide-react";
import type { User } from "@/types/user";

const COUNTRIES = [
    "United States",
    "Canada",
    "United Kingdom",
    "Germany",
    "France",
    "Australia",
    "Japan",
    // Add more as needed
];

export function AddressTab({ user }: { user: User }) {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        addressStreet: user?.addressStreet || "",
        addressApartment: user?.addressApartment || "",
        addressCity: user?.addressCity || "",
        addressState: user?.addressState || "",
        addressZip: user?.addressZip || "",
        addressCountry: user?.addressCountry || "",
    });

    const handleSave = async () => {
        // Basic validation
        if (!formData.addressStreet || !formData.addressCity || !formData.addressState || !formData.addressZip || !formData.addressCountry) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSaving(true);
        try {
            await updateAddress(formData);
            toast.success("Address updated successfully");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update address";
            toast.error(message);
            console.error("Address update error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-8">
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-[#2E3A52]">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Shipping Address</h3>
                        <p className="text-sm text-zinc-400">Used for physical rewards and tax documentation.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Street Address */}
                    <div>
                        <Label htmlFor="street" className="text-zinc-400">Street Address <span className="text-red-500">*</span></Label>
                        <Input
                            id="street"
                            value={formData.addressStreet}
                            onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                            className="mt-2 bg-[#0E1217] border-[#2E3A52] text-white focus:border-[#29af73]/50"
                            placeholder="123 Main St"
                        />
                    </div>

                    {/* Apartment */}
                    <div>
                        <Label htmlFor="apartment" className="text-zinc-400">Apartment, suite, etc.</Label>
                        <Input
                            id="apartment"
                            value={formData.addressApartment}
                            onChange={(e) => setFormData({ ...formData, addressApartment: e.target.value })}
                            className="mt-2 bg-[#0E1217] border-[#2E3A52] text-white focus:border-[#29af73]/50"
                            placeholder="Apt 4B"
                        />
                    </div>

                    {/* City / State */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="city" className="text-zinc-400">City <span className="text-red-500">*</span></Label>
                            <Input
                                id="city"
                                value={formData.addressCity}
                                onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                                className="mt-2 bg-[#0E1217] border-[#2E3A52] text-white focus:border-[#29af73]/50"
                            />
                        </div>
                        <div>
                            <Label htmlFor="state" className="text-zinc-400">State / Province <span className="text-red-500">*</span></Label>
                            <Input
                                id="state"
                                value={formData.addressState}
                                onChange={(e) => setFormData({ ...formData, addressState: e.target.value })}
                                className="mt-2 bg-[#0E1217] border-[#2E3A52] text-white focus:border-[#29af73]/50"
                            />
                        </div>
                    </div>

                    {/* Zip / Country */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="zip" className="text-zinc-400">ZIP / Postal Code <span className="text-red-500">*</span></Label>
                            <Input
                                id="zip"
                                value={formData.addressZip}
                                onChange={(e) => setFormData({ ...formData, addressZip: e.target.value })}
                                className="mt-2 bg-[#0E1217] border-[#2E3A52] text-white focus:border-[#29af73]/50"
                            />
                        </div>
                        <div>
                            <Label htmlFor="country" className="text-zinc-400">Country <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.addressCountry}
                                onValueChange={(val) => setFormData({ ...formData, addressCountry: val })}
                            >
                                <SelectTrigger className="mt-2 bg-[#0E1217] border-[#2E3A52] text-white">
                                    <SelectValue placeholder="Select Country" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1A232E] border-[#2E3A52] text-white max-h-[200px]">
                                    {COUNTRIES.map((country) => (
                                        <SelectItem key={country} value={country} className="focus:bg-[#29af73]/20 focus:text-white cursor-pointer">
                                            {country}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary hover:bg-primary/90 text-white font-bold min-w-[150px]"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Address
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
