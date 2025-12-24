"use client";

interface ProbabilityLineChartProps {
    currentPrice: number;
    outcome: "YES" | "NO";
}

export function ProbabilityLineChart({ currentPrice, outcome }: ProbabilityLineChartProps) {
    // Determine gradient colors based on outcome
    const isYes = outcome === "YES";
    const color = isYes ? "#10B981" : "#ef4444"; // Emerald or Red

    return (
        <div className="w-full h-full flex flex-col">
            {/* Header / Stats Overlay */}
            <div className="flex items-center justify-between mb-4 z-10">
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white font-mono">
                        {(currentPrice * 100).toFixed(1)}%
                    </span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${isYes ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                        {outcome} Chance
                    </span>
                </div>

                <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                    {["1H", "1D", "1W", "1M", "ALL"].map((tf) => (
                        <button
                            key={tf}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${tf === "1D"
                                ? "bg-zinc-800 text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Simulated Chart Visual (Until we integrate Recharts/Lightweight-charts proper) */}
            <div className="flex-1 relative w-full bg-gradient-to-t from-emerald-500/5 to-transparent rounded-lg border-b border-emerald-500/20">
                {/* This SVG mimics a real probability curve for the visual prototype */}
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* The Line */}
                    <path
                        d="M0,80 C100,75 200,85 300,50 C400,20 500,40 600,30 C700,20 800,10 1000,35"
                        fill="url(#chartGradient)"
                        stroke={color}
                        strokeWidth="3"
                        vectorEffect="non-scaling-stroke"
                    />

                    {/* The Cursor Line (Simulated) */}
                    <line x1="100%" y1="0" x2="100%" y2="100%" stroke={color} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

                    {/* Current Price Dot */}
                    <circle cx="100%" cy="35%" r="6" fill={color} stroke="#000" strokeWidth="2" />
                </svg>

                {/* 50% Reference Line */}
                <div className="absolute top-1/2 left-0 right-0 border-t border-zinc-800 border-dashed" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 font-mono pr-2">50%</div>
            </div>

            <div className="flex justify-between mt-2 text-xs text-zinc-600 font-mono uppercase">
                <span>12:00 PM</span>
                <span>4:00 PM</span>
                <span>8:00 PM</span>
                <span>Now</span>
            </div>
        </div>
    );
}
