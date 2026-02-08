
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { CertificatePreview } from "@/components/dashboard/CertificatePreview";
import { BadgesGrid } from "@/components/dashboard/BadgesGrid";
import { CertificateGallery } from "@/components/dashboard/CertificateGallery";
import { getCertificatesData } from "@/lib/certificates-service";
import { Award, Lock } from "lucide-react";

export default async function CertificatesPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/login');
        return null;
    }

    const data = await getCertificatesData(session.user.id);

    return (
        <div className="space-y-12">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Your Certificates</h1>
                <p className="text-zinc-500 mt-2">
                    Verify and share your trading achievements.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                {/* Left: Featured Certificate */}
                <div className="xl:col-span-2">
                    {data.featured ? (
                        <CertificatePreview {...data.featured} />
                    ) : (
                        <div className="w-full aspect-[1.586/1] bg-[#0B0E14] border border-white/5 rounded-3xl flex flex-col items-center justify-center p-8 text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-50" />

                            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                <Lock className="w-6 h-6 text-zinc-600" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No Active Certificate</h3>
                            <p className="text-zinc-500 max-w-sm">
                                Complete a challenge or request your first payout to unlock your official Predictions Firm certificate.
                            </p>
                        </div>
                    )}
                </div>

                {/* Right: Badges + Stats */}
                <div className="space-y-6">
                    <BadgesGrid badges={data.badges} />

                    <div className="bg-[#0B0E14] border border-white/10 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Award className="w-4 h-4 text-emerald-500" />
                            Trader Stats
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-white/5">
                                <span className="text-zinc-500 text-sm">Last Updated</span>
                                <span className="text-white font-mono text-sm">{data.lastUpdated}</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-zinc-500 text-sm">Total Volume</span>
                                <span className="text-white font-mono font-bold text-lg">${data.totalVolume}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Funded Trader Certificates */}
            <div className="pt-8 border-t border-white/5">
                <CertificateGallery
                    title="Funded Trader Certificates"
                    certificates={data.fundedTraderCerts}
                />
            </div>

            {/* Payout Certificates */}
            <div>
                <CertificateGallery
                    title="Payout Certificates"
                    certificates={data.payoutCerts}
                />
            </div>
        </div>
    );
}
