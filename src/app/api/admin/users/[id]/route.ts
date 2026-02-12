import { db } from "@/db";
import { users, challenges, trades, positions, accounts, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("[id]");

/**
 * DELETE /api/admin/users/[id]
 * Delete a user and all their associated data
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    const { id: userId } = await params;

    if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    try {
        // Verify user exists
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (user.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get user's challenges for cascading deletes
        const userChallenges = await db
            .select({ id: challenges.id })
            .from(challenges)
            .where(eq(challenges.userId, userId));

        const challengeIds = userChallenges.map(c => c.id);

        // Delete in order to respect foreign key constraints:
        // 1. Delete trades (references positions and challenges)
        for (const challengeId of challengeIds) {
            await db.delete(trades).where(eq(trades.challengeId, challengeId));
        }

        // 2. Delete positions (references challenges)
        for (const challengeId of challengeIds) {
            await db.delete(positions).where(eq(positions.challengeId, challengeId));
        }

        // 3. Delete challenges (references users)
        await db.delete(challenges).where(eq(challenges.userId, userId));

        // 4. Delete sessions (references users)
        await db.delete(sessions).where(eq(sessions.userId, userId));

        // 5. Delete accounts (OAuth accounts, references users)
        await db.delete(accounts).where(eq(accounts.userId, userId));

        // 6. Finally, delete the user
        await db.delete(users).where(eq(users.id, userId));

        return NextResponse.json({
            success: true,
            message: `User ${user[0].email} and all associated data deleted`,
            deletedChallenges: challengeIds.length
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
