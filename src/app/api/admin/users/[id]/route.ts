import { db } from "@/db";
import {
    users, challenges, trades, positions, accounts, sessions,
    payouts, certificates, userBadges, affiliates, discountRedemptions, paymentLogs,
    payoutMethods, user2FA, activityLogs, leaderboardEntries, auditLogs
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("AdminUser");

/**
 * DELETE /api/admin/users/[id]
 * Delete a user and ALL associated data.
 * All operations run inside a single DB transaction.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAuthorized, response, user: admin } = await requireAdmin();
    if (!isAuthorized) return response;

    const { id: userId } = await params;

    if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    try {
        // Verify user exists
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get user's challenges for cascading deletes
        const userChallenges = await db
            .select({ id: challenges.id })
            .from(challenges)
            .where(eq(challenges.userId, userId));

        const challengeIds = userChallenges.map(c => c.id);

        const result = await db.transaction(async (tx) => {
            // ── Challenge-scoped deletes ──
            if (challengeIds.length > 0) {
                // 1. Delete trades (FK → challenges)
                for (const cId of challengeIds) {
                    await tx.delete(trades).where(eq(trades.challengeId, cId));
                }

                // 2. Delete positions (FK → challenges)
                for (const cId of challengeIds) {
                    await tx.delete(positions).where(eq(positions.challengeId, cId));
                }
            }

            // 3. Delete challenges (FK → users)
            await tx.delete(challenges).where(eq(challenges.userId, userId));

            // ── User-scoped deletes (tables with userId FK, no cascade) ──
            // Auth tables
            await tx.delete(sessions).where(eq(sessions.userId, userId));
            await tx.delete(accounts).where(eq(accounts.userId, userId));

            // Financial tables
            await tx.delete(payouts).where(eq(payouts.userId, userId));
            await tx.delete(certificates).where(eq(certificates.userId, userId));
            await tx.delete(payoutMethods).where(eq(payoutMethods.userId, userId));
            await tx.delete(discountRedemptions).where(eq(discountRedemptions.userId, userId));

            // Profile/gamification tables
            await tx.delete(userBadges).where(eq(userBadges.userId, userId));
            await tx.delete(leaderboardEntries).where(eq(leaderboardEntries.userId, userId));
            await tx.delete(activityLogs).where(eq(activityLogs.userId, userId));

            // Security tables
            await tx.delete(user2FA).where(eq(user2FA.userId, userId));

            // Affiliates (has userId FK without cascade)
            await tx.delete(affiliates).where(eq(affiliates.userId, userId));

            // paymentLogs has ON DELETE CASCADE for userId — DB handles it

            // Audit log (before we delete the user)
            await tx.insert(auditLogs).values({
                action: "DELETE_USER",
                adminId: admin!.id,
                targetId: userId,
                details: {
                    userId,
                    email: user.email,
                    name: user.name,
                    challengesDeleted: challengeIds.length,
                },
            });

            // Finally, delete the user
            await tx.delete(users).where(eq(users.id, userId));

            return { challengesDeleted: challengeIds.length };
        });

        logger.info(`[Admin] Deleted user ${user.email}: ${result.challengesDeleted} challenges removed`);

        return NextResponse.json({
            success: true,
            message: `User ${user.email} and all associated data deleted`,
            deletedChallenges: result.challengesDeleted,
        });

    } catch (error) {
        logger.error("Delete User Error:", error);
        return NextResponse.json(
            { error: "Failed to delete user" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user details including ban/suspend and role
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    const { id: userId } = await params;
    const body = await request.json();

    if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    try {
        // Verify user exists
        const [existingUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Allowed fields with validation
        const updates: Record<string, unknown> = {};

        // Name and email
        if (body.name !== undefined) {
            updates.name = body.name;
        }
        if (body.email !== undefined) {
            updates.email = body.email.toLowerCase().trim();
        }

        // Ban/Suspend toggle
        if (body.isActive !== undefined) {
            if (typeof body.isActive !== 'boolean') {
                return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
            }
            updates.isActive = body.isActive;
        }

        // Role change
        if (body.role !== undefined) {
            const validRoles = ['user', 'admin'];
            if (!validRoles.includes(body.role)) {
                return NextResponse.json({ error: "Invalid role. Must be 'user' or 'admin'" }, { status: 400 });
            }
            updates.role = body.role;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        await db.update(users).set(updates).where(eq(users.id, userId));

        const [updatedUser] = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                isActive: users.isActive,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        logger.info(`[Admin] User ${userId} updated:`, updates);

        return NextResponse.json({
            success: true,
            user: updatedUser
        });

    } catch (error) {
        logger.error("Update User Error:", error);
        return NextResponse.json(
            { error: "Failed to update user" },
            { status: 500 }
        );
    }
}
