
import { cn } from "@/lib/utils";
import { ArrowUpRight, TrendingUp, Trophy, Wallet, BarChart2, DollarSign } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string;
    subValue?: string;
    icon: React.ReactNode;
    delay?: number;
}

function MetricCard({ title, value, subValue, icon, delay = 0 }: MetricCardProps) {
    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-2xl bg-[#1A232E] border border-[#2E3A52] p-6",
                "hover:border-zinc-600 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-300",
                "animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards"
            )}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    {icon}
                </div>
                {subValue && (
                    <span className="text-xs font-mono text-zinc-500 bg-zinc-900/80 px-2 py-1 rounded-full border border-white/5">
                        {subValue}
                    </span>
                )}
            </div>

            <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium">{title}</p>
                <p className="text-2xl font-mono font-bold text-white group-hover:text-blue-400 transition-colors">
                    {value}
                </p>
            </div>

            {/* Decorative gradient blob */}
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
        </div>
    );
}

interface ProfileMetricsGridProps {
    metrics: {
        lifetimeTradingVolume: number;
        fundedTradingVolume: number;
        currentWithdrawableProfit: number;
        highestWinRateAsset: string;
        tradingWinRate: number;
        lifetimeProfitWithdrawn: number;
    };
    isPublic?: boolean;
}

export function ProfileMetricsGrid({ metrics, isPublic = false }: ProfileMetricsGridProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    const formatPercent = (val: number) => `${val.toFixed(1)}%`;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard
                title="Lifetime Volume"
                value={formatCurrency(metrics.lifetimeTradingVolume)}
                icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
                delay={0}
            />

            <MetricCard
                title="Funded Volume"
                value={formatCurrency(metrics.fundedTradingVolume)}
                icon={<Trophy className="w-5 h-5 text-yellow-400" />}
                delay={100}
            />

            <MetricCard
                title="Withdrawable Profit"
                value={formatCurrency(metrics.currentWithdrawableProfit)}
                icon={<Wallet className="w-5 h-5 text-emerald-400" />}
                delay={200}
            />

            <MetricCard
                title="Best Asset"
                value={metrics.highestWinRateAsset}
                icon={<BarChart2 className="w-5 h-5 text-purple-400" />}
                delay={300}
            />

            <MetricCard
                title="Win Rate"
                value={formatPercent(metrics.tradingWinRate)}
                icon={<ArrowUpRight className="w-5 h-5 text-cyan-400" />}
                delay={400}
            />

            <MetricCard
                title="Total Withdrawn"
                value={formatCurrency(metrics.lifetimeProfitWithdrawn)}
                icon={<DollarSign className="w-5 h-5 text-green-400" />}
                delay={500}
            />
        </div>
    );
}
