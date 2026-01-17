"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, RefreshCw, TrendingUp, Users, DollarSign, Activity, Search, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import cloneDeep from "lodash/cloneDeep";
import { exportToCSV } from "@/lib/export-csv";

import { LiveTraderFeed } from "@/components/admin/LiveTraderFeed";
import { RiskMatrix } from "@/components/admin/RiskMatrix";
import { SystemStatusHeader } from "@/components/admin/SystemStatusHeader";
import { SystemHeartbeat } from "@/components/admin/SystemHeartbeat";
import { RevenueOdometer } from "@/components/admin/RevenueOdometer";
import { GeoSpatialMap } from "@/components/admin/GeoSpatialMap";
import { AdminQuickActions } from "@/components/admin/AdminQuickActions";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/StatusBadge";

// --- Types ---

interface AnalyticsData {
    revenue: { total: number; daily: number[]; trend: string };
    activeUsers: { total: number; funded: number; challenge: number; verification: number };
    passRate: { value: number; trend: string };
    payouts: { pending: number; nextScheduled: string };
}

interface TraderChallenge {
    challengeId: string;
    userName: string;
    email: string;
    status: string;
    phase: number;
    balance: string; // Comes as string from decimal column
    startDate: string;
}

interface RuleSet {
    [key: string]: unknown;
    _meta?: {
        description: string;
        version: number;
        updatedAt: string;
    };
}

// --- Main Component ---

export default function AdminDashboard() {
    return (
        <div className="space-y-8">
            <div className="relative z-10 max-w-7xl mx-auto space-y-6">
                <SystemStatusHeader />

                {/* Quick Actions Panel - Most Used Operations */}
                <AdminQuickActions />

                {/* System Heartbeat and Revenue Ticker */}
                <div className="flex flex-col md:flex-row gap-4">
                    <SystemHeartbeat />
                    <RevenueOdometer />
                </div>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white/90">Mission Control</h1>
                        <p className="text-zinc-500">Global observation and command center.</p>
                    </div>
                </div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <OverviewTab />
            </div>
        </div>
    );
}

// --- Sub-Components ---

