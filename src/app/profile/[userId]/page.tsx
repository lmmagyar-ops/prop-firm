import { notFound } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Shield, TrendingUp, DollarSign, Award, Calendar, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";

interface ProfilePageProps {
    params: {
        userId: string;
    };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
    const { userId } = params;
    const session = await auth();

    // Fetch user data
    const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!user || user.length === 0) {
        notFound();
    }

    const userData = user[0];

    // Check if current viewer is admin
    let isAdmin = false;
    if (session?.user?.email) {
        const adminUser = await db
            .select()
            .from(users)
            .where(eq(users.email, session.user.email))
            .limit(1);
        isAdmin = adminUser[0]?.role === "admin";
    }

    // Privacy check: Only public profiles are accessible (unless admin)
    if (userData.leaderboardPrivacy !== "public" && !isAdmin) {
        return (
            <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[#1A232E] border border-[#2E3A52] rounded-2xl p-8 text-center">
                    <Shield className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Profile is Private</h1>
                    <p className="text-zinc-400 mb-6">
                        This trader has chosen to keep their profile private. Only public profiles can be viewed by other users.
                    </p>
                    <a
                        href="/dashboard/leaderboard"
                        className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Back to Leaderboard
                    </a>
                </div>
            </div>
        );
    }

    // Display public profile (or admin viewing)
    return (
        <div className="min-h-screen bg-[#0D1117] text-white p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Admin Viewing Badge */}
                {isAdmin && userData.leaderboardPrivacy !== "public" && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-yellow-400" />
                        <div>
                            <p className="text-sm font-semibold text-yellow-400">Admin View</p>
                            <p className="text-xs text-zinc-400">
                                You're viewing a {userData.leaderboardPrivacy} profile with admin privileges
                            </p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-2xl p-8">
                    <div className="flex items-start gap-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full bg-[#0E1217] border-2 border-blue-500 flex items-center justify-center flex-shrink-0">
                            {userData.image ? (
                                <img src={userData.image} alt={userData.displayName || "User"} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-zinc-400">
                                    {(userData.displayName || userData.name || "?")[0].toUpperCase()}
                                </span>
                            )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">{userData.displayName || userData.name || "Trader"}</h1>
                                {userData.showCountry && userData.country && (
                                    <span className="text-2xl">{getCountryFlag(userData.country)}</span>
                                )}
                            </div>
                            {userData.tradingBio && (
                                <p className="text-zinc-400 mb-3">{userData.tradingBio}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-zinc-500">
                                {userData.tradingStyle && (
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        {userData.tradingStyle}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Joined {new Date(userData.createdAt || Date.now()).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                {userData.showStatsPublicly && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            icon={<DollarSign className="w-5 h-5 text-green-400" />}
                            label="Total Profit"
                            value="$0.00"
                            description="Lifetime earnings"
                        />
                        <StatCard
                            icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
                            label="Win Rate"
                            value="0%"
                            description="Success percentage"
                        />
                        <StatCard
                            icon={<Award className="w-5 h-5 text-purple-400" />}
                            label="Leaderboard Rank"
                            value="#--"
                            description="Current position"
                        />
                    </div>
                )}

                {/* Bio Section */}
                {userData.favoriteMarkets && (
                    <div className="bg-[#1A232E] border border-[#2E3A52] rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-3">Favorite Markets</h2>
                        <p className="text-zinc-400">{userData.favoriteMarkets}</p>
                    </div>
                )}

                {/* Social Links */}
                {(userData.twitter || userData.discord || userData.telegram) && (
                    <div className="bg-[#1A232E] border border-[#2E3A52] rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-4">Connect</h2>
                        <div className="flex flex-wrap gap-3">
                            {userData.twitter && userData.twitterPublic && (
                                <SocialLink platform="Twitter" handle={userData.twitter} />
                            )}
                            {userData.discord && userData.discordPublic && (
                                <SocialLink platform="Discord" handle={userData.discord} />
                            )}
                            {userData.telegram && userData.telegramPublic && (
                                <SocialLink platform="Telegram" handle={userData.telegram} />
                            )}
                        </div>
                    </div>
                )}

                {/* Placeholder message if stats are hidden */}
                {!userData.showStatsPublicly && (
                    <div className="bg-[#1A232E] border border-[#2E3A52] rounded-2xl p-8 text-center">
                        <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-400">This trader has chosen to keep their performance stats private.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, description }: { icon: React.ReactNode; label: string; value: string; description: string }) {
    return (
        <div className="bg-[#1A232E] border border-[#2E3A52] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-[#0E1217] rounded-lg">
                    {icon}
                </div>
                <h3 className="text-sm font-medium text-zinc-400">{label}</h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{value}</p>
            <p className="text-xs text-zinc-500">{description}</p>
        </div>
    );
}

function SocialLink({ platform, handle }: { platform: string; handle: string }) {
    return (
        <a
            href={`#`}
            className="px-4 py-2 bg-[#0E1217] border border-[#2E3A52] rounded-lg hover:border-blue-500/30 transition-colors text-sm"
        >
            <span className="text-zinc-500">{platform}:</span> <span className="text-white">{handle}</span>
        </a>
    );
}

function getCountryFlag(country: string): string {
    const flags: Record<string, string> = {
        US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪",
        FR: "🇫🇷", JP: "🇯🇵", BR: "🇧🇷", IT: "🇮🇹", ES: "🇪🇸",
        NL: "🇳🇱", SE: "🇸🇪", NO: "🇳🇴", FI: "🇫🇮", UK: "🇬🇧",
    };
    return flags[country] || "🌍";
}
