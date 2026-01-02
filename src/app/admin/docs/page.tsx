"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Rocket, ChevronRight, BookOpen, Code2, Shield, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function DocsPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white/90">Documentation</h1>
                <p className="text-zinc-500">Operating manuals and strategic playbooks.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Master Manual - Business Operations */}
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

                {/* Engineering Manual - Technical Architecture */}
                <Link href="/admin/docs/engineering">
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 transition-colors group cursor-pointer h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -z-10 transition-opacity opacity-50 group-hover:opacity-100" />
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">v38.1</Badge>
                            </div>
                            <CardTitle className="flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
                                <Code2 className="h-5 w-5" /> Engineering Manual
                            </CardTitle>
                            <CardDescription>
                                Platform architecture, risk engine logic, and cross-provider integration patterns.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm text-zinc-500 group-hover:text-zinc-300">
                                Open Technical Docs <ChevronRight className="h-4 w-4 ml-1" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Growth Playbook */}
                <Link href="/admin/docs/growth">
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-purple-500/50 transition-colors group cursor-pointer h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl -z-10 transition-opacity opacity-50 group-hover:opacity-100" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                                <Rocket className="h-5 w-5" /> Growth Playbook
                            </CardTitle>
                            <CardDescription>
                                Marketing strategies, influencer ROI tracking, and user acquisition tactics.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm text-zinc-500 group-hover:text-zinc-300">
                                Open Playbook <ChevronRight className="h-4 w-4 ml-1" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Promotions Manual - Discount Codes & Affiliates */}
                <Link href="/admin/docs/promotions">
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-pink-500/50 transition-colors group cursor-pointer h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 blur-3xl -z-10 transition-opacity opacity-50 group-hover:opacity-100" />
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-400 border-pink-500/20">NEW</Badge>
                            </div>
                            <CardTitle className="flex items-center gap-2 group-hover:text-pink-400 transition-colors">
                                <DollarSign className="h-5 w-5" /> Promotions Manual
                            </CardTitle>
                            <CardDescription>
                                Discount codes, affiliate program, and fraud prevention strategies.
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
