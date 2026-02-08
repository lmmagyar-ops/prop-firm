import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TOTP } from "otpauth";
import { db } from "@/db";
import { user2FA, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";
import * as bcrypt from "bcrypt";

function generateBackupCodes(count: number = 8): string[] {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString("hex").toUpperCase();
        codes.push(code.match(/.{1,4}/g)?.join("-") || code);
    }
    return codes;
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { code } = body;

        if (!code || code.length !== 6) {
            return NextResponse.json({ error: "Invalid code" }, { status: 400 });
        }

        // Get the stored secret
        const record = await db.query.user2FA.findFirst({
            where: eq(user2FA.userId, session.user.id),
        });

        if (!record || !record.secret) {
            return NextResponse.json({ error: "2FA setup not initiated" }, { status: 400 });
        }

        // Verify the code
        const totp = new TOTP({
            issuer: "Predictions Firm",
            label: session.user.email || session.user.name || "User",
            algorithm: "SHA1",
            digits: 6,
            period: 30,
            secret: record.secret,
        });

        const delta = totp.validate({ token: code, window: 1 });

        if (delta === null) {
            return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
        }

        // Generate backup codes
        const backupCodes = generateBackupCodes(8);
        const hashedBackupCodes = await Promise.all(
            backupCodes.map((code) => bcrypt.hash(code, 10))
        );

        // Enable 2FA
        await db.update(user2FA)
            .set({
                enabled: true,
                backupCodes: hashedBackupCodes,
                lastUsedAt: new Date(),
            })
            .where(eq(user2FA.userId, session.user.id));

        // Update user's 2FA status
        await db.update(users)
            .set({ twoFactorEnabled: true })
            .where(eq(users.id, session.user.id));

        return NextResponse.json({
            success: true,
            backupCodes, // Return plain text codes (user must save them)
        });
    } catch (error) {
        console.error("2FA verification error:", error);
        return NextResponse.json({ error: "Failed to verify code" }, { status: 500 });
    }
}
