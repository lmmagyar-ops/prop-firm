"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, TrendingUp, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

interface NewsItem {
    id: number;
    time: string;
    headline: string;
    impact: "HIGH" | "MEDIUM" | "LOW";
    type: "POLITICS" | "CRYPTO" | "MACRO";
}

const MOCK_NEWS: NewsItem[] = [
    { id: 1, time: "Just now", headline: "BREAKING: Trump announces surprise press conference for 8 PM EST.", impact: "HIGH", type: "POLITICS" },
    { id: 2, time: "2m ago", headline: "Bitcoin breaks $98k resistance on institutional volume pivot.", impact: "MEDIUM", type: "CRYPTO" },
    { id: 3, time: "5m ago", headline: "Fed Whisperer Nick Timiraos hints at 'aggressive' rate cut strategy.", impact: "HIGH", type: "MACRO" },
    { id: 4, time: "12m ago", headline: "Prediction Market Whale 'GigaChad' buys $200k YES on California.", impact: "LOW", type: "POLITICS" },
    { id: 5, time: "15m ago", headline: "Global liquidity index spikes to 3-month high.", impact: "MEDIUM", type: "MACRO" },
];

export function NewsFeed() {
    const [news, setNews] = useState(MOCK_NEWS);

    // Simulate "Live" updates by cycling news
    useEffect(() => {
        const interval = setInterval(() => {
            setNews(prev => {
                const rotated = [...prev];
                const first = rotated.shift();
                if (first) rotated.push(first);
                return rotated; // Simple cycle for demo
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="bg-black/40 border-zinc-800 backdrop-blur-sm h-full flex flex-col">
            <CardHeader className="pb-2 border-b border-zinc-900/50">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" /> Live Terminal Feed
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-[200px] md:h-[300px]">
                    <div className="flex flex-col">
                        {news.map((item) => (
                            <div key={item.id} className="p-4 border-b border-zinc-900/50 hover:bg-zinc-900/50 transition-colors cursor-pointer group">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-mono text-zinc-500">{item.time}</span>
                                    {item.impact === 'HIGH' && (
                                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 bg-red-900/50 text-red-500 border-red-900 mx-0">IMPACT</Badge>
                                    )}
                                </div>
                                <p className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors leading-relaxed">
                                    {item.headline}
                                </p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
