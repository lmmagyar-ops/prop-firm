"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

interface DevToolsProps {
    userId: string;
}

export function DevTools({ userId }: DevToolsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    if (process.env.NODE_ENV === "production") return null;

    const runAction = async (action: string) => {
        setLoading(true);
        try {
            const res = await fetch("/api/dev/actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, userId }) // Pass the specific User ID
            });
            if (!res.ok) throw new Error("Action failed");
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("DevTool Action Failed. Check console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className={`bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-4 transition-all absolute bottom-12 right-0 w-[260px] ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
                    <Wrench className="w-3 h-3" /> Dev Tools
                </h3>
                <div className="grid grid-cols-1 gap-2">
                    <Button variant="outline" size="sm" onClick={() => runAction("seed_pending")} disabled={loading} className="text-xs h-8 justify-start">
                        1. Seed Pending (Ready to Start)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => runAction("force_fail")} disabled={loading} className="text-xs h-8 justify-start">
                        2. Force Fail Active
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => runAction("force_pass")} disabled={loading} className="text-xs h-8 justify-start text-green-500 border-green-500/20">
                        3. Force Pass Active
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => runAction("force_win")} disabled={loading} className="text-xs h-8 text-green-400 bg-green-500/10">
                            + $200
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => runAction("force_loss")} disabled={loading} className="text-xs h-8 text-red-400 bg-red-500/10">
                            - $200
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => runAction("advance_day")} disabled={loading} className="text-xs h-8 justify-start text-blue-400 border-blue-500/20">
                        Advance Day (Reset Daily)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => runAction("reset")} disabled={loading} className="text-xs h-8 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border-red-500/20 justify-start">
                        Reset All (Fresh Start)
                    </Button>
                </div>
            </div>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 w-10 h-10 rounded-full flex items-center justify-center border border-zinc-700 shadow-lg transition-all ml-auto"
            >
                <Wrench className="w-5 h-5" />
            </button>
        </div>
    );
}
