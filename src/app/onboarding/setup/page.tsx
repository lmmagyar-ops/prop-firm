import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { OnboardingSequence } from "@/components/onboarding/OnboardingSequence";

export const dynamic = "force-dynamic";

export default async function OnboardingSetupPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    // Fetch the most recent challenge (likely just created via checkout)
    const latestChallenge = await db.query.challenges.findFirst({
        where: eq(challenges.userId, session.user.id),
        orderBy: [desc(challenges.startedAt)],
    });

    if (!latestChallenge) {
        // If no challenge found, redirect to checkout
        redirect("/checkout");
    }

    return (
        <OnboardingSequence
            challenge={{
                startingBalance: parseFloat(latestChallenge.startingBalance),
                // Safe access to JSONB fields
                profitTarget: (latestChallenge.rulesConfig as any)?.profitTarget || 500,
                maxDrawdown: (latestChallenge.rulesConfig as any)?.maxDrawdown || 1000,
            }}
        />
    );
}
