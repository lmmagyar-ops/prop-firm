import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { createLogger } from "@/lib/logger";

const logger = createLogger("Auth");

export const { handlers, auth, signIn, signOut } = NextAuth({
    debug: process.env.NODE_ENV === "development",
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }),
    providers: [
        Google,
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    logger.info("Missing credentials");
                    return null;
                }

                const email = (credentials.email as string).toLowerCase().trim();
                const password = credentials.password as string;

                try {
                    // Find user by email
                    const user = await db
                        .select()
                        .from(users)
                        .where(eq(users.email, email))
                        .limit(1);

                    if (user.length === 0) {
                        logger.info("User not found", { email });
                        return null;
                    }

                    const foundUser = user[0];

                    // Check if account is active
                    if (foundUser.isActive === false) {
                        logger.warn("Account suspended", { email });
                        return null;
                    }

                    // Check if user has a password (might be OAuth-only)
                    if (!foundUser.passwordHash) {
                        logger.info("No password set (OAuth user?)", { email });
                        return null;
                    }

                    // TEMPORARILY DISABLED: Email verification check
                    // BACKLOG: Re-enable after Google OAuth is fixed
                    // if (!foundUser.emailVerified) {
                    //     console.log("[Auth] Email not verified:", email);
                    //     return null;
                    // }

                    // Verify password
                    const isValidPassword = await bcrypt.compare(password, foundUser.passwordHash);
                    if (!isValidPassword) {
                        logger.warn("Invalid password attempt", { email });
                        return null;
                    }

                    logger.info("Successful login", { email });
                    return {
                        id: foundUser.id,
                        name: foundUser.name || `${foundUser.firstName} ${foundUser.lastName}`,
                        email: foundUser.email,
                        image: foundUser.image,
                        role: foundUser.role || 'user', // Include role for admin access
                    };
                } catch (error) {
                    logger.error("Database error during auth", error);
                    return null;
                }
            },
        }),
    ],
    pages: {
        signIn: '/login',
    },
    events: {
        // Log successful sign-ins
        async signIn({ user, account }) {
            try {
                await db.insert(activityLogs).values({
                    userId: user.id || 'unknown',
                    action: 'login',
                    metadata: {
                        provider: account?.provider || 'credentials',
                        email: user.email,
                    },
                });
                logger.info("Sign-in event", {
                    userId: user.id,
                    provider: account?.provider,
                });
            } catch (e) {
                logger.error("Failed to log sign-in event", e);
            }
        },
        // Log sign-outs
        async signOut(message) {
            try {
                // With JWT strategy, message contains { token }
                const token = 'token' in message ? message.token : null;
                const userId = token?.id as string | undefined;
                if (userId) {
                    await db.insert(activityLogs).values({
                        userId,
                        action: 'logout',
                        metadata: {},
                    });
                    logger.info("Sign-out event", { userId });
                }
            } catch (e) {
                logger.error("Failed to log sign-out event", e);
            }
        },
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role || 'user';
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id ?? '';
                session.user.role = token.role ?? 'user';
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 24, // 24 hours (financial platform — tighter than 30d default)
        updateAge: 60 * 60 * 8, // Refresh token every 8 hours
    },
    secret: (() => {
        if (!process.env.AUTH_SECRET) {
            throw new Error("AUTH_SECRET environment variable is required");
        }
        return process.env.AUTH_SECRET;
    })(),
    trustHost: true,
});

