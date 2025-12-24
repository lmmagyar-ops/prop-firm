
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PublicProfileHeader } from "@/components/dashboard/PublicProfileHeader";
import { ProfileMetricsGrid } from "@/components/dashboard/ProfileMetricsGrid";
import { getPublicProfileData } from "@/lib/profile-service";
import { db } from "@/db";
import { users, challenges } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ClientPublicProfileWrapper } from "@/components/dashboard/ClientPublicProfileWrapper";

export default async function PublicProfilePage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/login');
        return null;
    }

    const data = await getPublicProfileData(session.user.id);

    if (!data) {
        return (
            <div className="min-h-screen bg-black flex text-white font-sans items-center justify-center">
                <div className="text-zinc-500">Error loading public profile data.</div>
            </div>
        );
    }

    // Server actions for toggles
    async function toggleLeaderboard(enabled: boolean) {
        "use server";
        if (!session?.user?.id) return;
        await db.update(users)
            .set({ showOnLeaderboard: enabled })
            .where(eq(users.id, session.user.id));
        revalidatePath('/dashboard/public-profile');
    }

    async function toggleAccountVisibility(accountId: string, field: 'dropdown' | 'profile') {
        "use server";
        if (!session?.user?.id) return;

        // Verify ownership
        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, accountId),
        });

        if (!challenge || challenge.userId !== session.user.id) return;

        if (field === 'dropdown') {
            await db.update(challenges)
                .set({ showDropdownOnProfile: !challenge.showDropdownOnProfile })
                .where(eq(challenges.id, accountId));
        } else {
            await db.update(challenges)
                .set({ isPublicOnProfile: !challenge.isPublicOnProfile })
                .where(eq(challenges.id, accountId));
        }
        revalidatePath('/dashboard/public-profile');
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <PublicProfileHeader user={data.user} />

            {/* Public Profile Settings Section */}
            <section>
                <h2 className="text-lg font-bold text-white mb-4">Public Profile Settings</h2>
                <ProfileMetricsGrid metrics={data.metrics} isPublic />
            </section>

            {/* Accounts Section with Visibility Controls */}
            <section>
                <h2 className="text-lg font-bold text-white mb-2">Accounts</h2>
                <p className="text-sm text-zinc-500 mb-4">A list of all of your accounts. Toggle visibility for public view.</p>

                <ClientPublicProfileWrapper
                    data={data}
                    toggleLeaderboard={toggleLeaderboard}
                    toggleAccountVisibility={toggleAccountVisibility}
                />
            </section>
        </div>
    );
}
