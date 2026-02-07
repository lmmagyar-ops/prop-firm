
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Suspense } from "react";
import BuyEvaluationClient from "./BuyEvaluationClient";

export default async function BuyEvaluationPage() {
    // Server-side: check if user has an active challenge so Sidebar shows Trade unlocked
    const session = await auth();
    let hasActiveChallenge = false;

    if (session?.user?.id) {
        const activeChallenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, session.user.id),
                eq(challenges.status, "active")
            ),
            columns: { id: true }
        });
        hasActiveChallenge = !!activeChallenge;
    }

    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-white">Loading...</div>}>
            <BuyEvaluationClient hasActiveChallenge={hasActiveChallenge} />
        </Suspense>
    );
}
