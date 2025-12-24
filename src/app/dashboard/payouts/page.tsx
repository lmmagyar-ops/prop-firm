
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { PayoutRequestForm } from "@/components/dashboard/payouts/PayoutRequestForm";
import { AvailableBalanceCard } from "@/components/dashboard/payouts/AvailableBalanceCard";
import { PayoutHistoryTable } from "@/components/dashboard/payouts/PayoutHistoryTable";
import { getPayoutsHistory, getAvailableBalance } from "@/lib/payouts-actions";

export default async function PayoutsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/login');
        return null;
    }

    const [history, balance] = await Promise.all([
        getPayoutsHistory(),
        getAvailableBalance()
    ]);

    return (

        <div className="space-y-8">
            <h1 className="text-3xl font-bold mb-8">Payouts</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Payout Form */}
                <div className="lg:col-span-2">
                    <PayoutRequestForm availableBalance={balance.available + balance.breakout} />
                </div>

                {/* Right: Available Balance & Disclaimer */}
                <div className="space-y-6">
                    <AvailableBalanceCard
                        availableBalance={balance.available}
                        breakoutBalance={balance.breakout}
                    />

                    {/* Disclaimer */}
                    <Alert className="bg-yellow-900/10 border-yellow-600/20 p-4">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <div className="ml-2">
                            <AlertTitle className="text-yellow-500 font-bold mb-1">Important Disclaimer</AlertTitle>
                            <AlertDescription className="text-xs text-zinc-400 leading-relaxed">
                                By clicking "Request Payout" it automatically withdraws all your unlocked trading profits.
                                Please confirm your wallet address matches the network that you are requesting the funds are sent to.
                                Project X is not responsible for any lost funds due to incorrect wallets or incorrect selected networks.
                                <p className="mt-2 text-white font-medium">
                                    Please ensure that your wallet address accepts USDC on the selected network.
                                </p>
                            </AlertDescription>
                        </div>
                    </Alert>
                </div>
            </div>

            {/* Withdrawals History */}
            <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6">Withdrawals History</h2>
                <PayoutHistoryTable history={history} />
            </div>
        </div>
    );

}