function OverviewTab() {
    const [stats, setStats] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/admin/analytics");
                if (!res.ok) throw new Error("Failed to fetch analytics");
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load dashboard metrics");
                toast.error("Failed to load dashboard metrics");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-center text-zinc-500 flex justify-center"><Loader2 className="animate-spin mr-2" /> Loading metrics...</div>;
    if (error || !stats) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

    // Generate Mock Trend Data for Sparklines
    const mockTrendData = Array.from({ length: 20 }, (_, i) => ({ val: Math.random() * 100 + 50 + (i * 2) }));

    const totalUsers = stats.activeUsers.total || 1; // Prevent div by zero

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Revenue"
                    value={`$${stats.revenue.total.toLocaleString()}`}
                    icon={DollarSign}
                    trend={stats.revenue.trend}
                    data={mockTrendData}
                    checkColor="#34d399" // Emerald 400
                />
                <MetricCard
                    title="Active Traders"
                    value={stats.activeUsers.total}
                    icon={Users}
                    sub={`Funded: ${stats.activeUsers.funded}`}
                    data={mockTrendData.map(d => ({ val: d.val * 0.5 }))}
                    checkColor="#60a5fa" // Blue 400
                />
                <MetricCard
                    title="Pass Rate"
                    value={`${stats.passRate.value}%`}
                    icon={TrendingUp}
                    trend={stats.passRate.trend}
                    data={mockTrendData.reverse()}
                    checkColor="#fbbf24" // Amber 400
                />
                <MetricCard
                    title="Pending Payouts"
                    value={`$${stats.payouts.pending.toLocaleString()}`}
                    icon={Activity}
                    sub={`Next: ${stats.payouts.nextScheduled}`}
                    data={mockTrendData}
                    checkColor="#a78bfa" // Violet 400
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <div className="md:col-span-2 lg:col-span-4 space-y-6">
                    {/* 3D Geo-Spatial Map */}
                    <GeoSpatialMap />

                    <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden h-[400px]">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium tracking-wide text-zinc-200">Revenue Overview</CardTitle>
                            <CardDescription className="text-zinc-500">Daily processed volume</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-0 pb-0">
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.revenue.daily.map((val, i) => ({ name: `Day ${i + 1}`, total: val }))} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} dx={-10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            itemStyle={{ color: '#fff' }}
                                            labelStyle={{ color: '#a1a1aa' }}
                                        />
                                        <Area type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                    <LiveTraderFeed />
                </div>

                <div className="col-span-3 space-y-6">
                    <RiskMatrix />
                    <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium text-zinc-200">User Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Funnel Stage 1: Challenge */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Challenge (Phase 1)</span>
                                    <span className="text-white font-mono">{stats.activeUsers.challenge}</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${(stats.activeUsers.challenge / totalUsers) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Funnel Stage 2: Verification */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Verification (Phase 2)</span>
                                    <span className="text-white font-mono">{stats.activeUsers.verification}</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 rounded-full"
                                        style={{ width: `${(stats.activeUsers.verification / totalUsers) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Funnel Stage 3: Funded */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-400 font-medium">Funded Traders</span>
                                    <span className="text-green-400 font-mono font-bold animate-pulse">{stats.activeUsers.funded}</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                                        style={{ width: `${(stats.activeUsers.funded / totalUsers) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon: Icon, trend, sub, data, checkColor = "#22c55e" }: { title: string; value: string | number; icon: React.ElementType; trend?: string; sub?: string; data?: any[]; checkColor?: string }) {
    return (
        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md relative overflow-hidden group hover:border-white/10 transition-all duration-500 shadow-lg hover:shadow-indigo-500/10">
            {/* Gloss Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Sparkline Background */}
            {data && (
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={checkColor} stopOpacity={0.5} />
                                    <stop offset="100%" stopColor={checkColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="val" stroke={checkColor} strokeWidth={2} fill={`url(#grad-${title})`} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="relative z-10 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-zinc-400 tracking-wide">{title}</p>
                    <div className={`p-2 rounded-full bg-[${checkColor}]/10 ring-1 ring-inset ring-[${checkColor}]/20`}>
                        <Icon className="h-4 w-4" style={{ color: checkColor }} />
                    </div>
                </div>

                <div className="space-y-1">
                    <h3 className="text-3xl font-light font-sans tracking-tight text-white tabular-nums">{value}</h3>
                    {(trend || sub) && (
                        <div className="flex items-center gap-2">
                            {trend ? (
                                <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1">
                                    + {trend}
                                </span>
                            ) : (
                                <span className="text-xs text-zinc-500">{sub}</span>
                            )}
                            {trend && <span className="text-xs text-zinc-600">vs last month</span>}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}

function TradersTab() {
    const [challenges, setChallenges] = useState<TraderChallenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchChallenges = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/challenges");
            if (!res.ok) throw new Error("Failed to fetch challenges");
            const data = await res.json();
            if (data.challenges) setChallenges(data.challenges);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch traders list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchChallenges(); }, []);

    const handleAction = async (challengeId: string, action: "FAIL" | "PASS") => {
        const loadingToast = toast.loading(`Processing ${action}...`);
        try {
            const res = await fetch("/api/admin/actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ challengeId, action })
            });
            if (!res.ok) throw new Error("Action failed");
            toast.success(`Trader ${action === "PASS" ? "Passed" : "Failed"} successfully`);
            fetchChallenges();
        } catch (error) {
            console.error(error);
            toast.error(`Failed to ${action} trader`);
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredChallenges.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredChallenges.map(c => c.challengeId)));
        }
    };

    const handleBulkAction = async (action: "PASS" | "FAIL") => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to ${action} ${selectedIds.size} traders?`)) return;

        const loadingToast = toast.loading(`Bulk ${action} in progress...`);
        try {
            // Process sequentially or parallel - for now, simple loop
            const promises = Array.from(selectedIds).map(id =>
                fetch("/api/admin/actions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ challengeId: id, action })
                })
            );
            await Promise.all(promises);
            toast.success(`Bulk ${action} complete`);
            setSelectedIds(new Set());
            fetchChallenges();
        } catch (e) {
            toast.error("Some bulk actions failed");
        } finally {
            toast.dismiss(loadingToast);
        }
    };


    // Filter Logic
    const filteredChallenges = challenges.filter(c => {
        const matchesSearch = c.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "ALL" ? true : c.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    const handleExport = () => {
        const dataToExport = filteredChallenges.map(({ challengeId, userName, email, balance, status, startDate }) => ({
            Subscriber: userName,
            Email: email,
            Balance: balance,
            Status: status,
            Date: new Date(startDate).toLocaleDateString()
        }));
        exportToCSV(dataToExport, "traders_list");
        toast.success("Traders list exported");
    };

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={filteredChallenges.length > 0 && selectedIds.size === filteredChallenges.length}
                        onCheckedChange={toggleSelectAll}
                    />
                    <CardTitle>Active Challenges</CardTitle>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-right-4">
                            <Badge variant="secondary">{selectedIds.size} Selected</Badge>
                            <Button size="sm" variant="destructive" onClick={() => handleBulkAction("FAIL")}>Fail All</Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleBulkAction("PASS")}>Pass All</Button>
                        </div>
                    )}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search traders..."
                            className="pl-8 w-[200px] h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="passed">Passed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleExport} className="h-9">
                        <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchChallenges} disabled={loading} className="h-9 w-9 p-0">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8 text-zinc-500"><Loader2 className="animate-spin inline mr-2" /> Loading traders...</div>
                ) : filteredChallenges.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">No traders found matching your filters.</div>
                ) : (
                    <div className="space-y-4">
                        {filteredChallenges.map((c) => (
                            <div key={c.challengeId} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black/40 p-4 rounded border ${selectedIds.has(c.challengeId) ? 'border-blue-500/50 bg-blue-500/10' : 'border-zinc-800'} gap-4 transition-colors`}>
                                <div className="flex items-center gap-4">
                                    <Checkbox
                                        checked={selectedIds.has(c.challengeId)}
                                        onCheckedChange={() => toggleSelect(c.challengeId)}
                                    />
                                    <div>
                                        <div className="font-bold">{c.userName}</div>
                                        <div className="text-xs text-zinc-500">{c.email}</div>
                                        <div className="md:hidden mt-2">
                                            <StatusBadge status={c.status} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                    <div className="text-right">
                                        <div className="text-xs text-zinc-500">Equity</div>
                                        <div className="font-mono font-bold">${parseFloat(c.balance).toFixed(2)}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={`/admin/traders/${c.challengeId}`}>
                                            <Button size="sm" variant="outline">View</Button>
                                        </Link>
                                        {c.status === 'active' && (
                                            <>
                                                <Button size="sm" variant="destructive" onClick={() => handleAction(c.challengeId, "FAIL")}>Fail</Button>
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(c.challengeId, "PASS")}>Pass</Button>
                                            </>
                                        )}
                                        {c.status !== 'active' && (
                                            <StatusBadge status={c.status} className="px-3" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ConfigurationTab() {
    const [rules, setRules] = useState<Record<string, RuleSet> | null>(null);
    const [activeKey, setActiveKey] = useState("challenge_config");
    const [subTab, setSubTab] = useState("10k"); // For Challenge Tiers
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchRules = async () => {
            try {
                const res = await fetch("/api/admin/rules");
                if (!res.ok) throw new Error("Failed to fetch rules");
                const data = await res.json();
                if (data.rules) {
                    setRules(data.rules);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load configuration");
            }
        };
        fetchRules();
    }, []);

    const handleUpdate = (section: string, field: string, value: any) => {
        setRules((prev) => {
            if (!prev) return null;
            const newRules: any = cloneDeep(prev); // Deep copy for safety

            if (activeKey === "challenge_config") {
                if (newRules[activeKey][section]) {
                    newRules[activeKey][section][field] = value;
                }
            } else {
                newRules[activeKey][field] = value;
            }
            return newRules;
        });
    };

    const handleSave = async () => {
        if (!rules) return;
        setSaving(true);
        const loadingToast = toast.loading("Saving changes...");

        try {
            // Strip _meta before saving
            const { _meta, ...cleanValue } = rules[activeKey];

            const res = await fetch("/api/admin/rules", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: activeKey, value: cleanValue })
            });

            if (!res.ok) throw new Error("Save failed");

            toast.success("Configuration saved successfully");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save changes");
        } finally {
            toast.dismiss(loadingToast);
            setSaving(false);
        }
    };

    if (!rules) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin mr-2" /> Loading config...</div>;

    const activeRuleSet = rules[activeKey];
    // Remove _meta for iteration
    const { _meta, ...dataContent } = activeRuleSet || {};
    const isChallenge = activeKey === "challenge_config";

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[600px]">
            {/* Sidebar */}
            <Card className="bg-zinc-900 border-zinc-800 col-span-1 h-full">
                <CardHeader><CardTitle className="text-lg">Rule Sets</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {Object.keys(rules).map(key => (
                        <Button
                            key={key}
                            variant={activeKey === key ? "default" : "secondary"}
                            className={`w-full justify-start ${activeKey === key ? 'bg-zinc-100 text-black hover:bg-white' : 'bg-transparent hover:bg-zinc-800 text-zinc-400'}`}
                            onClick={() => setActiveKey(key)}
                        >
                            {key.replace("_", " ").toUpperCase()}
                        </Button>
                    ))}
                </CardContent>
            </Card>

            {/* Main Editor */}
            <Card className="bg-zinc-900 border-zinc-800 col-span-3 h-full flex flex-col">
                <CardHeader className="flex flex-row justify-between items-center border-b border-zinc-800 py-4">
                    <div>
                        <CardTitle className="text-xl capitalize">{activeKey.replace("_", " ")}</CardTitle>
                        <CardDescription>{_meta?.description}</CardDescription>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full p-6">
                        {isChallenge ? (
                            <Tabs defaultValue={Object.keys(dataContent)[0]} onValueChange={setSubTab}>
                                <TabsList className="mb-4 bg-zinc-800">
                                    {Object.keys(dataContent).map(tier => (
                                        <TabsTrigger key={tier} value={tier} className="uppercase">{tier}</TabsTrigger>
                                    ))}
                                </TabsList>
                                {Object.entries(dataContent).map(([tier, fields]: any) => (
                                    <TabsContent key={tier} value={tier} className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <ConfigField
                                                label="Challenge Fee ($)"
                                                value={fields.challenge_fees}
                                                onChange={(v) => handleUpdate(tier, "challenge_fees", v)}
                                                type="number"
                                            />
                                            <ConfigField
                                                label="Duration (Days)"
                                                value={fields.duration_days}
                                                onChange={(v) => handleUpdate(tier, "duration_days", v)}
                                                type="number"
                                            />
                                            <ConfigField
                                                label="Profit Target (%)"
                                                value={fields.profit_target_percent}
                                                onChange={(v) => handleUpdate(tier, "profit_target_percent", v)}
                                                type="percent"
                                            />
                                            <ConfigField
                                                label="Max Drawdown (%)"
                                                value={fields.max_drawdown_percent}
                                                onChange={(v) => handleUpdate(tier, "max_drawdown_percent", v)}
                                                type="percent"
                                            />
                                            <ConfigField
                                                label="Profit Split (Trader %)"
                                                value={fields.profit_split}
                                                onChange={(v) => handleUpdate(tier, "profit_split", v)}
                                                type="percent"
                                            />
                                            <div className="space-y-2">
                                                <Label>Payout Frequency</Label>
                                                <Select
                                                    value={fields.payout_frequency}
                                                    onValueChange={(v) => handleUpdate(tier, "payout_frequency", v)}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Weekly">Weekly</SelectItem>
                                                        <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                                                        <SelectItem value="Monthly">Monthly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        ) : (
                            <div className="grid grid-cols-2 gap-6">
                                <ConfigField
                                    label="Max Position Size (%)"
                                    value={dataContent.max_position_size_percent as number}
                                    onChange={(v) => handleUpdate("", "max_position_size_percent", v)}
                                    type="percent"
                                />
                                <ConfigField
                                    label="Min Liquidity ($)"
                                    value={dataContent.min_liquidity_usd as number}
                                    onChange={(v) => handleUpdate("", "min_liquidity_usd", v)}
                                    type="number"
                                />
                                <div className="col-span-2 space-y-2">
                                    <Label>Prohibited Categories</Label>
                                    <Input
                                        value={Array.isArray(dataContent.prohibited_categories) ? dataContent.prohibited_categories.join(", ") : ""}
                                        onChange={(e) => handleUpdate("", "prohibited_categories", e.target.value.split(",").map((s: string) => s.trim()))}
                                        placeholder="Politics, Crypto, etc."
                                    />
                                    <p className="text-xs text-zinc-500">Comma separated</p>
                                </div>
                                <div className="flex items-center justify-between col-span-2 bg-zinc-800 p-4 rounded">
                                    <div className="space-y-0.5">
                                        <Label>Enforce Blackout Period</Label>
                                        <p className="text-xs text-zinc-500">Prevent trading before challenge end</p>
                                    </div>
                                    <Switch
                                        checked={(dataContent.trading_blackout_days_before_end as number) > 0}
                                        onCheckedChange={(c) => handleUpdate("", "trading_blackout_days_before_end", c ? 2 : 0)}
                                    />
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

function ConfigField({ label, value, onChange, type = "number" }: { label: string; value: number; onChange: (v: number) => void; type?: "number" | "percent" }) {
    const isPercent = type === "percent";
    const displayValue = isPercent ? Math.round(value * 100) : value;

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="relative">
                <Input
                    type="number"
                    value={displayValue}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                            onChange(isPercent ? val / 100 : val);
                        }
                    }}
                    className="pr-8"
                />
                {isPercent && <span className="absolute right-3 top-2.5 text-zinc-500 text-sm">%</span>}
            </div>
        </div>
    )
}
