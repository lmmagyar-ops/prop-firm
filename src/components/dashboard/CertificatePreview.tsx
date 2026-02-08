
"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, Share2, Wifi } from "lucide-react";
import { useState } from "react";
import { SocialShareModal } from "./SocialShareModal";

interface CertificatePreviewProps {
    type: string;
    userName: string;
    amount: number;
    date: Date;
    signature?: string;
    certificateId: string;
}

export function CertificatePreview({
    type,
    userName,
    amount,
    date,
    signature,
    certificateId,
}: CertificatePreviewProps) {
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Determine label based on type
    const typeLabel = type === 'lifetime-payouts' ? 'LIFETIME PAYOUTS' : 'ACHIEVEMENT';

    // Use a constructed URL for the modal (dummy for now until API exists)
    const certificateUrl = `/api/certificates/${certificateId}/og-image`;

    return (
        <>
            <motion.div
                className="relative w-full aspect-[1.586/1] max-w-2xl rounded-3xl overflow-hidden shadow-2xl group perspective-1000"
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* 1. Base Layer (Deep Metal/Black) */}
                <div className="absolute inset-0 bg-[#0B0E14]">
                    {/* Noise Texture */}
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

                    {/* Radial Mesh Gradient */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(46,129,255,0.15),transparent_70%)]" />

                    {/* Grid Pattern overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
                </div>

                {/* 2. Content Container */}
                <div className="relative z-10 h-full p-6 md:p-8 flex flex-col justify-between border border-white/10 rounded-3xl">

                    {/* Top Row: Brand & Chip */}
                    <div className="flex justify-between items-start">
                        <div className="space-y-6">
                            <h2 className="font-sans font-medium text-2xl tracking-tight text-white/90 uppercase flex items-center gap-2">
                                Project <span className="text-primary">X</span>
                            </h2>
                            {/* SIM Chip Visual */}
                            <div className="w-14 h-10 bg-gradient-to-br from-yellow-200 to-yellow-600 rounded-md border border-yellow-700/50 relative overflow-hidden shadow-lg">
                                <div className="absolute inset-0 border-t border-b border-yellow-800/20 top-1/3" />
                                <div className="absolute inset-0 border-l border-r border-yellow-800/20 left-1/3" />
                            </div>
                        </div>

                        <div className="text-right space-y-2">
                            <div className="flex items-center justify-end gap-2 text-white/40">
                                <Wifi className="w-5 h-5 rotate-90" />
                            </div>
                            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                                <span className="text-[10px] font-mono text-primary/80 tracking-widest uppercase">
                                    {typeLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Middle Row: Numbers */}
                    <div className="space-y-2 mt-6">
                        <div className="font-mono text-xs text-primary/80 tracking-[0.2em] uppercase pl-1">
                            Total Profit
                        </div>
                        <h1 className="font-mono text-5xl md:text-6xl font-medium text-white tracking-tight drop-shadow-2xl">
                            ${amount.toLocaleString()}
                        </h1>
                    </div>

                    {/* Bottom Row: Holder Info & Auth */}
                    <div className="flex justify-between items-end mt-8">
                        <div className="flex gap-12">
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Trader Name</p>
                                <p className="font-sans text-xl font-bold text-white tracking-wide uppercase">
                                    {userName}
                                </p>
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Valid Thru</p>
                                <p className="font-mono text-base text-white/70">12/30</p>
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Auth ID</p>
                                <p className="font-mono text-xs text-white/50 pt-1">{certificateId.slice(0, 8)}</p>
                            </div>
                        </div>

                        {/* Hologram / Logo - Abstract Shape instead of Eagle */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary/10 to-cyan-500/10 border border-white/10 flex items-center justify-center relative overflow-hidden group-hover:border-primary/30 transition-colors">
                            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(46,129,255,0.4),transparent)] animate-spin-slow opacity-50" />
                            <div className="w-8 h-8 rounded-full border border-primary/30 flex items-center justify-center z-10 backdrop-blur-sm">
                                <div className="w-4 h-4 rounded-full bg-primary/50 blur-[2px]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Glossy Overlays */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            </motion.div>

            {/* Actions */}
            <div className="flex justify-center gap-4 mt-8">
                <Button
                    variant="outline"
                    className="bg-black/40 border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white"
                    onClick={() => window.open(`/api/certificates/${certificateId}/download?format=pdf`, '_blank')}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                </Button>
                <Button
                    className="bg-[#29af73] hover:bg-[#29af73]/90 text-white shadow-lg shadow-primary/20"
                    onClick={() => setIsShareModalOpen(true)}
                >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Certificate
                </Button>
            </div>

            <SocialShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                certificateUrl={certificateUrl}
                userName={userName}
                amount={amount}
                type={typeLabel}
            />
        </>
    );
}
