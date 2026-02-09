"use client";

import { useEffect, useState } from "react";
import { Briefcase, TrendingUp, TrendingDown, ArrowRight, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Types matching our DB schema conceptually
interface Position {
    id: string;
    marketId: string;
    marketTitle: string;
    direction: "YES" | "NO";
    shares: number;
    avgPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
}

export function PortfolioDropdown() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(false); // Init false to avoid layout shift, fetch on mount
    const [closingId, setClosingId] = useState<string | null>(null);

    // Navigate to trade page with market
    const handleNavigateToMarket = (marketId: string) => {
        setIsOpen(false);
        router.push(`/dashboard/trade?market=${marketId}`);
    };

    // Close position handler
    const handleClosePosition = async (positionId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent dropdown from closing
        setClosingId(positionId);
        try {
            const response = await fetch(`/api/trade/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ positionId, idempotencyKey: crypto.randomUUID() }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to close position');
            }

            const result = await response.json();
            const pnl = result.pnl || 0;
            const pnlText = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
            if (pnl >= 0) {
                toast.success(`Position closed: ${pnlText} profit`);
            } else {
                toast.error(`Position closed: ${pnlText} loss`);
            }

            // Remove from local state
            setPositions(prev => prev.filter(p => p.id !== positionId));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to close position';
            toast.error(message);
        } finally {
            setClosingId(null);
        }
    };

    // Checking for recent update trigger (local storage or event)
    useEffect(() => {
        const fetchPositions = async () => {
            try {
                const res = await fetch("/api/trade/positions"); // Need to create this lightweight endpoint
                if (res.ok) {
                    const data = await res.json();
                    setPositions(data.positions);
                }
            } catch (e) {
                console.error("Failed to fetch positions", e);
            }
        };

        fetchPositions();
        // Poll every 5s for P&L updates
        const interval = setInterval(fetchPositions, 30000);
        return () => clearInterval(interval);
    }, []);

    const totalPnL = positions.reduce((acc, p) => acc + p.unrealizedPnL, 0);
    const positionCount = positions.length;

    return (
        <div className="relative group z-50">
            <button
                className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white transition-colors relative"
                onMouseEnter={() => setIsOpen(true)}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Briefcase className="w-5 h-5" />
                <span className="text-sm font-medium hidden md:block">Portfolio</span>

                {/* Badge */}
                <AnimatePresence>
                    {positionCount > 0 && (
                        <motion.span
                            key={positionCount} // Triggers animation on change
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                            className="absolute top-1 right-1 md:top-0 md:right-0 flex items-center justify-center w-4 h-4 bg-primary text-[10px] font-bold text-white rounded-full ring-2 ring-black shadow-[0_0_10px_rgba(41,175,115,0.5)]"
                        >
                            {positionCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
                        onMouseLeave={() => setIsOpen(false)}
                    >
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-white">Active Positions</h4>
                            <span className={cn("text-xs font-mono font-bold", totalPnL >= 0 ? "text-green-400" : "text-red-400")}>
                                {totalPnL >= 0 ? "+$" : "-$"}{Math.abs(totalPnL).toFixed(2)}
                            </span>
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                            {positionCount === 0 ? (
                                <div className="p-8 text-center text-zinc-500 text-sm">
                                    No active positions.
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800/50">
                                    {positions.map((pos) => (
                                        <div key={pos.id} className="p-3 hover:bg-zinc-800/50 transition-colors group/item relative cursor-pointer" onClick={() => handleNavigateToMarket(pos.marketId)}>
                                            {/* Close button - visible on hover */}
                                            <button
                                                onClick={(e) => handleClosePosition(pos.id, e)}
                                                disabled={closingId === pos.id}
                                                className="absolute top-2 right-2 p-1 rounded-full bg-zinc-800 text-zinc-500 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all"
                                                title="Close position"
                                            >
                                                {closingId === pos.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <X className="w-3 h-3" />
                                                )}
                                            </button>
                                            <div className="flex justify-between items-start mb-1 pr-6">
                                                <span className="text-xs font-medium text-white line-clamp-1 flex-1 pr-2">
                                                    {pos.marketTitle}
                                                </span>
                                                <span className={cn("text-xs font-mono", pos.unrealizedPnL >= 0 ? "text-green-400" : "text-red-400")}>
                                                    {pos.unrealizedPnL >= 0 ? "+$" : "-$"}{Math.abs(pos.unrealizedPnL).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                                <div className="flex gap-2">
                                                    <span className={cn("uppercase font-bold", pos.direction === "YES" ? "text-green-500" : "text-red-500")}>
                                                        {pos.direction}
                                                    </span>
                                                    <span>{pos.shares} shares</span>
                                                </div>
                                                <div>
                                                    {((pos.currentPrice - pos.avgPrice) / pos.avgPrice * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-2 bg-zinc-950/30">
                            <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                                <Button variant="ghost" className="w-full text-xs h-8 text-zinc-400 hover:text-white justify-between px-2">
                                    Go to Dashboard
                                    <ArrowRight className="w-3 h-3" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
