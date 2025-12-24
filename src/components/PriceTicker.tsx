"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type MarketUpdate = {
    asset_id: string;
    price: string;
    size?: number;
    side?: string;
    timestamp?: number;
};

export function PriceTicker() {
    const [status, setStatus] = useState<"CONNECTING" | "CONNECTED" | "DISCONNECTED">("CONNECTING");
    const [messages, setMessages] = useState<any[]>([]);
    const [lastPrice, setLastPrice] = useState<string | null>(null);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:3001");

        ws.onopen = () => {
            setStatus("CONNECTED");
            console.log("Connected to WS Server");
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Handle Welcome
                if (data.type === "WELCOME") return;

                // Handle Price Updates (Polymarket format varies, simplified for demo)
                // Adjust based on actual payload from Ingestion Worker
                setMessages((prev) => [data, ...prev].slice(0, 10)); // Keep last 10

                if (data.price) {
                    setLastPrice(data.price);
                }
            } catch (err) {
                console.error("Error parsing WS message", err);
            }
        };

        ws.onclose = () => {
            setStatus("DISCONNECTED");
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <Card className="w-[400px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Live Market Feed</CardTitle>
                <Badge variant={status === "CONNECTED" ? "default" : "destructive"}>
                    {status}
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {lastPrice ? `$${Number(lastPrice).toFixed(2)}` : "Waiting for Trades..."}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                    Visualizing Ingestion &rarr; Redis &rarr; Client
                </p>

                <div className="space-y-2 max-h-[200px] overflow-y-auto text-xs font-mono bg-muted p-2 rounded">
                    {messages.map((msg, i) => (
                        <div key={i} className="truncate">
                            {JSON.stringify(msg)}
                        </div>
                    ))}
                    {messages.length === 0 && <div className="text-muted-foreground">No updates yet...</div>}
                </div>
            </CardContent>
        </Card>
    );
}
