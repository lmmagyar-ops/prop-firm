import { db } from "@/db";
import { users, challenges, trades, positions } from "@/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

// Basic email validation
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Password strength validation
function isStrongPassword(password: string): { valid: boolean; message: string } {
    if (password.length < 8) {
        return { valid: false, message: "Password must be at least 8 characters" };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: "Password must contain at least one number" };
    }
    return { valid: true, message: "" };
}

/**
 * GET /api/admin/users
 * Comprehensive list of all users with their trading statistics
 */
export async function GET() {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        // Get all users with their most recent challenge
        const usersWithChallenges = await db
            .select({
                // User info
                userId: users.id,
                userName: users.name,
                email: users.email,
                image: users.image,
                createdAt: users.createdAt,
                isActive: users.isActive,
                role: users.role,

                // Challenge info
                challengeId: challenges.id,
                status: challenges.status,
                phase: challenges.phase,
                currentBalance: challenges.currentBalance,
                platform: challenges.platform,
                startedAt: challenges.startedAt,
                rulesConfig: challenges.rulesConfig,
            })
            .from(users)
            .leftJoin(challenges, eq(users.id, challenges.userId))
            .orderBy(desc(challenges.startedAt));

        // Group by user and calculate stats
        const userMap = new Map<string, any>();

        for (const row of usersWithChallenges) {
            if (!userMap.has(row.userId)) {
                userMap.set(row.userId, {
                    id: row.userId,
                    name: row.userName || 'Unknown',
                    email: row.email,
                    image: row.image,
                    createdAt: row.createdAt,
                    isActive: row.isActive ?? true,
                    role: row.role || 'user',
                    challenges: [],
                    totalChallenges: 0,
                    activeChallenges: 0,
                    passedChallenges: 0,
                    failedChallenges: 0,
                    totalPnL: 0,
                });
            }

            const user = userMap.get(row.userId);

            if (row.challengeId) {
                const startingBalance = (row.rulesConfig as any)?.startingBalance || 10000;
                const pnl = Number(row.currentBalance || 0) - startingBalance;

                user.challenges.push({
                    id: row.challengeId,
                    status: row.status,
                    phase: row.phase,
                    balance: row.currentBalance,
                    platform: row.platform,
                    startedAt: row.startedAt,
                    pnl: pnl,
                });

                user.totalChallenges++;
                user.totalPnL += pnl;

                if (row.status === 'active') user.activeChallenges++;
                if (row.status === 'passed') user.passedChallenges++;
                if (row.status === 'failed') user.failedChallenges++;
            }
        }

        // Get trade counts for each challenge
        const tradeCounts = await db
            .select({
                challengeId: trades.challengeId,
                count: count(),
            })
            .from(trades)
            .groupBy(trades.challengeId);

        const tradeCountMap = new Map(tradeCounts.map(t => [t.challengeId, t.count]));

        // Add trade counts to users
        for (const user of userMap.values()) {
            let totalTrades = 0;
            for (const challenge of user.challenges) {
                challenge.tradeCount = tradeCountMap.get(challenge.id) || 0;
                totalTrades += challenge.tradeCount;
            }
            user.totalTrades = totalTrades;
        }

        const usersList = Array.from(userMap.values());

        // Sort by most recent activity
        usersList.sort((a, b) => {
            const aLatest = a.challenges[0]?.startedAt || new Date(0);
            const bLatest = b.challenges[0]?.startedAt || new Date(0);
            return new Date(bLatest).getTime() - new Date(aLatest).getTime();
        });

        return NextResponse.json({
            users: usersList,
            summary: {
                totalUsers: usersList.length,
                activeUsers: usersList.filter(u => u.activeChallenges > 0).length,
                totalChallenges: usersList.reduce((sum, u) => sum + u.totalChallenges, 0),
            }
        });

    } catch (error) {
        console.error("Users List Error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

/**
 * POST /api/admin/users
 * Create a new user account (admin only)
 */
export async function POST(request: Request) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const body = await request.json();
        const { email, firstName, lastName, password, role } = body;

        // Validate required fields
        if (!email || !firstName || !lastName || !password) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Validate password strength
        const passwordCheck = isStrongPassword(password);
        if (!passwordCheck.valid) {
            return NextResponse.json(
                { error: passwordCheck.message },
                { status: 400 }
            );
        }

        // Validate role
        const validRoles = ["user", "admin"];
        const userRole = validRoles.includes(role) ? role : "user";

        // Check if email already exists
        const existingUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email.toLowerCase().trim()))
            .limit(1);

        if (existingUser.length > 0) {
            return NextResponse.json(
                { error: "An account with this email already exists" },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user (admin-created users are automatically verified)
        const newUser = await db
            .insert(users)
            .values({
                email: email.toLowerCase().trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                name: `${firstName.trim()} ${lastName.trim()}`,
                passwordHash,
                role: userRole,
                isActive: true,
                emailVerified: new Date(), // Admin-created = trusted
                agreedToTermsAt: new Date(),
            })
            .returning({ id: users.id, email: users.email, name: users.name });

        return NextResponse.json({
            success: true,
            message: "User created successfully",
            user: {
                id: newUser[0].id,
                email: newUser[0].email,
                name: newUser[0].name,
                role: userRole,
            }
        }, { status: 201 });

    } catch (error) {
        console.error("Create User Error:", error);
        return NextResponse.json(
            { error: "Failed to create user. Please try again." },
            { status: 500 }
        );
    }
}
