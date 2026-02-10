import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendVerificationEmail } from "@/lib/email";
import { getErrorMessage } from "@/lib/errors";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, displayName, country } = body;

        if (!email || !displayName || !country) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // ADD: Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        // ADD: Length validations
        if (displayName.length < 2 || displayName.length > 50) {
            return NextResponse.json({ error: "Display name must be 2-50 characters" }, { status: 400 });
        }

        // 1. Check if user exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email already exists" }, { status: 409 });
        }

        // 2. Generate Codes
        const verificationCode = Math.floor(10 + Math.random() * 90).toString(); // 2 digit code (10-99)
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // Generate decoys for the email
        const decoys: string[] = [];
        while (decoys.length < 2) {
            const d = Math.floor(10 + Math.random() * 90).toString();
            if (d !== verificationCode && !decoys.includes(d)) decoys.push(d);
        }

        // 3. Create User
        await db.insert(users).values({
            email,
            name: displayName, // Map displayName to name
            displayName,       // Also store in new column
            country,
            verificationCode,
            verificationCodeExpiry: expiry,
            emailVerified: null, // Not verified yet
        });

        // 4. Send Email
        await sendVerificationEmail(email, verificationCode, decoys);

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error("Registration Error:", error);
        return NextResponse.json({ error: getErrorMessage(error) || "Internal Server Error" }, { status: 500 });
    }
}
