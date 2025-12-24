"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Rocket, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";

export default function DocsPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white/90">Documentation</h1>
                <p className="text-zinc-500">Operating manuals and strategic playbooks.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link href="/admin/docs/master">
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-indigo-500/50 transition-colors group cursor-pointer h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -z-10 transition-opacity opacity-50 group-hover:opacity-100" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
                                <BookOpen className="h-5 w-5" /> The Master Manual
                            </CardTitle>
                            <CardDescription>
                                Complete operating system documentation. Risk, Growth, Security & Analytics.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm text-zinc-500 group-hover:text-zinc-300">
                                Open Guide <ChevronRight className="h-4 w-4 ml-1" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
