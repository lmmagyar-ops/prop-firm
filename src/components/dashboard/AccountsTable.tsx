
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Eye,
    EyeOff,
    MoreVertical,
    Search,
    ExternalLink
} from "lucide-react";

interface Account {
    id: string;
    date: Date;
    accountNumber: string;
    accountType: string;
    status: string;
    isPublic?: boolean;
    showDropdown?: boolean;
}

interface AccountsTableProps {
    accounts: Account[];
    showVisibilityControls?: boolean;
    onToggleVisibility?: (accountId: string, field: 'dropdown' | 'profile') => void;
}

export function AccountsTable({
    accounts,
    showVisibilityControls = false,
    onToggleVisibility
}: AccountsTableProps) {
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const filteredAccounts = accounts.filter(acc => {
        if (filter === 'all') return true;
        if (filter === 'active') return acc.status === 'active' || acc.status === 'passed';
        return acc.status === 'failed' || acc.status === 'closed';
    });

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active': return 'bg-[#2E81FF]/10 text-[#2E81FF] border-[#2E81FF]/20 shadow-[0_0_10px_rgba(46,129,255,0.15)]';
            case 'passed': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
            case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-2 p-1 bg-zinc-900/50 border border-white/5 rounded-lg w-fit">
                {(['all', 'active', 'inactive'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                            filter === f
                                ? "bg-zinc-800 text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="border border-[#2E3A52] rounded-xl overflow-hidden bg-[#1A232E]">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#2E3A52] bg-[#242E42]">
                                <th className="px-6 py-4 text-left font-bold text-[10px] uppercase tracking-widest text-[#94A3B8]">Date</th>
                                <th className="px-6 py-4 text-left font-bold text-[10px] uppercase tracking-widest text-[#94A3B8]">Account Number</th>
                                <th className="px-6 py-4 text-left font-bold text-[10px] uppercase tracking-widest text-[#94A3B8]">Type</th>
                                <th className="px-6 py-4 text-left font-bold text-[10px] uppercase tracking-widest text-[#94A3B8]">Status</th>
                                {showVisibilityControls && (
                                    <>
                                        <th className="px-6 py-4 text-center font-bold text-[10px] uppercase tracking-widest text-[#94A3B8]">Public</th>
                                        <th className="px-6 py-4 text-center font-bold text-[10px] uppercase tracking-widest text-[#94A3B8]">Dropdown</th>
                                    </>
                                )}
                                <th className="px-6 py-4 text-right font-bold text-[10px] uppercase tracking-widest text-[#94A3B8]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2E3A52]">
                            {filteredAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan={showVisibilityControls ? 7 : 5} className="px-6 py-12 text-center text-[#94A3B8]">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="w-8 h-8 opacity-20" />
                                            <p>No accounts found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredAccounts.map((account) => (
                                    <tr key={account.id} className="group hover:bg-[#2E3A52]/30 transition-colors">
                                        <td className="px-6 py-5 text-[#94A3B8] whitespace-nowrap font-medium">
                                            {new Date(account.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 font-mono text-white whitespace-nowrap font-bold">
                                            {account.accountNumber}
                                        </td>
                                        <td className="px-6 py-5 text-white/90 whitespace-nowrap">
                                            {account.accountType}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm",
                                                getStatusColor(account.status)
                                            )}>
                                                {account.status}
                                            </span>
                                        </td>

                                        {showVisibilityControls && (
                                            <>
                                                <td className="px-6 py-5 text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onToggleVisibility?.(account.id, 'profile')}
                                                        className={cn(
                                                            "h-8 w-8 hover:bg-white/5",
                                                            account.isPublic ? "text-blue-400" : "text-[#58687D]"
                                                        )}
                                                    >
                                                        {account.isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                    </Button>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onToggleVisibility?.(account.id, 'dropdown')}
                                                        className={cn(
                                                            "h-8 w-8 hover:bg-white/5",
                                                            account.showDropdown ? "text-blue-400" : "text-[#58687D]"
                                                        )}
                                                    >
                                                        {account.showDropdown ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                    </Button>
                                                </td>
                                            </>
                                        )}

                                        <td className="px-6 py-5 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#58687D] hover:text-white">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-[#1A232E] border-[#2E3A52]">
                                                    <DropdownMenuItem className="text-zinc-300 focus:text-white focus:bg-white/10 cursor-pointer">
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
