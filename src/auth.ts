import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

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
                    console.log("[Auth] Missing credentials");
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
                        console.log("[Auth] User not found:", email);
                        return null;
                    }

                    const foundUser = user[0];

                    // Check if account is active
                    if (foundUser.isActive === false) {
                        console.log("[Auth] Account suspended:", email);
                        return null;
                    }

                    // Check if user has a password (might be OAuth-only)
                    if (!foundUser.passwordHash) {
                        console.log("[Auth] No password set (OAuth user?):", email);
                        return null;
                    }

                    // TEMPORARILY DISABLED: Email verification check
                    // TODO: Re-enable after Google OAuth is fixed
                    // if (!foundUser.emailVerified) {
                    //     console.log("[Auth] Email not verified:", email);
                    //     return null;
                    // }

                    // Verify password
                    const isValidPassword = await bcrypt.compare(password, foundUser.passwordHash);
                    if (!isValidPassword) {
                        console.log("[Auth] Invalid password for:", email);
                        return null;
                    }

                    console.log("[Auth] Successful login:", email);
                    return {
                        id: foundUser.id,
                        name: foundUser.name || `${foundUser.firstName} ${foundUser.lastName}`,
                        email: foundUser.email,
                        image: foundUser.image,
                        role: foundUser.role || 'user', // Include role for admin access
                    };
                } catch (error) {
                    console.error("[Auth] Database error:", error);
                    return null;
                }
            },
        }),
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role || 'user';
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                (session.user as any).role = token.role as string;
            }
            return session;
        },
    },
    session: { strategy: "jwt" },
    secret: process.env.AUTH_SECRET || "development-secret-key-change-in-production",
    trustHost: true,
});
