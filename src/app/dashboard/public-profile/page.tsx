
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PublicProfileHeader } from "@/components/dashboard/PublicProfileHeader";
import { ProfileMetricsGrid } from "@/components/dashboard/ProfileMetricsGrid";
import { getPublicProfileData } from "@/lib/profile-service";
import { db } from "@/db";
import { users, challenges, payouts, trades } from "@/db/schema";
import { eq, sql, count, countDistinct } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ClientPublicProfileWrapper } from "@/components/dashboard/ClientPublicProfileWrapper";
import { SocialVisibilitySection } from "@/components/dashboard/SocialVisibilitySection";
import { ProfileShareButtons } from "@/components/dashboard/ProfileShareButtons";
import { ProfileCustomizationSection } from "@/components/dashboard/ProfileCustomizationSection";
import { AchievementBadgesSection } from "@/components/dashboard/AchievementBadgesSection";
import { Button } from "@/components/ui/button";
import { Eye, Share2, Award, Settings2 } from "lucide-react";
import Link from "next/link";

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

    // Get additional data for new features
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
    });

    // Count completed payouts for achievements
    const completedPayouts = await db.query.payouts.findMany({
        where: eq(payouts.userId, session.user.id),
    });

    const totalPayouts = completedPayouts.filter(p => p.status === "completed").length;

    // Calculate achievement data
    const isFunded = data.accounts.some(acc => acc.status === "passed");

    // Get user's challenge IDs for trade queries
    const userChallenges = await db.query.challenges.findMany({
        where: eq(challenges.userId, session.user.id),
        columns: { id: true, currentBalance: true, startingBalance: true },
    });
    const challengeIds = userChallenges.map(c => c.id);

    let totalTrades = 0;
    let activeDays = 0;
    if (challengeIds.length > 0) {
        const [tradeCountResult, activeDaysResult] = await Promise.all([
            db.select({ value: count() })
                .from(trades)
                .where(sql`${trades.challengeId} IN ${challengeIds}`),
            db.select({ value: countDistinct(sql`DATE(${trades.executedAt})`) })
                .from(trades)
                .where(sql`${trades.challengeId} IN ${challengeIds}`),
        ]);
        totalTrades = tradeCountResult[0]?.value ?? 0;
        activeDays = activeDaysResult[0]?.value ?? 0;
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

    // Server action for social visibility
    async function toggleSocialVisibility(platform: 'twitter' | 'discord' | 'telegram' | 'instagram' | 'facebook', isPublic: boolean) {
        "use server";
        if (!session?.user?.id) return;

        const field = `${platform}Public` as 'twitterPublic' | 'discordPublic' | 'telegramPublic' | 'instagramPublic' | 'facebookPublic';
        await db.update(users)
            .set({ [field]: isPublic })
            .where(eq(users.id, session.user.id));
        revalidatePath('/dashboard/public-profile');
    }

    // Server action for profile customization
    async function saveProfileCustomization(formData: { tradingBio: string; tradingStyle: string; favoriteMarkets: string }) {
        "use server";
        if (!session?.user?.id) return;

        await db.update(users)
            .set({
                tradingBio: formData.tradingBio,
                tradingStyle: formData.tradingStyle,
                favoriteMarkets: formData.favoriteMarkets,
            })
            .where(eq(users.id, session.user.id));
        revalidatePath('/dashboard/public-profile');
    }

    return (
        <div className="space-y-8">
            {/* Header with Preview Button */}
            <div className="flex items-start justify-between gap-4">
                <PublicProfileHeader user={data.user} />

                <Link href={`/profile/${session.user.id}`} target="_blank">
                    <Button variant="outline" className="flex items-center gap-2 animate-pulse">
                        <Eye className="w-4 h-4" />
                        View Public Profile
                    </Button>
                </Link>
            </div>

            {/* Key Metrics Section */}
            <section>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-primary" />
                    Performance Metrics
                </h2>
                <ProfileMetricsGrid metrics={data.metrics} isPublic />
            </section>

            {/* Profile Customization */}
            <section>
                <h2 className="text-lg font-bold text-white mb-4">About Me</h2>
                <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6">
                    <ProfileCustomizationSection
                        tradingBio={user?.tradingBio}
                        tradingStyle={user?.tradingStyle}
                        favoriteMarkets={user?.favoriteMarkets}
                        onSave={saveProfileCustomization}
                    />
                </div>
            </section>

            {/* Achievement Badges */}
            <section>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    Achievements
                </h2>
                <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6">
                    <AchievementBadgesSection
                        totalTrades={totalTrades}
                        winRate={data.metrics.tradingWinRate}
                        totalPayouts={totalPayouts}
                        isFunded={isFunded}
                        activeDays={activeDays}
                        hasAchievedTenPercentGrowth={
                            userChallenges.length > 0 && userChallenges.some(c => {
                                const current = parseFloat(c.currentBalance);
                                const starting = parseFloat(c.startingBalance);
                                return starting > 0 && current / starting >= 1.10;
                            })
                        }
                    />
                </div>
            </section>

            {/* Social Visibility */}
            <section>
                <h2 className="text-lg font-bold text-white mb-4">Social Links</h2>
                <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6">
                    <SocialVisibilitySection
                        socials={data.socials}
                        visibility={{
                            twitterPublic: user?.twitterPublic ?? true,
                            discordPublic: user?.discordPublic ?? true,
                            telegramPublic: user?.telegramPublic ?? true,
                            instagramPublic: user?.instagramPublic ?? true,
                            facebookPublic: user?.facebookPublic ?? true,
                        }}
                        onToggleVisibility={toggleSocialVisibility}
                    />
                </div>
            </section>

            {/* Profile Share */}
            <section>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary" />
                    Share Your Profile
                </h2>
                <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6">
                    <ProfileShareButtons userId={session.user.id} />
                </div>
            </section>

            {/* Accounts Section with Visibility Controls */}
            <section>
                <h2 className="text-lg font-bold text-white mb-2">Accounts</h2>
                <p className="text-sm text-zinc-500 mb-4">Control which accounts appear on your public profile</p>

                <ClientPublicProfileWrapper
                    data={data}
                    toggleLeaderboard={toggleLeaderboard}
                    toggleAccountVisibility={toggleAccountVisibility}
                />
            </section>
        </div>
    );
}
