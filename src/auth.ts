import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
    debug: true,
    adapter: DrizzleAdapter(db),
    providers: [
        Google,
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                console.log("=== DEMO MODE: AUTH BYPASS ===");
                // RETURN STATIC USER - NO DATABASE CONNECTION REQUIRED
                return {
                    id: "demo-user-1",
                    name: "Demo Trader",
                    email: "demo@projectx.com",
                    image: null,
                };
            },
        }),
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) token.id = user.id;
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) session.user.id = token.id as string;
            return session;
        },
    },
    session: { strategy: "jwt" },
    secret: "demo-secret-key-123", // Hardcoded for demo stability
    trustHost: true,
});
