
interface AvailableBalanceCardProps {
    availableBalance: number; // user's profit split portion
    breakoutBalance: number;  // gross profit (before split) — if different, shown as breakdown
}

export function AvailableBalanceCard({ availableBalance, breakoutBalance }: AvailableBalanceCardProps) {
    // Total withdrawable = user's split share of profit
    // breakoutBalance is the gross profit; display it only if it meaningfully differs
    const totalWithdrawable = availableBalance;
    const hasBreakout = breakoutBalance > 0 && Math.abs(breakoutBalance - availableBalance) > 0.01;

    return (
        <div className="space-y-6">
            {/* Available Amount Card */}
            <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6">
                <h3 className="text-sm text-zinc-500 uppercase mb-2">Available to Withdraw</h3>
                <p className="text-xs text-zinc-600 mb-4">Your profit split from funded account</p>
                <p className="text-4xl font-bold font-mono text-white">${totalWithdrawable.toFixed(2)}</p>

                {hasBreakout && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-xs text-zinc-500">
                        <span>Gross profit</span>
                        <span className="font-mono">${breakoutBalance.toFixed(2)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
