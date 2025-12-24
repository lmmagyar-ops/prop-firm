
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PrivateProfileHeader } from "@/components/dashboard/PrivateProfileHeader";
import { ProfileMetricsGrid } from "@/components/dashboard/ProfileMetricsGrid";
import { SocialsSection } from "@/components/dashboard/SocialsSection";
import { AccountsTable } from "@/components/dashboard/AccountsTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getPrivateProfileData } from "@/lib/profile-service";

export default async function PrivateProfilePage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/login');
        return null;
    }

    const data = await getPrivateProfileData(session.user.id);

    if (!data) {
        return (
            <div className="min-h-screen bg-black flex text-white font-sans items-center justify-center">
                <div className="text-zinc-500">Error loading profile data. Please try again later.</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Profile Header */}
            <PrivateProfileHeader user={data.user} />

            {/* Key Metrics Section */}
            <section>
                <h2 className="text-lg font-bold text-white mb-2">Key Metrics</h2>
                <p className="text-sm text-zinc-500 mb-4">Lifetime metrics across all accounts</p>
                <ProfileMetricsGrid metrics={data.metrics} />
            </section>

            {/* Socials Section */}
            <SocialsSection socials={data.socials} />

            {/* Accounts Section */}
            <section>
                <h2 className="text-lg font-bold text-white mb-2">Accounts</h2>
                <p className="text-sm text-zinc-500 mb-4">A list of all of your accounts</p>
                <AccountsTable accounts={data.accounts} />
            </section>

            {/* CTA Section */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-500 p-8 flex items-center justify-between mt-8">
                <h3 className="text-2xl font-bold text-white">Ready for a new Evaluation?</h3>
                <Link href="/buy-evaluation">
                    <Button size="lg" className="bg-black hover:bg-zinc-900 text-white font-bold h-12 px-8">
                        New Evaluation
                    </Button>
                </Link>

                {/* Decorative background accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full pointer-events-none" />
            </div>
        </div>
    );
}
