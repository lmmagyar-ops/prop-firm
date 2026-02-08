
interface AvailableBalanceCardProps {
    availableBalance: number;
    breakoutBalance: number;
}

export function AvailableBalanceCard({ availableBalance, breakoutBalance }: AvailableBalanceCardProps) {
    return (
        <div className="space-y-6">
            {/* Available Amount Card */}
            <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6">
                <h3 className="text-sm text-zinc-500 uppercase mb-2">Available Amount</h3>
                <p className="text-xs text-zinc-600 mb-4">Predictions Firm Profit available</p>
                <p className="text-4xl font-bold font-mono text-white">${availableBalance.toFixed(2)}</p>
            </div>

            {/* Breakout Payout Display (if separate) 
          Plan shows a toggle card on the left side, but also this card which might show breakout balance? 
          Actually the plan shows two cards in the form section for selection. 
          This card is purely information on the right sidebar. 
      */}
        </div>
    );
}
