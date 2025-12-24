import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: "Email required" }, { status: 400 });
        }

        // Find user
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (user.emailVerified) {
            return NextResponse.json({ error: "Email already verified" }, { status: 400 });
        }

        // Generate new code
        const verificationCode = Math.floor(10 + Math.random() * 90).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // Generate new decoys
        const decoys: string[] = [];
        while (decoys.length < 2) {
            const d = Math.floor(10 + Math.random() * 90).toString();
            if (d !== verificationCode && !decoys.includes(d)) decoys.push(d);
        }

        // Update user
        await db.update(users)
            .set({
                verificationCode,
                verificationCodeExpiry: expiry,
            })
            .where(eq(users.email, email));

        // Send email
        await sendVerificationEmail(email, verificationCode, decoys);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Resend Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
