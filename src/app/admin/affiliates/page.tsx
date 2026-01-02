"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Loader2, TrendingUp, DollarSign, CheckCircle2, XCircle, ExternalLink, AlertCircle, Crown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Affiliate {
    id: string;
    userId: string;
    tier: number;
    status: string;
    commissionRate: string;
    lifetimeValueRate: string;
    referralCode: string;
    referralLink: string;
    monthlyEarningCap: string | null;
    applicationData: any;
    createdAt: string;
    approvedAt: string | null;
    approvedBy: string | null;
    stats: {
        totalReferrals: number;
        conversions: number;
        totalCommission: number;
        paidCommission: number;
        pendingCommission: number;
    };
}

export default function AffiliatesPage() {
    const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [customCommissionRate, setCustomCommissionRate] = useState("15");

    const fetchAffiliates = async () => {
        setLoading(true);
        try {
            const url = statusFilter === "all"
                ? "/api/admin/affiliates"
                : `/api/admin/affiliates?status=${statusFilter}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setAffiliates(data.affiliates || []);
            }
        } catch (error) {
            console.error("Failed to fetch affiliates", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAffiliates();
    }, [statusFilter]);

    const openReviewModal = (affiliate: Affiliate) => {
        setSelectedAffiliate(affiliate);
        setCustomCommissionRate(affiliate.tier === 2 ? "15" : "10");
        setReviewModalOpen(true);
    };

    const approveAffiliate = async () => {
        if (!selectedAffiliate) return;
        setApproving(true);
        try {
            const res = await fetch(`/api/admin/affiliates/${selectedAffiliate.id}/approve`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commissionRate: parseFloat(customCommissionRate) }),
            });

            if (res.ok) {
                toast.success(`Approved ${selectedAffiliate.referralCode} at ${customCommissionRate}% commission`);
                setReviewModalOpen(false);
                fetchAffiliates();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to approve");
            }
        } catch (error) {
            console.error("Approve error:", error);
            toast.error("Failed to approve affiliate");
        } finally {
            setApproving(false);
        }
    };

    const rejectAffiliate = async () => {
        if (!selectedAffiliate) return;
        setRejecting(true);
        try {
            const res = await fetch(`/api/admin/affiliates/${selectedAffiliate.id}/reject`, {
                method: "PATCH",
            });

            if (res.ok) {
                toast.success(`Rejected ${selectedAffiliate.referralCode}`);
                setReviewModalOpen(false);
                fetchAffiliates();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to reject");
            }
        } catch (error) {
            console.error("Reject error:", error);
            toast.error("Failed to reject affiliate");
        } finally {
            setRejecting(false);
        }
    };

    const getTierBadge = (tier: number) => {
        const configs = {
            1: { label: "Tier 1", color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
            2: { label: "Tier 2", color: "text-purple-400 border-purple-500/20 bg-purple-500/10" },
            3: { label: "Tier 3", color: "text-amber-400 border-amber-500/20 bg-amber-500/10" },
        };
        const config = configs[tier as keyof typeof configs] || configs[1];
        return (
            <Badge variant="outline" className={`text-xs ${config.color}`}>
                {tier === 3 && <Crown className="h-3 w-3 mr-1" />}
                {config.label}
            </Badge>
        );
    };

    const getStatusBadge = (status: string) => {
        const configs = {
            pending: { label: "Pending", color: "text-amber-400 border-amber-500/20 bg-amber-500/10", icon: AlertCircle },
            active: { label: "Active", color: "text-green-400 border-green-500/20 bg-green-500/10", icon: CheckCircle2 },
            rejected: { label: "Rejected", color: "text-red-400 border-red-500/20 bg-red-500/10", icon: XCircle },
            suspended: { label: "Suspended", color: "text-zinc-400 border-zinc-500/20 bg-zinc-500/10", icon: XCircle },
        };
        const config = configs[status as keyof typeof configs] || configs.pending;
        const Icon = config.icon;
        return (
            <Badge variant="outline" className={`text-xs ${config.color}`}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
            </Badge>
        );
    };

    const pendingCount = affiliates.filter(a => a.status === 'pending').length;
    const activeCount = affiliates.filter(a => a.status === 'active').length;
    const totalCommission = affiliates.reduce((sum, a) => sum + a.stats.totalCommission, 0);
    const pendingCommission = affiliates.reduce((sum, a) => sum + a.stats.pendingCommission, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white/90">Affiliate Program</h1>
                    <p className="text-zinc-500">Manage affiliate applications and track performance</p>
                </div>
                {pendingCount > 0 && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatusFilter("pending")}
                        className="border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                    >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {pendingCount} Pending Review
                    </Button>
                )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/10">
                                <Users className="h-5 w-5 text-indigo-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white tabular-nums">{affiliates.length}</div>
                                <div className="text-xs text-zinc-500">Total Affiliates</div>
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
                                <div className="text-2xl font-bold text-white tabular-nums">{activeCount}</div>
                                <div className="text-xs text-zinc-500">Active Partners</div>
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
                                <div className="text-2xl font-bold text-white tabular-nums">${totalCommission.toFixed(0)}</div>
                                <div className="text-xs text-zinc-500">Total Commission</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <TrendingUp className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white tabular-nums">${pendingCommission.toFixed(0)}</div>
                                <div className="text-xs text-zinc-500">Pending Payout</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
                <Label className="text-zinc-400 text-sm">Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 bg-zinc-900/40 border-zinc-700">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Affiliates List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </div>
            ) : affiliates.length === 0 ? (
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-zinc-300">No affiliates found</h3>
                        <p className="text-sm text-zinc-500">
                            {statusFilter !== "all" ? `No ${statusFilter} affiliates` : "No affiliates have signed up yet"}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardHeader className="border-b border-white/5">
                        <CardTitle className="text-base text-zinc-200">Affiliates ({affiliates.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-white/5">
                            {affiliates.map((affiliate) => (
                                <div key={affiliate.id} className="p-4 hover:bg-white/5 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <code className="text-base font-mono font-bold text-indigo-400">
                                                    {affiliate.referralCode}
                                                </code>
                                                {getTierBadge(affiliate.tier)}
                                                {getStatusBadge(affiliate.status)}
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-zinc-500 mb-2">
                                                <div className="font-mono">
                                                    Commission: <span className="text-purple-400">{parseFloat(affiliate.commissionRate).toFixed(0)}%</span>
                                                </div>
                                                {affiliate.monthlyEarningCap && (
                                                    <div className="font-mono">
                                                        Cap: <span className="text-amber-400">${parseFloat(affiliate.monthlyEarningCap).toFixed(0)}/mo</span>
                                                    </div>
                                                )}
                                                <div>
                                                    Joined {format(new Date(affiliate.createdAt), 'MMM d, yyyy')}
                                                </div>
                                            </div>
                                            {affiliate.applicationData && (
                                                <div className="text-xs text-zinc-400 space-y-1">
                                                    {affiliate.applicationData.audienceSize && (
                                                        <div>Audience: <span className="text-zinc-300">{affiliate.applicationData.audienceSize}</span></div>
                                                    )}
                                                    {affiliate.applicationData.website && (
                                                        <div className="flex items-center gap-1">
                                                            Website:
                                                            <a
                                                                href={affiliate.applicationData.website}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-indigo-400 hover:underline flex items-center gap-1"
                                                            >
                                                                {affiliate.applicationData.website}
                                                                <ExternalLink className="h-3 w-3" />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right space-y-2">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <div className="text-xs text-zinc-500">Referrals</div>
                                                    <div className="font-mono text-sm text-white tabular-nums">
                                                        {affiliate.stats.totalReferrals}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-zinc-500">Conversions</div>
                                                    <div className="font-mono text-sm text-green-400 tabular-nums">
                                                        {affiliate.stats.conversions}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-zinc-500">Earned</div>
                                                    <div className="font-mono text-sm text-purple-400 tabular-nums">
                                                        ${affiliate.stats.total Commission.toFixed(0)}
                                                    </div>
                                                </div>
                                            </div>
                                            {affiliate.status === "pending" && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => openReviewModal(affiliate)}
                                                    className="bg-indigo-600 hover:bg-indigo-700"
                                                >
                                                    Review Application
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

            {/* Review Modal */}
            <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-700 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-100">
                            Review Affiliate Application - {selectedAffiliate?.referralCode}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Review the application details and approve or reject this affiliate
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAffiliate && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-zinc-500 mb-1">Tier</div>
                                    <div>{getTierBadge(selectedAffiliate.tier)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 mb-1">Applied</div>
                                    <div className="text-sm text-white">
                                        {format(new Date(selectedAffiliate.createdAt), 'MMM d, yyyy')}
                                    </div>
                                </div>
                            </div>

                            {selectedAffiliate.applicationData && (
                                <div className="bg-zinc-800/50 p-4 rounded-lg space-y-3">
                                    <h4 className="font-medium text-white">Application Details</h4>

                                    {selectedAffiliate.applicationData.audienceSize && (
                                        <div>
                                            <div className="text-xs text-zinc-500">Audience Size</div>
                                            <div className="text-sm text-white">{selectedAffiliate.applicationData.audienceSize}</div>
                                        </div>
                                    )}

                                    {selectedAffiliate.applicationData.website && (
                                        <div>
                                            <div className="text-xs text-zinc-500">Website</div>
                                            <a
                                                href={selectedAffiliate.applicationData.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-indigo-400 hover:underline flex items-center gap-1"
                                            >
                                                {selectedAffiliate.applicationData.website}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    )}

                                    {selectedAffiliate.applicationData.socialLinks && selectedAffiliate.applicationData.socialLinks.length > 0 && (
                                        <div>
                                            <div className="text-xs text-zinc-500 mb-1">Social Links</div>
                                            <div className="space-y-1">
                                                {selectedAffiliate.applicationData.socialLinks.map((link: string, i: number) => (
                                                    <a
                                                        key={i}
                                                        href={link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-indigo-400 hover:underline flex items-center gap-1"
                                                    >
                                                        {link}
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedAffiliate.applicationData.strategy && (
                                        <div>
                                            <div className="text-xs text-zinc-500 mb-1">Promotional Strategy</div>
                                            <div className="text-sm text-white bg-zinc-900 p-3 rounded border border-zinc-700">
                                                {selectedAffiliate.applicationData.strategy}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="commissionRate" className="text-zinc-300">
                                    Commission Rate (%)
                                </Label>
                                <Input
                                    id="commissionRate"
                                    type="number"
                                    value={customCommissionRate}
                                    onChange={(e) => setCustomCommissionRate(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700"
                                    min="0"
                                    max="100"
                                />
                                <div className="text-xs text-zinc-500">
                                    Recommended: 15% (standard), 18% (strong creator), 20% (50K+ audience)
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => rejectAffiliate()}
                            disabled={rejecting || approving}
                            className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                        >
                            {rejecting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Rejecting...
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={() => approveAffiliate()}
                            disabled={approving || rejecting || !customCommissionRate}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {approving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Approving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Approve at {customCommissionRate}%
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
