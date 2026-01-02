"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Users,
    Search,
    Loader2,
    TrendingUp,
    TrendingDown,
    User,
    Crown,
    Skull,
    Target,
    ChevronRight,
    Activity,
    Wallet,
    Calendar,
    BarChart3,
    AlertCircle,
    CheckCircle2,
    XCircle,
    RefreshCw,
    RotateCcw,
    Trash2,
    MoreVertical,
    Mail,
    Shield,
    UserPlus,
    Eye,
    EyeOff,
    Ban,
    UserCheck,
    Zap
} from "lucide-react";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import Link from "next/link";

interface Challenge {
    id: string;
    status: string;
    phase: string;
    balance: string;
    platform: string;
    startedAt: string;
    pnl: number;
    tradeCount: number;
}

interface UserData {
    id: string;
    name: string;
    email: string;
    image: string | null;
    createdAt: string;
    isActive: boolean;
    role: string;
    challenges: Challenge[];
    totalChallenges: number;
    activeChallenges: number;
    passedChallenges: number;
    failedChallenges: number;
    totalPnL: number;
    totalTrades: number;
}

interface Summary {
    totalUsers: number;
    activeUsers: number;
    totalChallenges: number;
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

    // Create user modal state
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        role: "user"
    });
    const [showPassword, setShowPassword] = useState(false);
    const [creatingUser, setCreatingUser] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
                setSummary(data.summary || null);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [resettingChallengeId, setResettingChallengeId] = useState<string | null>(null);

    const resetChallenge = async (challengeId: string, userId: string) => {
        setResettingChallengeId(challengeId);
        try {
            const res = await fetch("/api/admin/reset-challenge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ challengeId }),
            });

            if (res.ok) {
                toast.success("Challenge reset successfully!");
                // Refresh user data
                await fetchUsers();
                // Update selected user if still selected
                if (selectedUser?.id === userId) {
                    const updatedUser = users.find(u => u.id === userId);
                    if (updatedUser) setSelectedUser(updatedUser);
                }
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to reset challenge");
            }
        } catch (error) {
            console.error("Reset challenge error:", error);
            toast.error("Failed to reset challenge");
        } finally {
            setResettingChallengeId(null);
        }
    };

    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

    const deleteUser = async (userId: string, userName: string) => {
        setDeletingUserId(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`User "${userName}" deleted successfully`);
                // Clear selection if deleted user was selected
                if (selectedUser?.id === userId) {
                    setSelectedUser(null);
                }
                // Refresh user data
                await fetchUsers();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete user");
            }
        } catch (error) {
            console.error("Delete user error:", error);
            toast.error("Failed to delete user");
        } finally {
            setDeletingUserId(null);
        }
    };

    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [updatingChallengeId, setUpdatingChallengeId] = useState<string | null>(null);

    const updateUser = async (userId: string, updates: { isActive?: boolean; role?: string }) => {
        setUpdatingUserId(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            if (res.ok) {
                const data = await res.json();
                if (updates.isActive !== undefined) {
                    toast.success(updates.isActive ? "User unbanned" : "User banned");
                } else if (updates.role) {
                    toast.success(`Role changed to ${updates.role}`);
                }
                // Fetch fresh user data
                const usersRes = await fetch("/api/admin/users");
                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    setUsers(usersData.users || []);
                    setSummary(usersData.summary || null);
                    // Update selected user with fresh data
                    if (selectedUser) {
                        const updatedUser = (usersData.users || []).find((u: UserData) => u.id === selectedUser.id);
                        if (updatedUser) setSelectedUser(updatedUser);
                    }
                }
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to update user");
            }
        } catch (error) {
            console.error("Update user error:", error);
            toast.error("Failed to update user");
        } finally {
            setUpdatingUserId(null);
        }
    };

    const updateChallenge = async (challengeId: string, updates: { status?: string; phase?: string }) => {
        setUpdatingChallengeId(challengeId);
        try {
            const res = await fetch(`/api/admin/challenges/${challengeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            if (res.ok) {
                if (updates.status) {
                    toast.success(`Challenge status set to ${updates.status}`);
                } else if (updates.phase) {
                    toast.success(`Challenge phase set to ${updates.phase}`);
                }
                await fetchUsers();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to update challenge");
            }
        } catch (error) {
            console.error("Update challenge error:", error);
            toast.error("Failed to update challenge");
        } finally {
            setUpdatingChallengeId(null);
        }
    };

    const createUser = async () => {
        setCreatingUser(true);
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createForm),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(`User "${data.user.name}" created successfully!`);
                setCreateModalOpen(false);
                setCreateForm({ email: "", firstName: "", lastName: "", password: "", role: "user" });
                await fetchUsers();
            } else {
                toast.error(data.error || "Failed to create user");
            }
        } catch (error) {
            console.error("Create user error:", error);
            toast.error("Failed to create user");
        } finally {
            setCreatingUser(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-green-400 border-green-500/20 bg-green-500/10';
            case 'passed': return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
            case 'failed': return 'text-red-400 border-red-500/20 bg-red-500/10';
            default: return 'text-zinc-400 border-zinc-500/20 bg-zinc-500/10';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <Activity className="h-3 w-3" />;
            case 'passed': return <CheckCircle2 className="h-3 w-3" />;
            case 'failed': return <XCircle className="h-3 w-3" />;
            default: return <AlertCircle className="h-3 w-3" />;
        }
    };

    const getUserTier = (user: UserData) => {
        if (user.totalPnL > 5000) return { label: 'WHALE', color: 'text-amber-400', icon: Crown };
        if (user.totalPnL > 1000) return { label: 'SNIPER', color: 'text-green-400', icon: TrendingUp };
        if (user.totalPnL < -1000) return { label: 'REKT', color: 'text-red-400', icon: Skull };
        return { label: 'TRADER', color: 'text-blue-400', icon: User };
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white/90">Users Management</h1>
                    <p className="text-zinc-500">Real-time trader data and challenge management</p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Create User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-zinc-700 sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="text-zinc-100">Create New User</DialogTitle>
                                <DialogDescription className="text-zinc-400">
                                    Create a new user account. They can log in immediately with these credentials.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="text-zinc-300">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="user@example.com"
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="firstName" className="text-zinc-300">First Name</Label>
                                        <Input
                                            id="firstName"
                                            placeholder="John"
                                            value={createForm.firstName}
                                            onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="lastName" className="text-zinc-300">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            placeholder="Doe"
                                            value={createForm.lastName}
                                            onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password" className="text-zinc-300">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Min 8 chars, 1 upper, 1 number"
                                            value={createForm.password}
                                            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="role" className="text-zinc-300">Role</Label>
                                    <Select
                                        value={createForm.role}
                                        onValueChange={(value) => setCreateForm({ ...createForm, role: value })}
                                    >
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700">
                                            <SelectItem value="user" className="text-zinc-200">User</SelectItem>
                                            <SelectItem value="admin" className="text-zinc-200">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                    onClick={createUser}
                                    disabled={creatingUser || !createForm.email || !createForm.firstName || !createForm.lastName || !createForm.password}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {creatingUser ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Create User
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchUsers}
                        disabled={loading}
                        className="border-zinc-700"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-zinc-900/40 border-white/5">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <Users className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white tabular-nums">{summary.totalUsers}</div>
                                    <div className="text-xs text-zinc-500">Total Users</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/40 border-white/5">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/10">
                                    <Activity className="h-5 w-5 text-green-400" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white tabular-nums">{summary.activeUsers}</div>
                                    <div className="text-xs text-zinc-500">Active Traders</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/40 border-white/5">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                    <BarChart3 className="h-5 w-5 text-purple-400" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white tabular-nums">{summary.totalChallenges}</div>
                                    <div className="text-xs text-zinc-500">Total Challenges</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                    placeholder="Search by name, email, or user ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-zinc-900/40 border-zinc-700"
                />
            </div>

            {/* Users List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </div>
            ) : filteredUsers.length === 0 ? (
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-zinc-300">No users found</h3>
                        <p className="text-sm text-zinc-500">
                            {searchQuery ? 'Try adjusting your search query' : 'No users have signed up yet'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Users List Panel */}
                    <div className="lg:col-span-2">
                        <Card className="bg-zinc-900/40 border-white/5 overflow-hidden">
                            <CardHeader className="border-b border-white/5 bg-white/5">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base text-zinc-200">Active Users</CardTitle>
                                    <span className="text-xs text-zinc-500">{filteredUsers.length} users</span>
                                </div>
                            </CardHeader>
                            <ScrollArea className="h-[600px]">
                                <div className="divide-y divide-white/5">
                                    {filteredUsers.map((user) => {
                                        const tier = getUserTier(user);
                                        const TierIcon = tier.icon;
                                        const latestChallenge = user.challenges[0];

                                        return (
                                            <div
                                                key={user.id}
                                                className={`p-4 hover:bg-white/5 cursor-pointer transition-colors ${selectedUser?.id === user.id ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : 'border-l-2 border-l-transparent'
                                                    }`}
                                                onClick={() => setSelectedUser(user)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {/* Avatar */}
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${user.totalPnL >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                            }`}>
                                                            {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                                                        </div>

                                                        {/* User Info */}
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`font-medium ${user.isActive ? 'text-zinc-200' : 'text-zinc-500 line-through'}`}>
                                                                    {user.name || 'Unknown User'}
                                                                </span>
                                                                {user.role === 'admin' && (
                                                                    <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/20 bg-purple-500/10">
                                                                        <Shield className="h-3 w-3 mr-1" />
                                                                        ADMIN
                                                                    </Badge>
                                                                )}
                                                                {!user.isActive && (
                                                                    <Badge variant="outline" className="text-[10px] text-red-400 border-red-500/20 bg-red-500/10">
                                                                        <Ban className="h-3 w-3 mr-1" />
                                                                        BANNED
                                                                    </Badge>
                                                                )}
                                                                <Badge variant="outline" className={`text-[10px] ${tier.color} border-current/20`}>
                                                                    <TierIcon className="h-3 w-3 mr-1" />
                                                                    {tier.label}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-xs text-zinc-500 font-mono">
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Stats */}
                                                    <div className="flex items-center gap-6 text-right">
                                                        <div>
                                                            <div className={`font-mono text-sm ${user.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {user.totalPnL >= 0 ? '+' : ''}${user.totalPnL.toFixed(2)}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-500">Total P&L</div>
                                                        </div>
                                                        <div>
                                                            <div className="font-mono text-sm text-zinc-200">{user.totalTrades}</div>
                                                            <div className="text-[10px] text-zinc-500">Trades</div>
                                                        </div>
                                                        <div>
                                                            {latestChallenge && (
                                                                <Badge variant="outline" className={`text-[10px] ${getStatusColor(latestChallenge.status)}`}>
                                                                    {getStatusIcon(latestChallenge.status)}
                                                                    <span className="ml-1">{latestChallenge.status}</span>
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <ChevronRight className="h-4 w-4 text-zinc-600" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>

                    {/* User Detail Panel */}
                    <div className="lg:col-span-1">
                        {selectedUser ? (
                            <Card className="bg-zinc-900/40 border-white/5 sticky top-4">
                                <CardHeader className="border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${selectedUser.totalPnL >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {selectedUser.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <CardTitle className={`text-lg ${selectedUser.isActive ? '' : 'text-zinc-500'}`}>
                                                    {selectedUser.name || 'Unknown'}
                                                </CardTitle>
                                                {selectedUser.role === 'admin' && (
                                                    <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/20 bg-purple-500/10">
                                                        ADMIN
                                                    </Badge>
                                                )}
                                                {!selectedUser.isActive && (
                                                    <Badge variant="outline" className="text-[10px] text-red-400 border-red-500/20 bg-red-500/10">
                                                        BANNED
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardDescription className="font-mono text-xs">{selectedUser.email}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    {/* Quick Stats */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-xs text-zinc-500 mb-1">Total P&L</div>
                                            <div className={`font-mono font-bold ${selectedUser.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {selectedUser.totalPnL >= 0 ? '+' : ''}${selectedUser.totalPnL.toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-xs text-zinc-500 mb-1">Total Trades</div>
                                            <div className="font-mono font-bold text-white">{selectedUser.totalTrades}</div>
                                        </div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-xs text-zinc-500 mb-1">Challenges</div>
                                            <div className="font-mono font-bold text-white">{selectedUser.totalChallenges}</div>
                                        </div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                                            <div className="text-xs text-zinc-500 mb-1">Pass Rate</div>
                                            <div className="font-mono font-bold text-white">
                                                {selectedUser.totalChallenges > 0
                                                    ? ((selectedUser.passedChallenges / selectedUser.totalChallenges) * 100).toFixed(0)
                                                    : 0}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Challenges List */}
                                    <div>
                                        <h4 className="text-sm font-medium text-zinc-300 mb-2">Challenges</h4>
                                        <div className="space-y-2">
                                            {selectedUser.challenges.map((challenge) => (
                                                <div
                                                    key={challenge.id}
                                                    className="p-3 bg-zinc-800/50 rounded-lg transition-colors"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Badge variant="outline" className={`text-[10px] ${getStatusColor(challenge.status)}`}>
                                                            {challenge.status}
                                                        </Badge>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-zinc-500">{challenge.platform}</span>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-200">
                                                                        <MoreVertical className="h-3 w-3" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
                                                                    <DropdownMenuLabel className="text-zinc-400 text-xs">Actions</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator className="bg-zinc-700" />
                                                                    <DropdownMenuItem asChild>
                                                                        <Link href={`/admin/traders/${challenge.id}`} className="cursor-pointer text-zinc-200">
                                                                            <Target className="h-3 w-3 mr-2" />
                                                                            View Details
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator className="bg-zinc-700" />
                                                                    <DropdownMenuLabel className="text-zinc-500 text-xs">Set Status</DropdownMenuLabel>
                                                                    <DropdownMenuItem
                                                                        onClick={() => updateChallenge(challenge.id, { status: 'active' })}
                                                                        disabled={updatingChallengeId === challenge.id}
                                                                        className="cursor-pointer text-green-400 focus:text-green-400 focus:bg-green-500/10"
                                                                    >
                                                                        <Activity className="h-3 w-3 mr-2" />
                                                                        Active
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => updateChallenge(challenge.id, { status: 'passed' })}
                                                                        disabled={updatingChallengeId === challenge.id}
                                                                        className="cursor-pointer text-amber-400 focus:text-amber-400 focus:bg-amber-500/10"
                                                                    >
                                                                        <CheckCircle2 className="h-3 w-3 mr-2" />
                                                                        Passed
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => updateChallenge(challenge.id, { status: 'failed' })}
                                                                        disabled={updatingChallengeId === challenge.id}
                                                                        className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10"
                                                                    >
                                                                        <XCircle className="h-3 w-3 mr-2" />
                                                                        Failed
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator className="bg-zinc-700" />
                                                                    <DropdownMenuLabel className="text-zinc-500 text-xs">Set Phase</DropdownMenuLabel>
                                                                    <DropdownMenuItem
                                                                        onClick={() => updateChallenge(challenge.id, { phase: 'challenge' })}
                                                                        disabled={updatingChallengeId === challenge.id}
                                                                        className="cursor-pointer text-blue-400 focus:text-blue-400 focus:bg-blue-500/10"
                                                                    >
                                                                        <Target className="h-3 w-3 mr-2" />
                                                                        Challenge
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => updateChallenge(challenge.id, { phase: 'verification' })}
                                                                        disabled={updatingChallengeId === challenge.id}
                                                                        className="cursor-pointer text-purple-400 focus:text-purple-400 focus:bg-purple-500/10"
                                                                    >
                                                                        <Shield className="h-3 w-3 mr-2" />
                                                                        Verification
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => updateChallenge(challenge.id, { phase: 'funded' })}
                                                                        disabled={updatingChallengeId === challenge.id}
                                                                        className="cursor-pointer text-emerald-400 focus:text-emerald-400 focus:bg-emerald-500/10"
                                                                    >
                                                                        <Zap className="h-3 w-3 mr-2" />
                                                                        Funded
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator className="bg-zinc-700" />
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <DropdownMenuItem
                                                                                onSelect={(e) => e.preventDefault()}
                                                                                className="cursor-pointer text-amber-400 focus:text-amber-400 focus:bg-amber-500/10"
                                                                            >
                                                                                <RotateCcw className="h-3 w-3 mr-2" />
                                                                                Reset Challenge
                                                                            </DropdownMenuItem>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle className="text-zinc-100">Reset Challenge?</AlertDialogTitle>
                                                                                <AlertDialogDescription className="text-zinc-400">
                                                                                    This will delete all trades and positions, reset the balance to ${parseFloat(challenge.balance).toFixed(2)}, and set the status back to &quot;active&quot;.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction
                                                                                    onClick={() => resetChallenge(challenge.id, selectedUser.id)}
                                                                                    disabled={resettingChallengeId === challenge.id}
                                                                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                                                                >
                                                                                    {resettingChallengeId === challenge.id ? (
                                                                                        <>
                                                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                                            Resetting...
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <RotateCcw className="h-4 w-4 mr-2" />
                                                                                            Reset Challenge
                                                                                        </>
                                                                                    )}
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-zinc-400">Balance</span>
                                                        <span className="font-mono text-white">${parseFloat(challenge.balance).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-zinc-400">P&L</span>
                                                        <span className={`font-mono ${challenge.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {challenge.pnl >= 0 ? '+' : ''}${challenge.pnl.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-zinc-400">Trades</span>
                                                        <span className="font-mono text-zinc-300">{challenge.tradeCount}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {selectedUser.challenges.length === 0 && (
                                                <div className="text-center py-4 text-zinc-500 text-sm">
                                                    No challenges yet
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-2 border-t border-white/5 space-y-2">
                                        {/* Role Change Button */}
                                        <Button
                                            variant="outline"
                                            onClick={() => updateUser(selectedUser.id, { role: selectedUser.role === 'admin' ? 'user' : 'admin' })}
                                            disabled={updatingUserId === selectedUser.id}
                                            className={`w-full ${selectedUser.role === 'admin'
                                                ? 'border-purple-500/20 text-purple-400 hover:bg-purple-500/10'
                                                : 'border-blue-500/20 text-blue-400 hover:bg-blue-500/10'}`}
                                        >
                                            {updatingUserId === selectedUser.id ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Updating...
                                                </>
                                            ) : selectedUser.role === 'admin' ? (
                                                <>
                                                    <User className="h-4 w-4 mr-2" />
                                                    Demote to User
                                                </>
                                            ) : (
                                                <>
                                                    <Shield className="h-4 w-4 mr-2" />
                                                    Promote to Admin
                                                </>
                                            )}
                                        </Button>

                                        {/* Ban/Unban Button */}
                                        <Button
                                            variant="outline"
                                            onClick={() => updateUser(selectedUser.id, { isActive: !selectedUser.isActive })}
                                            disabled={updatingUserId === selectedUser.id}
                                            className={`w-full ${selectedUser.isActive
                                                ? 'border-orange-500/20 text-orange-400 hover:bg-orange-500/10'
                                                : 'border-green-500/20 text-green-400 hover:bg-green-500/10'}`}
                                        >
                                            {updatingUserId === selectedUser.id ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Updating...
                                                </>
                                            ) : selectedUser.isActive ? (
                                                <>
                                                    <Ban className="h-4 w-4 mr-2" />
                                                    Ban User
                                                </>
                                            ) : (
                                                <>
                                                    <UserCheck className="h-4 w-4 mr-2" />
                                                    Unban User
                                                </>
                                            )}
                                        </Button>

                                        <Link
                                            href={selectedUser.challenges[0] ? `/admin/traders/${selectedUser.challenges[0].id}` : '#'}
                                            className="block"
                                        >
                                            <Button
                                                variant="outline"
                                                className="w-full border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
                                                disabled={!selectedUser.challenges[0]}
                                            >
                                                <Target className="h-4 w-4 mr-2" />
                                                View Full Profile
                                            </Button>
                                        </Link>

                                        {/* Danger Zone */}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10"
                                                    disabled={deletingUserId === selectedUser.id}
                                                >
                                                    {deletingUserId === selectedUser.id ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Deleting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete User
                                                        </>
                                                    )}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-red-400">Delete User Account?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-zinc-400">
                                                        This will permanently delete <strong className="text-zinc-200">{selectedUser.name || selectedUser.email}</strong> and all their data including:
                                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                                            <li>{selectedUser.totalChallenges} challenge(s)</li>
                                                            <li>{selectedUser.totalTrades} trade(s)</li>
                                                            <li>All positions and session data</li>
                                                        </ul>
                                                        <p className="mt-3 text-red-400 font-medium">This action cannot be undone.</p>
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteUser(selectedUser.id, selectedUser.name || selectedUser.email)}
                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Yes, Delete User
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="bg-zinc-900/40 border-white/5">
                                <CardContent className="py-12 text-center">
                                    <User className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-zinc-300">Select a User</h3>
                                    <p className="text-sm text-zinc-500">
                                        Click on a user to view their details
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
