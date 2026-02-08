
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageViewTracker } from "@/components/PageViewTracker";
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
            {/* Page View Tracking */}
            <PageViewTracker userId={userId} />

            {/* Client shell handles sidebar collapse + content offset */}
            <DashboardShell
                userId={userId}
                hasActiveChallenge={hasActiveChallenge}
            >
                {children}
            </DashboardShell>
        </div>
    );
}
