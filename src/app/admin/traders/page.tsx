"use client";

import { useState } from "react";
import { TraderList, Trader } from "@/components/admin/traders/TraderList";
import { TraderDNA } from "@/components/admin/traders/TraderDNA";
import { MousePointerClick } from "lucide-react";

export default function TradersPage() {
    const [selected, setSelected] = useState<Trader | null>(null);

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white/90">Traders Desk</h1>
                <p className="text-zinc-500">Risk classification and behavioral DNA profiling.</p>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
                {/* List Section */}
                <div className="col-span-12 md:col-span-7 h-full flex flex-col">
                    <TraderList onSelect={setSelected} selectedId={selected?.id || null} />
                </div>

                {/* Analysis Section */}
                <div className="col-span-12 md:col-span-5 h-full">
                    {selected ? (
                        <div className="h-full">
                            <TraderDNA profileType={selected.style} />
                        </div>
                    ) : (
                        <div className="h-full min-h-[500px] border border-white/5 border-dashed rounded-xl bg-zinc-900/20 backdrop-blur-sm flex flex-col items-center justify-center text-zinc-500 gap-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-grid-white/[0.02] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
                            <div className="p-6 bg-zinc-900/50 rounded-full border border-white/10 shadow-2xl relative z-10 group">
                                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all duration-500" />
                                <MousePointerClick className="h-10 w-10 text-zinc-400 relative z-10" />
                            </div>
                            <div className="text-center relative z-10 space-y-2">
                                <h3 className="text-zinc-300 font-medium">System Ready</h3>
                                <p className="text-sm text-zinc-500 max-w-[200px] mx-auto">Select a trader entity from the list to initialize biometric DNA scan.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
