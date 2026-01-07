import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TOTP } from "otpauth";
import QRCode from "qrcode";
import { db } from "@/db";
import { user2FA } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if 2FA is already enabled
        const existing = await db.query.user2FA.findFirst({
            where: eq(user2FA.userId, session.user.id),
        });

        if (existing?.enabled) {
            return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
        }

        // Generate a new TOTP secret
        const totp = new TOTP({
            issuer: "Propshot Trading",
            label: session.user.email || session.user.name || "User",
            algorithm: "SHA1",
            digits: 6,
            period: 30,
        });

        const secret = totp.secret.base32;

        // Generate QR code
        const otpauthUrl = totp.toString();
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        // Store the secret temporarily (not enabled yet)
        if (existing) {
            // Update existing record
            await db.update(user2FA)
                .set({
                    secret,
                    enabled: false,
                    backupCodes: null,
                })
                .where(eq(user2FA.userId, session.user.id));
        } else {
            // Create new record
            await db.insert(user2FA).values({
                userId: session.user.id,
                secret,
                enabled: false,
            });
        }

        return NextResponse.json({
            qrCode: qrCodeDataUrl,
            secret,
        });
    } catch (error) {
        console.error("2FA setup error:", error);
        return NextResponse.json({ error: "Failed to setup 2FA" }, { status: 500 });
    }
}
