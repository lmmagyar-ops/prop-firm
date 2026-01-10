import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TradeHistoryTable } from "@/components/dashboard/TradeHistoryTable";

export const dynamic = "force-dynamic";

export default async function TradeHistoryPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Trade History</h1>
                    <p className="text-zinc-500 text-sm mt-1">All your trades across active and past challenges</p>
                </div>
            </div>

            <TradeHistoryTable />
        </div>
    );
}
