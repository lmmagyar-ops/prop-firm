
import { cn } from "@/lib/utils";

interface PayoutHistoryTableProps {
    history: Array<{
        id: string;
        status: string;
        date: Date;
        amount: number;
        network: string;
        walletAddress: string;
    }>;
}

export function PayoutHistoryTable({ history }: PayoutHistoryTableProps) {
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'processing': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'failed': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
        }
    };

    return (

        <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-[#0E1217] border-b border-[#2E3A52]">
                        <tr>
                            <th className="p-4 text-left font-bold text-zinc-300">Status</th>
                            <th className="p-4 text-left font-bold text-zinc-300">Date</th>
                            <th className="p-4 text-left font-bold text-zinc-300">Amount</th>
                            <th className="p-4 text-left font-bold text-zinc-300">Network</th>
                            <th className="p-4 text-left font-bold text-zinc-300">Wallet Address</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2E3A52]">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-zinc-500">
                                    No payout history available
                                </td>
                            </tr>
                        ) : (
                            history.map((payout) => (
                                <tr key={payout.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(payout.status))}>
                                            {payout.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4 text-zinc-400">
                                        {new Date(payout.date).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 font-mono text-white font-bold">
                                        ${payout.amount.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-zinc-300">
                                        {payout.network}
                                    </td>
                                    <td className="p-4 font-mono text-zinc-500 text-xs">
                                        {payout.walletAddress}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
