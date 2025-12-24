
"use client";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { CertificatePreview } from "./CertificatePreview";

interface CertificateGalleryProps {
    certificates: Array<{
        id: string;
        type: string;
        amount: number;
        date: Date;
        thumbnailUrl: string; // Not used in this version but kept for interface compatibility
        userName: string;
    }>;
    title: string;
}

export function CertificateGallery({ certificates, title }: CertificateGalleryProps) {
    const [selectedCert, setSelectedCert] = useState<typeof certificates[0] | null>(null);

    if (certificates.length === 0) {
        return (
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-8 text-center">
                <h3 className="text-lg font-bold text-zinc-500 mb-2">{title}</h3>
                <p className="text-zinc-600 text-sm">No certificates earned yet.</p>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map((cert) => (
                    <div
                        key={cert.id}
                        onClick={() => setSelectedCert(cert)}
                        className="group cursor-pointer aspect-[16/10] bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden relative hover:border-blue-500/30 hover:shadow-lg transition-all"
                    >
                        {/* Thumbnail Representation */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 group-hover:from-blue-900/40 group-hover:to-cyan-900/40 transition-colors" />

                        <div className="absolute inset-0 p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                                    🏆
                                </div>
                                <span className="text-xs font-mono text-blue-300 bg-blue-900/30 px-2 py-1 rounded border border-blue-500/20">
                                    {cert.date.toLocaleDateString()}
                                </span>
                            </div>

                            <div>
                                <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">
                                    {cert.type === 'funded-trader' ? 'Funded' : 'Payout'}
                                </p>
                                <p className="text-2xl font-mono font-bold text-white">
                                    ${cert.amount.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
                <DialogContent className="max-w-4xl bg-transparent border-none p-0 overflow-hidden shadow-none">
                    {selectedCert && (
                        <CertificatePreview
                            type={selectedCert.type}
                            userName={selectedCert.userName}
                            amount={selectedCert.amount}
                            date={selectedCert.date}
                            certificateId={selectedCert.id}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
