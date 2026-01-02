"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ticket, Plus, Loader2, TrendingUp, Users, DollarSign, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface DiscountCode {
    id: string;
    code: string;
    name: string;
    description: string | null;
    type: string;
    value: string;
    active: boolean;
    validFrom: string;
    validUntil: string | null;
    maxTotalUses: number | null;
    currentUses: number;
    redemptionCount: number;
    totalRevenue: number;
    totalSavings: number;
}

export default function DiscountsPage() {
    const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);

    const [form, setForm] = useState({
        code: "",
        name: "",
        description: "",
        type: "percentage",
        value: "",
        eligibleTiers: [] as string[],
        newCustomersOnly: false,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: "",
        maxTotal Uses: "",
        maxUsesPerUser: "1",
        campaignName: ""
    });

    const fetchDiscounts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/discounts");
            if (res.ok) {
                const data = await res.json();
                setDiscounts(data.discounts || []);
            }
        } catch (error) {
            console.error("Failed to fetch discounts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const createDiscount = async () => {
        setCreating(true);
        try {
            const res = await fetch("/api/admin/discounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    eligibleTiers: form.eligibleTiers.length > 0 ? form.eligibleTiers : null,
                    maxTotalUses: form.maxTotalUses ? parseInt(form.maxTotalUses) : null,
                    validUntil: form.validUntil || null
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(`Discount code "${form.code}" created!`);
                setCreateModalOpen(false);
                setForm({
                    code: "",
                    name: "",
                    description: "",
                    type: "percentage",
                    value: "",
                    eligibleTiers: [],
                    newCustomersOnly: false,
                    validFrom: new Date().toISOString().split('T')[0],
                    validUntil: "",
                    maxTotalUses: "",
                    maxUsesPerUser: "1",
                    campaignName: ""
                });
                fetchDiscounts();
            } else {
                toast.error(data.error || "Failed to create discount");
            }
        } catch (error) {
            console.error("Create discount error:", error);
            toast.error("Failed to create discount");
        } finally {
            setCreating(false);
        }
    };

    const deactivateDiscount = async (id: string, code: string) => {
        try {
            const res = await fetch(`/api/admin/discounts/${id}/deactivate`, {
                method: "PATCH",
            });

            if (res.ok) {
                toast.success(`Code "${code}" deactivated`);
                fetchDiscounts();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to deactivate");
            }
        } catch (error) {
            console.error("Deactivate error:", error);
            toast.error("Failed to deactivate");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white/90">Discount Codes</h1>
                    <p className="text-zinc-500">Manage promotional codes and track redemptions</p>
                </div>
                <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Discount Code
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-700 max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-zinc-100">Create Discount Code</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                Create a new promotional discount code for your campaigns
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="code" className="text-zinc-300">Code *</Label>
                                    <Input
                                        id="code"
                                        placeholder="SUMMER25"
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                        className="bg-zinc-800 border-zinc-700 font-mono"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name" className="text-zinc-300">Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="Summer Sale 2026"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description" className="text-zinc-300">Description</Label>
                                <Input
                                    id="description"
                                    placeholder="Limited time offer for summer..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="bg-zinc-800 border-zinc-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="type" className="text-zinc-300">Discount Type *</Label>
                                    <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700">
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="value" className="text-zinc-300">
                                        Value * {form.type === "percentage" ? "(%)" : "($)"}
                                    </Label>
                                    <Input
                                        id="value"
                                        type="number"
                                        placeholder={form.type === "percentage" ? "25" : "50"}
                                        value={form.value}
                                        onChange={(e) => setForm({ ...form, value: e.target.value })}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="validFrom" className="text-zinc-300">Valid From *</Label>
                                    <Input
                                        id="validFrom"
                                        type="date"
                                        value={form.validFrom}
                                        onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="validUntil" className="text-zinc-300">Valid Until</Label>
                                    <Input
                                        id="validUntil"
                                        type="date"
                                        value={form.validUntil}
                                        onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="maxTotalUses" className="text-zinc-300">Max Total Uses</Label>
                                    <Input
                                        id="maxTotalUses"
                                        type="number"
                                        placeholder="Unlimited"
                                        value={form.maxTotalUses}
                                        onChange={(e) => setForm({ ...form, maxTotalUses: e.target.value })}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="maxUsesPerUser" className="text-zinc-300">Max Per User</Label>
                                    <Input
                                        id="maxUsesPerUser"
                                        type="number"
                                        value={form.maxUsesPerUser}
                                        onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="campaignName" className="text-zinc-300">Campaign Name</Label>
                                <Input
                                    id="campaignName"
                                    placeholder="Q1 Email Blast"
                                    value={form.campaignName}
                                    onChange={(e) => setForm({ ...form, campaignName: e.target.value })}
                                    className="bg-zinc-800 border-zinc-700"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setCreateModalOpen(false)}
                                className="border-zinc-700 text-zinc-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={createDiscount}
                                disabled={creating || !form.code || !form.name || !form.value || !form.validFrom}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Code
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/10">
                                <Ticket className="h-5 w-5 text-indigo-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white tabular-nums">{discounts.length}</div>
                                <div className="text-xs text-zinc-500">Total Codes</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <CheckCircle2 className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white tabular-nums">
                                    {discounts.filter(d => d.active).length}
                                </div>
                                <div className="text-xs text-zinc-500">Active Codes</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Users className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white tabular-nums">
                                    {discounts.reduce((sum, d) => sum + d.redemptionCount, 0)}
                                </div>
                                <div className="text-xs text-zinc-500">Total Redemptions</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <DollarSign className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white tabular-nums">
                                    ${discounts.reduce((sum, d) => sum + d.totalRevenue, 0).toFixed(0)}
                                </div>
                                <div className="text-xs text-zinc-500">Revenue Generated</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Discount Codes List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </div>
            ) : discounts.length === 0 ? (
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="py-12 text-center">
                        <Ticket className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-zinc-300">No discount codes yet</h3>
                        <p className="text-sm text-zinc-500">Create your first promotional code to get started</p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardHeader className="border-b border-white/5">
                        <CardTitle className="text-base text-zinc-200">Discount Codes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-white/5">
                            {discounts.map((discount) => (
                                <div key={discount.id} className="p-4 hover:bg-white/5 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <code className="text-lg font-mono font-bold text-indigo-400">
                                                    {discount.code}
                                                </code>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs ${discount.active
                                                            ? 'text-green-400 border-green-500/20 bg-green-500/10'
                                                            : 'text-zinc-500 border-zinc-500/20 bg-zinc-500/10'
                                                        }`}
                                                >
                                                    {discount.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/20 bg-purple-500/10">
                                                    {discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-white font-medium mb-1">{discount.name}</div>
                                            {discount.description && (
                                                <div className="text-xs text-zinc-500 mb-2">{discount.description}</div>
                                            )}
                                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(discount.validFrom), 'MMM d')} - {discount.validUntil ? format(new Date(discount.validUntil), 'MMM d') : 'No expiry'}
                                                </div>
                                                <div className="tabular-nums">
                                                    {discount.currentUses}/{discount.maxTotalUses || '∞'} uses
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-4">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <div className="text-xs text-zinc-500">Redemptions</div>
                                                    <div className="font-mono text-sm text-white tabular-nums">{discount.redemptionCount}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-zinc-500">Revenue</div>
                                                    <div className="font-mono text-sm text-green-400 tabular-nums">${discount.totalRevenue.toFixed(0)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-zinc-500">Savings</div>
                                                    <div className="font-mono text-sm text-red-400 tabular-nums">${discount.totalSavings.toFixed(0)}</div>
                                                </div>
                                            </div>
                                            {discount.active && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => deactivateDiscount(discount.id, discount.code)}
                                                    className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                                                >
                                                    <XCircle className="h-3 w-3 mr-1" />
                                                    Deactivate
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
