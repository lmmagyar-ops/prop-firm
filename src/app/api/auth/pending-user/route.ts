import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
        return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: {
            verificationCode: true,
            emailVerified: true,
            verificationCodeExpiry: true, // ADD
        }
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
        verificationCode: user.verificationCode,
        isVerified: !!user.emailVerified,
        expiresAt: user.verificationCodeExpiry, // ADD
    });
}
