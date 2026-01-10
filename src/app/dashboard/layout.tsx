
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    // Require authentication for dashboard
    if (!session?.user?.id) {
        redirect("/login");
    }

    const userId = session.user.id;

    // Check if user has an active challenge for Trade tab visibility
    const activeChallenge = await db.query.challenges.findFirst({
        where: and(
            eq(challenges.userId, userId),
            eq(challenges.status, "active")
        ),
        columns: { id: true }
    });

    const hasActiveChallenge = !!activeChallenge;

    return (
        <div className="min-h-screen bg-[#0E1217] flex font-sans text-white">
            {/* Sidebar now auto-detects active page from URL */}
            <Sidebar hasActiveChallenge={hasActiveChallenge} />

            <main className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen">
                <TopNav />

                <div className="flex-1 p-6 max-w-[1800px] mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
