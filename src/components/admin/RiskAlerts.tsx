"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RiskAlert {
    type: string;
    severity: "high" | "medium" | "low";
    traderName: string;
    message: string;
    challengeId: string;
}

export function RiskAlerts() {
    const [alerts, setAlerts] = useState<RiskAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await fetch("/api/admin/risk-alerts");
                if (res.ok) {
                    const data = await res.json();
                    if (data.alerts) setAlerts(data.alerts);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return null;

    return (
        <Card className="bg-zinc-900 border-zinc-800 h-full">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldAlert className="h-4 w-4 text-orange-500" />
                    Risk Monitor
                    {alerts.length > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs">
                            {alerts.length} Issues
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[250px]">
                    {alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-zinc-500 gap-2">
                            <CheckCircle2 className="h-8 w-8 text-green-500/50" />
                            <p className="text-sm">All systems normal</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800">
                            {alerts.map((alert, i) => (
                                <div key={i} className="p-3 hover:bg-zinc-800/50 flex items-start gap-3">
                                    <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${alert.severity === 'high' ? 'text-red-500' : 'text-yellow-500'
                                        }`} />
                                    <div>
                                        <div className="text-sm font-semibold">{alert.traderName}</div>
                                        <div className="text-xs text-zinc-400 leading-snug">{alert.message}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
